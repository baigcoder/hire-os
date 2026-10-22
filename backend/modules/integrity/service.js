/**
 * Live-interview integrity: session lifecycle, ingest and live state.
 *
 * Candidate proctor ──signed batches──▶ ingestCandidateBatch ─┐
 * Recruiter verifier ──observations──▶ ingestRecruiterBatch ──┼─▶ risk engine ─▶ live bus (SSE)
 *                                                             └─▶ cross-check ─▶ tamper flags
 * endSession ─▶ queue "integrity.report" ─▶ report.js (gpt-oss-120b)
 */
import crypto from "crypto";
import { IntegritySession } from "../../models/integritySession.model.js";
import { IntegrityEvent } from "../../models/integrityEvent.model.js";
import {
  IntegrityEvidence,
  EVIDENCE_RETENTION_DAYS,
} from "../../models/integrityEvidence.model.js";
import { Interview } from "../../models/interview.model.js";
import { Job } from "../../models/job.model.js";
import { User } from "../../models/user.model.js";
import { canManageJob } from "../../utils/jobAccess.js";
import {
  uploadPrivateFile,
  createSignedFileUrl,
} from "../../utils/supabase.js";
import queue from "../../platform/queue/index.js";
import logger from "../../utils/logger.js";
import {
  BEHAVIOR_SIGNALS,
  TAMPER_SIGNALS,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_GAP_MS,
  MONITORING_POLICY,
  VIRTUAL_CAMERA_PATTERN,
} from "./signals.js";
import {
  normalizeEvents,
  debounce,
  scoreAt,
  bandFor,
  crossCheck,
  MISMATCHES_FOR_TAMPER,
} from "./riskEngine.js";
import { issueIngestKey, verifyBatch } from "./heartbeat.js";
import { publish } from "./live.js";

export const INTEGRITY_REPORT_JOB = "integrity.report";
export const INTEGRITY_EVIDENCE_PURGE_JOB = "integrity.evidence-purge";
export const EVIDENCE_BUCKET = process.env.INTEGRITY_EVIDENCE_BUCKET || "integrity-evidence";

const MAX_EVENTS_PER_BATCH = 50;
const MAX_SCORED = 300;
const FROZEN_STREAK_FOR_TAMPER = 3; // 3 batches ≈ 15 s of identical frames
const MAX_EVIDENCE_PER_SESSION = 60;
const MAX_EVIDENCE_BYTES = 120 * 1024;

export class IntegrityError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ─── Access ────────────────────────────────────────────────────────────

/**
 * Who the caller is to this interview: its candidate, a recruiter who can
 * manage it (the interviewer, or the job's company), or nobody.
 */
export const resolveAccess = async (interviewId, userId) => {
  const interview = await Interview.findById(interviewId)
    .select("studentId recruiterId jobId companyId videoInterview.status videoInterview.startedAt")
    .lean();
  if (!interview) return { interview: null, role: null };
  if (String(interview.studentId) === String(userId)) {
    return { interview, role: "candidate" };
  }
  if (String(interview.recruiterId) === String(userId)) {
    return { interview, role: "recruiter" };
  }
  const [user, job] = await Promise.all([
    User.findById(userId).select("role companyId").lean(),
    Job.findById(interview.jobId).select("created_by company").lean(),
  ]);
  return { interview, role: canManageJob(user, job) ? "recruiter" : null };
};

const sessionFor = (interview) =>
  IntegritySession.findOneAndUpdate(
    { interviewId: interview._id },
    {
      $setOnInsert: {
        interviewId: interview._id,
        candidateId: interview.studentId,
        recruiterId: interview.recruiterId,
        companyId: interview.companyId,
        jobId: interview.jobId,
      },
    },
    { upsert: true, new: true },
  );

export const getSession = (interviewId, { withKey = false } = {}) => {
  const query = IntegritySession.findOne({ interviewId });
  return withKey ? query.select("+ingestKey") : query;
};

// ─── Consent ───────────────────────────────────────────────────────────

/**
 * Candidate accepts or declines monitoring. Accepting issues a fresh
 * ingest key (a reload re-consents and restarts the batch sequence).
 */
export const recordConsent = async (interview, { accept, userAgent }, now = Date.now()) => {
  const session = await sessionFor(interview);
  if (session.status === "ended") {
    throw new IntegrityError(409, "SESSION_ENDED", "This interview's monitoring has ended");
  }
  if (!accept) {
    await IntegritySession.updateOne(
      { _id: session._id },
      { $set: { status: "declined", "consent.declinedAt": new Date(now) } },
    );
    publish(String(interview._id), { kind: "consent", status: "declined" });
    return { status: "declined" };
  }
  const ingestKey = issueIngestKey();
  await IntegritySession.updateOne(
    { _id: session._id },
    {
      $set: {
        status: "active",
        ingestKey,
        "consent.givenAt": new Date(now),
        "consent.policyVersion": MONITORING_POLICY.version,
        "consent.userAgent": String(userAgent ?? "").slice(0, 300),
        "heartbeat.lastSeq": 0,
        "heartbeat.frozenStreak": 0,
      },
      $unset: { "consent.declinedAt": "" },
      $min: { startedAt: new Date(now) },
    },
  );
  publish(String(interview._id), { kind: "consent", status: "active" });
  return {
    status: "active",
    sessionId: String(session._id),
    ingestKey,
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    policy: MONITORING_POLICY,
  };
};

// ─── Tamper flags ──────────────────────────────────────────────────────

const raiseTamper = async (session, { type, source, at, detail, durationMs = 0 }) => {
  const when = new Date(at);
  const bumped = await IntegritySession.updateOne(
    { _id: session._id, "tamperFlags.type": type },
    { $inc: { "tamperFlags.$.count": 1 }, $set: { "tamperFlags.$.lastAt": when } },
  );
  if (bumped.matchedCount === 0) {
    await IntegritySession.updateOne(
      { _id: session._id, "tamperFlags.type": { $ne: type } },
      { $push: { tamperFlags: { type, source, firstAt: when, lastAt: when, count: 1, detail } } },
    );
  }
  await IntegrityEvent.create({
    sessionId: session._id,
    interviewId: session.interviewId,
    kind: "tamper",
    type,
    source,
    at: when,
    durationMs,
    counted: true,
    detail,
  });
  return { type, label: TAMPER_SIGNALS[type]?.label ?? type, at: when, source };
};

// ─── Scoring ───────────────────────────────────────────────────────────

/** Persist debounced outcomes, update totals and the decayed score. */
const applyOutcomes = async (session, outcomes, lastCounted, now) => {
  if (outcomes.length) {
    await IntegrityEvent.insertMany(
      outcomes.map((o) => ({
        sessionId: session._id,
        interviewId: session.interviewId,
        kind: "behavior",
        type: o.type,
        source: o.source,
        at: new Date(o.at),
        durationMs: o.durationMs,
        confidence: o.confidence,
        counted: o.counted,
        reason: o.reason,
        points: o.points,
        evidenceId: o.evidenceId,
        detail: o.detail,
        ...(o.source === "recruiter" && o.counted && { crossChecked: false }),
      })),
      { ordered: false },
    );
  }

  const inc = {};
  const max = {};
  const set = {};
  for (const o of outcomes) {
    const base = `aggregates.${o.type}`;
    inc[`${base}.occurrences`] = (inc[`${base}.occurrences`] ?? 0) + 1;
    inc[`${base}.bySource.${o.source}`] = (inc[`${base}.bySource.${o.source}`] ?? 0) + 1;
    if (!o.counted) continue;
    inc[`${base}.counted`] = (inc[`${base}.counted`] ?? 0) + 1;
    inc[`${base}.totalMs`] = (inc[`${base}.totalMs`] ?? 0) + o.durationMs;
    inc[`${base}.points`] = (inc[`${base}.points`] ?? 0) + o.points;
    max[`${base}.maxConfidence`] = Math.max(max[`${base}.maxConfidence`] ?? 0, o.confidence);
    max[`${base}.lastAt`] = new Date(Math.max(o.at, max[`${base}.lastAt`]?.getTime() ?? 0));
  }
  for (const [key, at] of Object.entries(lastCounted)) {
    set[`lastCounted.${key}`] = at;
  }
  const scored = outcomes
    .filter((o) => o.points > 0)
    .map((o) => ({ at: new Date(o.at), points: o.points, type: o.type, source: o.source }));

  const update = {};
  if (Object.keys(inc).length) update.$inc = inc;
  if (Object.keys(max).length) update.$max = max;
  if (Object.keys(set).length) update.$set = set;
  if (scored.length) update.$push = { scored: { $each: scored, $slice: -MAX_SCORED } };
  if (Object.keys(update).length) {
    await IntegritySession.updateOne({ _id: session._id }, update);
  }
  return refreshRisk(session._id, now);
};

/** Recompute the decayed score at `now` (expected signals excluded). */
export const refreshRisk = async (sessionId, now = Date.now()) => {
  const fresh = await IntegritySession.findById(sessionId)
    .select("scored expectedSignals risk")
    .lean();
  const expected = new Set(fresh.expectedSignals ?? []);
  const score = scoreAt(
    (fresh.scored ?? [])
      .filter((s) => !expected.has(s.type))
      .map((s) => ({ at: new Date(s.at).getTime(), points: s.points })),
    now,
  );
  const risk = { score, band: bandFor(score), updatedAt: new Date(now) };
  await IntegritySession.updateOne(
    { _id: sessionId },
    { $set: { "risk.score": score, "risk.band": risk.band, "risk.updatedAt": risk.updatedAt } },
  );
  if (score > (fresh.risk?.peak ?? 0)) {
    await IntegritySession.updateOne(
      { _id: sessionId, "risk.peak": { $lt: score } },
      { $set: { "risk.peak": score, "risk.peakAt": new Date(now) } },
    );
  }
  return { ...risk, peak: Math.max(score, fresh.risk?.peak ?? 0) };
};

const alertsFrom = (outcomes) =>
  outcomes
    .filter((o) => o.counted && o.points > 0)
    .map((o) => ({
      signal: o.type,
      label: BEHAVIOR_SIGNALS[o.type].label,
      source: o.source,
      at: new Date(o.at),
      durationMs: o.durationMs,
      confidence: o.confidence,
      points: o.points,
      evidenceId: o.evidenceId,
    }));

// ─── Candidate ingest ──────────────────────────────────────────────────

/**
 * One signed batch from the candidate's proctor (every ~5 s): heartbeat,
 * detector stats and any events since the last batch.
 *
 * batch: { seq, sentAt, sig, events: [...], stats: { modelLoaded, fps,
 *          frameHash, cameraLabel, extendedDisplay, screenShareSurface } }
 */
export const ingestCandidateBatch = async (interview, batch, now = Date.now()) => {
  const session = await getSession(interview._id, { withKey: true });
  if (!session || session.status === "awaiting_consent" || session.status === "declined") {
    throw new IntegrityError(409, "NO_CONSENT", "Monitoring consent hasn't been given");
  }
  if (session.status === "ended") {
    throw new IntegrityError(409, "SESSION_ENDED", "This interview's monitoring has ended");
  }
  if ((batch?.events?.length ?? 0) > MAX_EVENTS_PER_BATCH) {
    throw new IntegrityError(413, "BATCH_TOO_LARGE", `At most ${MAX_EVENTS_PER_BATCH} events per batch`);
  }
  const lastSeq = session.heartbeat?.lastSeq ?? 0;
  const verdict = verifyBatch(session.ingestKey, batch, { lastSeq, now });
  if (!verdict.ok) {
    const status = verdict.code === "REPLAYED_BATCH" ? 409 : 401;
    throw new IntegrityError(status, verdict.code, "Batch rejected");
  }

  // Claim this sequence number atomically: a concurrent or replayed batch
  // with the same seq loses the race and is rejected
  const stats = batch.stats ?? {};
  const frameHash = typeof stats.frameHash === "string" ? stats.frameHash.slice(0, 128) : undefined;
  const sameFrame = frameHash && frameHash === session.heartbeat?.lastFrameHash;
  const claimed = await IntegritySession.findOneAndUpdate(
    { _id: session._id, "heartbeat.lastSeq": lastSeq },
    {
      $set: {
        "heartbeat.lastSeq": batch.seq,
        "heartbeat.lastAt": new Date(now),
        "heartbeat.modelLoaded": stats.modelLoaded !== false,
        ...(Number.isFinite(stats.fps) && { "heartbeat.fps": stats.fps }),
        ...(frameHash && { "heartbeat.lastFrameHash": frameHash }),
        "heartbeat.frozenStreak": sameFrame ? (session.heartbeat?.frozenStreak ?? 0) + 1 : 0,
        ...(typeof stats.cameraLabel === "string" && { "device.cameraLabel": stats.cameraLabel.slice(0, 120) }),
        ...(typeof stats.extendedDisplay === "boolean" && { "device.extendedDisplay": stats.extendedDisplay }),
        ...(typeof stats.screenShareSurface === "string" && { "device.screenShareSurface": stats.screenShareSurface.slice(0, 20) }),
      },
      $inc: { "heartbeat.batches": 1 },
      $min: { "heartbeat.firstAt": new Date(now) },
    },
    { new: true },
  );
  if (!claimed) throw new IntegrityError(409, "REPLAYED_BATCH", "Batch rejected");

  const tamper = [];
  const sentAt = batch.sentAt;
  const lastAt = session.heartbeat?.lastAt?.getTime();
  if (lastAt && sentAt - lastAt > HEARTBEAT_GAP_MS) {
    const gap = sentAt - lastAt;
    await IntegritySession.updateOne(
      { _id: session._id },
      { $inc: { "heartbeat.gapCount": 1, "heartbeat.gapMs": gap } },
    );
    tamper.push(await raiseTamper(session, {
      type: "heartbeat_gap", source: "server", at: lastAt, durationMs: gap,
      detail: `No monitoring data for ${Math.round(gap / 1000)}s`,
    }));
  }
  if (lastSeq > 0 && batch.seq > lastSeq + 1) {
    tamper.push(await raiseTamper(session, {
      type: "sequence_gap", source: "server", at: now,
      detail: `${batch.seq - lastSeq - 1} batch(es) never arrived`,
    }));
  }
  if (stats.modelLoaded === false) {
    tamper.push(await raiseTamper(session, { type: "model_not_loaded", source: "candidate", at: now }));
  }
  if (typeof stats.cameraLabel === "string" && VIRTUAL_CAMERA_PATTERN.test(stats.cameraLabel)) {
    tamper.push(await raiseTamper(session, {
      type: "virtual_camera", source: "candidate", at: now, detail: stats.cameraLabel.slice(0, 120),
    }));
  }
  if (claimed.heartbeat.frozenStreak === FROZEN_STREAK_FOR_TAMPER) {
    tamper.push(await raiseTamper(session, {
      type: "frozen_video", source: "server", at: now,
      detail: "Identical camera frames across consecutive batches",
    }));
  }

  // Environment facts become behavior events once per session
  const rawEvents = [...(batch.events ?? [])];
  if (stats.extendedDisplay === true && !session.device?.extendedDisplay) {
    rawEvents.push({ type: "multiple_displays", startedAt: now, confidence: 1 });
  }
  if (
    typeof stats.screenShareSurface === "string" &&
    stats.screenShareSurface !== "monitor" &&
    stats.screenShareSurface !== session.device?.screenShareSurface
  ) {
    rawEvents.push({ type: "screen_share_not_monitor", startedAt: now, confidence: 1, detail: stats.screenShareSurface });
  }

  const result = await processEvents(session, rawEvents, "candidate", now);
  for (const t of result.reportedTamper) tamper.push(t);
  await runCrossCheck(session, now, tamper);

  publish(String(interview._id), {
    kind: "update",
    risk: result.risk,
    alerts: result.alerts,
    tamper,
    candidateAlive: true,
  });
  return { accepted: result.accepted, rejected: result.rejected, nextSeq: batch.seq + 1 };
};

const processEvents = async (session, rawEvents, source, now) => {
  const { accepted, rejected, tamper: reported } = normalizeEvents(rawEvents, {
    source,
    now,
    sessionStartedAt: session.startedAt?.getTime(),
  });
  const reportedTamper = [];
  for (const t of reported) reportedTamper.push(await raiseTamper(session, t));

  // Keys are "source:type" (no dots, so safe as Mongo paths)
  const lastCounted = { ...(session.lastCounted ?? {}) };
  const { outcomes, lastCounted: updated } = debounce(
    accepted,
    lastCounted,
    new Set(session.expectedSignals ?? []),
  );
  const changed = Object.fromEntries(
    Object.entries(updated).filter(([k, v]) => lastCounted[k] !== v),
  );
  const risk = await applyOutcomes(session, outcomes, changed, now);
  return {
    risk,
    alerts: alertsFrom(outcomes),
    reportedTamper,
    accepted: outcomes.length,
    rejected,
  };
};

// ─── Recruiter-side verifier ───────────────────────────────────────────

/**
 * Observations from the detector the recruiter's browser runs on the
 * remote stream it actually receives — the candidate can't suppress it.
 */
export const ingestRecruiterBatch = async (interview, batch, now = Date.now()) => {
  const session = await getSession(interview._id);
  if (!session || session.status !== "active") {
    throw new IntegrityError(409, "SESSION_NOT_ACTIVE", "Monitoring isn't active for this interview");
  }
  if ((batch?.events?.length ?? 0) > MAX_EVENTS_PER_BATCH) {
    throw new IntegrityError(413, "BATCH_TOO_LARGE", `At most ${MAX_EVENTS_PER_BATCH} events per batch`);
  }
  await IntegritySession.updateOne(
    { _id: session._id },
    {
      $set: { "verifier.lastAt": new Date(now) },
      $inc: { "verifier.batches": 1 },
      $min: { "verifier.firstAt": new Date(now) },
    },
  );
  const result = await processEvents(session, batch.events ?? [], "recruiter", now);
  const tamper = [...result.reportedTamper];
  await runCrossCheck(session, now, tamper);
  publish(String(interview._id), { kind: "update", risk: result.risk, alerts: result.alerts, tamper });
  return { accepted: result.accepted, rejected: result.rejected };
};

/**
 * Compare settled recruiter-side sightings with the candidate's detector.
 * Two or more misses raise a detector_mismatch tamper flag.
 */
const runCrossCheck = async (session, now, tamperOut = []) => {
  const pending = await IntegrityEvent.find({
    sessionId: session._id,
    source: "recruiter",
    crossChecked: false,
  }).lean();
  if (!pending.length) return;
  const recruiterEvents = pending.map((e) => ({ ...e, at: e.at.getTime() }));
  const from = Math.min(...recruiterEvents.map((e) => e.at)) - 60_000;
  const [candidateEvents, gaps, fresh] = await Promise.all([
    IntegrityEvent.find({ sessionId: session._id, source: "candidate", kind: "behavior", at: { $gte: new Date(from) } })
      .select("type at durationMs")
      .lean(),
    IntegrityEvent.find({ sessionId: session._id, kind: "tamper", type: "heartbeat_gap" })
      .select("at durationMs")
      .lean(),
    IntegritySession.findById(session._id).select("heartbeat mismatches").lean(),
  ]);
  const firstAt = fresh.heartbeat?.firstAt?.getTime();
  const lastAt = fresh.heartbeat?.lastAt?.getTime();
  const aliveAt = (at) =>
    firstAt != null && at >= firstAt && at <= lastAt + HEARTBEAT_INTERVAL_MS &&
    !gaps.some((g) => at >= g.at.getTime() && at <= g.at.getTime() + g.durationMs);

  const { checked, mismatched } = crossCheck(
    recruiterEvents,
    candidateEvents.map((e) => ({ ...e, at: e.at.getTime() })),
    aliveAt,
    now,
  );
  if (!checked.length) return;
  const mismatchIds = new Set(mismatched.map((e) => String(e._id)));
  await IntegrityEvent.bulkWrite(
    checked.map((e) => ({
      updateOne: {
        filter: { _id: e._id },
        update: { $set: { crossChecked: true, mismatch: mismatchIds.has(String(e._id)) } },
      },
    })),
  );
  if (!mismatched.length) return;
  const updated = await IntegritySession.findOneAndUpdate(
    { _id: session._id },
    { $inc: { mismatches: mismatched.length } },
    { new: true, projection: { mismatches: 1 } },
  );
  if (updated.mismatches >= MISMATCHES_FOR_TAMPER) {
    for (const m of mismatched) {
      tamperOut.push(await raiseTamper(session, {
        type: "detector_mismatch",
        source: "server",
        at: m.at,
        detail: `Recruiter-side detector saw "${BEHAVIOR_SIGNALS[m.type].label}"; the candidate's detector reported nothing`,
      }));
    }
  }
};

// ─── Evidence frames ───────────────────────────────────────────────────

const JPEG_DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;

/** Store a small JPEG still from a high-severity moment (private, 30 days). */
export const storeEvidence = async (interview, source, { image, signal, at }, now = Date.now()) => {
  const session = await getSession(interview._id);
  if (!session || session.status !== "active") {
    throw new IntegrityError(409, "SESSION_NOT_ACTIVE", "Monitoring isn't active for this interview");
  }
  if (!BEHAVIOR_SIGNALS[signal]?.snapshot) {
    throw new IntegrityError(400, "NO_SNAPSHOT_FOR_SIGNAL", "This signal doesn't take evidence frames");
  }
  const match = typeof image === "string" && image.match(JPEG_DATA_URL);
  const buffer = match ? Buffer.from(match[1], "base64") : null;
  if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    throw new IntegrityError(400, "BAD_IMAGE", "Evidence must be a JPEG data URL");
  }
  if (buffer.length > MAX_EVIDENCE_BYTES) {
    throw new IntegrityError(413, "IMAGE_TOO_LARGE", "Evidence frames must be under 120 KB (send ~320px wide)");
  }
  const slot = await IntegritySession.findOneAndUpdate(
    { _id: session._id, evidenceCount: { $lt: MAX_EVIDENCE_PER_SESSION } },
    { $inc: { evidenceCount: 1 } },
  );
  if (!slot) throw new IntegrityError(429, "EVIDENCE_LIMIT", "Evidence limit reached for this interview");

  const { path } = await uploadPrivateFile(
    { originalname: "frame.jpg", buffer, mimetype: "image/jpeg" },
    EVIDENCE_BUCKET,
    `interviews/${interview._id}`,
  );
  const expiresAt = new Date(now + EVIDENCE_RETENTION_DAYS * 24 * 3600_000);
  const evidence = await IntegrityEvidence.create({
    sessionId: session._id,
    interviewId: interview._id,
    source,
    signal,
    at: new Date(Number.isFinite(at) ? at : now),
    bucket: EVIDENCE_BUCKET,
    path,
    bytes: buffer.length,
    expiresAt,
  });
  await queue.enqueue(
    INTEGRITY_EVIDENCE_PURGE_JOB,
    { evidenceId: String(evidence._id) },
    { delayMs: expiresAt.getTime() - now, maxAttempts: 5, dedupeKey: `evidence-purge:${evidence._id}` },
  );
  return { evidenceId: String(evidence._id), expiresAt };
};

export const evidenceLink = async (interview, evidenceId) => {
  const evidence = await IntegrityEvidence.findOne({ _id: evidenceId, interviewId: interview._id }).lean();
  if (!evidence) throw new IntegrityError(404, "NOT_FOUND", "Evidence not found");
  return createSignedFileUrl(evidence.bucket, evidence.path, { expiresIn: 60 });
};

// ─── Recruiter annotations ─────────────────────────────────────────────

/** Mark a signal as expected for this candidate (accommodation), or undo it. */
export const annotateSignal = async (interview, { signal, expected, note }, userId, now = Date.now()) => {
  if (!BEHAVIOR_SIGNALS[signal]) throw new IntegrityError(400, "UNKNOWN_SIGNAL", "Unknown signal");
  const session = await sessionFor(interview);
  await IntegritySession.updateOne(
    { _id: session._id },
    {
      [expected ? "$addToSet" : "$pull"]: { expectedSignals: signal },
      $push: {
        annotations: {
          signal,
          note: `${expected ? "Expected" : "No longer expected"}${note ? `: ${String(note).slice(0, 300)}` : ""}`,
          by: userId,
          at: new Date(now),
        },
      },
    },
  );
  const risk = await refreshRisk(session._id, now);
  publish(String(interview._id), { kind: "update", risk, alerts: [], tamper: [] });
  return risk;
};

// ─── Read models ───────────────────────────────────────────────────────

/** Live view for the recruiter (polling fallback for the SSE stream). */
export const recruiterSnapshot = async (interview, now = Date.now()) => {
  const session = await getSession(interview._id).lean();
  if (!session) return { status: "awaiting_consent", policy: MONITORING_POLICY };
  const risk = session.status === "active" ? await refreshRisk(session._id, now) : session.risk;
  const recent = await IntegrityEvent.find({ sessionId: session._id, counted: true })
    .sort({ at: -1 })
    .limit(20)
    .select("kind type source at durationMs confidence points evidenceId mismatch detail")
    .lean();
  const lastAt = session.heartbeat?.lastAt?.getTime();
  return {
    status: session.status,
    consent: session.consent,
    risk,
    candidateDetector: {
      alive: Boolean(lastAt && now - lastAt <= HEARTBEAT_GAP_MS),
      silentForMs: lastAt ? now - lastAt : null,
      modelLoaded: session.heartbeat?.modelLoaded ?? null,
      fps: session.heartbeat?.fps ?? null,
      batches: session.heartbeat?.batches ?? 0,
    },
    recruiterDetector: { batches: session.verifier?.batches ?? 0, lastAt: session.verifier?.lastAt ?? null },
    device: session.device,
    aggregates: session.aggregates,
    tamperFlags: session.tamperFlags,
    mismatches: session.mismatches,
    expectedSignals: session.expectedSignals,
    recent: recent.map((e) => ({
      ...e,
      label: (e.kind === "tamper" ? TAMPER_SIGNALS : BEHAVIOR_SIGNALS)[e.type]?.label ?? e.type,
    })),
    report: { status: session.report?.status ?? "none", generatedAt: session.report?.generatedAt },
  };
};

/**
 * What the candidate sees: consent state and the policy during the call
 * (never live monitoring state — B4), and their own report afterwards.
 */
export const candidateView = async (interview) => {
  const session = await getSession(interview._id).lean();
  return {
    status: session?.status ?? "awaiting_consent",
    policy: MONITORING_POLICY,
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    report:
      session?.status === "ended" && session.report?.status === "ready"
        ? session.report.data
        : null,
    disputes: session?.disputes ?? [],
  };
};

export const addDispute = async (interview, text, now = Date.now()) => {
  const clean = String(text ?? "").trim().slice(0, 2000);
  if (clean.length < 10) throw new IntegrityError(400, "DISPUTE_TOO_SHORT", "Please explain in a sentence or two");
  const updated = await IntegritySession.findOneAndUpdate(
    { interviewId: interview._id, status: "ended", "disputes.4": { $exists: false } },
    { $push: { disputes: { text: clean, at: new Date(now) } } },
    { new: true },
  );
  if (!updated) throw new IntegrityError(409, "CANNOT_DISPUTE", "Disputes open once the interview has ended (max 5)");
  // Re-generate so the report reflects the candidate's side
  await requestReport(updated);
  return { disputes: updated.disputes.length };
};

// ─── End + report ──────────────────────────────────────────────────────

export const requestReport = async (session) => {
  await IntegritySession.updateOne(
    { _id: session._id },
    { $set: { "report.status": "queued", "report.requestedAt": new Date() } },
  );
  await queue.enqueue(
    INTEGRITY_REPORT_JOB,
    { sessionId: String(session._id) },
    { maxAttempts: 3, dedupeKey: `integrity-report:${session._id}` },
  );
};

/** Close monitoring when the call ends and queue the report. Idempotent. */
export const endSession = async (interviewId, now = Date.now()) => {
  const session = await IntegritySession.findOneAndUpdate(
    { interviewId, status: { $in: ["active", "awaiting_consent", "declined"] } },
    { $set: { status: "ended", endedAt: new Date(now) } },
    { new: true },
  );
  if (!session) return null;
  // Settle every remaining recruiter-side sighting
  await runCrossCheck(session, now + 3600_000);
  const lastAt = session.heartbeat?.lastAt?.getTime();
  if (lastAt && now - lastAt > HEARTBEAT_GAP_MS) {
    await raiseTamper(session, {
      type: "heartbeat_gap", source: "server", at: lastAt, durationMs: now - lastAt,
      detail: `Monitoring silent for the last ${Math.round((now - lastAt) / 1000)}s of the call`,
    });
  }
  await requestReport(session);
  publish(String(interviewId), { kind: "ended" });
  return session;
};

export const endSessionSafely = (interviewId) =>
  endSession(interviewId).catch((error) =>
    logger.warn("Could not close integrity session", { interviewId: String(interviewId), error: error.message }),
  );

/** Opaque ID for SSE event ids. */
export const eventId = () => crypto.randomBytes(6).toString("hex");
