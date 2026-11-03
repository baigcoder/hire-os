/**
 * Interview copilot: transcript ingest, scorecard lifecycle, live refresh
 * and recruiter ratings.
 *
 *   audio chunk ─▶ Whisper ─▶ TranscriptSegment ─▶ (debounced) copilot.refresh
 *   video/start ─▶ copilot.scorecard          video/end ─▶ copilot.draft
 *
 * Transcription runs only with the candidate's consent (the same consent
 * screen as integrity monitoring, which lists it).
 */
import crypto from "crypto";
import { InterviewScorecard } from "../../models/interviewScorecard.model.js";
import { TranscriptSegment } from "../../models/transcriptSegment.model.js";
import { IntegritySession } from "../../models/integritySession.model.js";
import { Job } from "../../models/job.model.js";
import queue from "../../platform/queue/index.js";
import logger from "../../utils/logger.js";
import { transcribeChunk } from "./transcribe.js";

export const COPILOT_SCORECARD_JOB = "copilot.scorecard";
export const COPILOT_REFRESH_JOB = "copilot.refresh";
export const COPILOT_DRAFT_JOB = "copilot.draft";

export const REFRESH_INTERVAL_MS = 45_000;
const MAX_SUGGESTIONS = 12;
const MIN_CHUNK_BYTES = 1024;
export const MAX_CHUNK_BYTES = 4 * 1024 * 1024;
const MAX_CHUNK_MS = 60_000;
const AUDIO_TYPES = /^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a)(;.*)?$/i;

export class CopilotError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ─── Scorecard lifecycle ───────────────────────────────────────────────

/** Create the scorecard record and queue its generation (idempotent). */
export const ensureScorecard = async (interview, { force = false } = {}) => {
  const existing = await InterviewScorecard.findOne({ interviewId: interview._id }).select("status").lean();
  if (existing && !force && existing.status !== "failed") return existing.status;
  await InterviewScorecard.updateOne(
    { interviewId: interview._id },
    {
      $set: { status: "generating", jobId: interview.jobId, companyId: interview.companyId },
      $unset: { error: "" },
    },
    { upsert: true },
  );
  await queue.enqueue(
    COPILOT_SCORECARD_JOB,
    { interviewId: String(interview._id) },
    { dedupeKey: `copilot:scorecard:${interview._id}`, maxAttempts: 2 },
  );
  return "generating";
};

export const ensureScorecardSafely = (interview) =>
  ensureScorecard(interview).catch((error) =>
    logger.warn("Could not queue interview scorecard", { interviewId: String(interview._id), error: error.message }),
  );

/** Queue a live copilot refresh; repeated calls collapse into one job. */
export const scheduleRefresh = async (interviewId, { now = Date.now(), immediate = false } = {}) => {
  const card = await InterviewScorecard.findOne({ interviewId }).select("status copilot").lean();
  if (card?.status !== "ready") return false;
  const since = card.copilot?.lastRunAt ? now - card.copilot.lastRunAt.getTime() : Infinity;
  await queue.enqueue(
    COPILOT_REFRESH_JOB,
    { interviewId: String(interviewId) },
    {
      dedupeKey: `copilot:refresh:${interviewId}`,
      delayMs: immediate ? 0 : Math.max(0, REFRESH_INTERVAL_MS - since),
      maxAttempts: 1,
    },
  );
  return true;
};

export const requestDraft = async (interviewId) => {
  const card = await InterviewScorecard.findOneAndUpdate(
    { interviewId, status: "ready" },
    { $set: { "draft.status": "queued" } },
  );
  if (!card) return false;
  await queue.enqueue(
    COPILOT_DRAFT_JOB,
    { interviewId: String(interviewId) },
    { dedupeKey: `copilot:draft:${interviewId}`, maxAttempts: 3 },
  );
  return true;
};

export const requestDraftSafely = (interviewId) =>
  requestDraft(interviewId).catch((error) =>
    logger.warn("Could not queue scorecard draft", { interviewId: String(interviewId), error: error.message }),
  );

// ─── Transcript ingest ─────────────────────────────────────────────────

/** The candidate's consent covers transcription of both sides. */
const transcriptionAllowed = async (interviewId) => {
  const session = await IntegritySession.findOne({ interviewId }).select("status").lean();
  return session?.status === "active";
};

/**
 * One ~15 s chunk of the caller's own microphone.
 * @param {{ buffer: Buffer, mimeType: string, seq: number, startedAt: number }} chunk
 */
export const ingestAudio = async (interview, role, userId, chunk, now = Date.now()) => {
  const { buffer, mimeType, seq, startedAt } = chunk;
  if (!(await transcriptionAllowed(interview._id))) {
    throw new CopilotError(409, "NO_CONSENT", "The candidate hasn't agreed to transcription, or the interview has ended");
  }
  if (!AUDIO_TYPES.test(mimeType || "")) throw new CopilotError(415, "BAD_AUDIO_TYPE", "Send audio/webm, audio/ogg or audio/mp4");
  if (!Buffer.isBuffer(buffer) || buffer.length < MIN_CHUNK_BYTES) {
    throw new CopilotError(400, "EMPTY_AUDIO", "Audio chunk is empty");
  }
  if (!Number.isInteger(seq) || seq < 0) throw new CopilotError(400, "BAD_SEQUENCE", "x-chunk-seq must be a non-negative integer");
  if (!Number.isFinite(startedAt) || Math.abs(now - startedAt) > 10 * 60_000) {
    throw new CopilotError(400, "BAD_TIMESTAMP", "x-chunk-started-at must be within the last 10 minutes");
  }

  const segments = await transcribeChunk({ buffer, mimeType, userId });
  const docs = segments.map((s) => ({
    interviewId: interview._id,
    speaker: role,
    userId,
    chunkSeq: seq,
    index: s.index,
    startedAt: new Date(startedAt + Math.min(s.startOffsetMs, MAX_CHUNK_MS)),
    endedAt: new Date(startedAt + Math.min(Math.max(s.endOffsetMs, s.startOffsetMs), MAX_CHUNK_MS)),
    text: s.text,
    avgLogprob: s.avgLogprob,
  }));
  let stored = docs.length;
  if (docs.length) {
    try {
      await TranscriptSegment.insertMany(docs, { ordered: false });
    } catch (error) {
      // A retried chunk: duplicates are skipped, the rest are kept
      if (error?.code !== 11000 && !error?.writeErrors) throw error;
      stored = error.insertedDocs?.length ?? error.result?.insertedCount ?? 0;
    }
    // New candidate speech is what the copilot reacts to
    if (role === "candidate" && stored > 0) await scheduleRefresh(interview._id, { now });
  }
  return { segments: stored, text: docs.map((d) => d.text).join(" ") };
};

// ─── Recruiter actions ─────────────────────────────────────────────────

export const rateCompetency = async (interview, competencyId, { value, notes }, userId) => {
  if (value != null && !(Number.isInteger(value) && value >= 1 && value <= 4)) {
    throw new CopilotError(400, "BAD_RATING", "Rating must be 1–4 or null");
  }
  const result = await InterviewScorecard.updateOne(
    { interviewId: interview._id, "competencies.id": competencyId },
    {
      $set: {
        "competencies.$.rating": {
          value: value ?? undefined,
          notes: typeof notes === "string" ? notes.slice(0, 2000) : undefined,
          ratedBy: userId,
          ratedAt: new Date(),
        },
      },
    },
  );
  if (!result.matchedCount) throw new CopilotError(404, "NOT_FOUND", "Competency not found");
};

const RECOMMENDATIONS = ["strong_no", "no", "yes", "strong_yes"];
export const setOverall = async (interview, { recommendation, notes }, userId) => {
  if (!RECOMMENDATIONS.includes(recommendation)) {
    throw new CopilotError(400, "BAD_RECOMMENDATION", `recommendation must be one of ${RECOMMENDATIONS.join(", ")}`);
  }
  const result = await InterviewScorecard.updateOne(
    { interviewId: interview._id, status: "ready" },
    {
      $set: {
        overall: {
          recommendation,
          notes: typeof notes === "string" ? notes.slice(0, 4000) : undefined,
          by: userId,
          at: new Date(),
        },
      },
    },
  );
  if (!result.matchedCount) throw new CopilotError(409, "NOT_READY", "The scorecard isn't ready yet");
};

export const copilotView = async (interview, { since } = {}) => {
  const card = await InterviewScorecard.findOne({ interviewId: interview._id }).lean();
  const query = { interviewId: interview._id, ...(since && { createdAt: { $gt: new Date(since) } }) };
  const transcript = await TranscriptSegment.find(query)
    .sort({ startedAt: 1 })
    .limit(400)
    .select("speaker startedAt endedAt text")
    .lean();
  return { scorecard: card, transcript, transcription: { allowed: await transcriptionAllowed(interview._id) } };
};

// ─── Job handlers ──────────────────────────────────────────────────────

const newSuggestionId = () => crypto.randomBytes(5).toString("hex");

/** Write coverage per competency without touching recruiter ratings. */
const coverageUpdate = (competencies) => {
  const set = {};
  const arrayFilters = [];
  competencies.forEach((c, i) => {
    set[`competencies.$[c${i}].coverage`] = c.coverage;
    arrayFilters.push({ [`c${i}.id`]: c.id });
  });
  return { set, arrayFilters };
};

export const createScorecardHandler =
  ({ ai, generate }) =>
  async ({ interviewId }) => {
    const card = await InterviewScorecard.findOne({ interviewId }).lean();
    if (!card) return { skipped: "scorecard removed" };
    const job = await Job.findById(card.jobId).select("title description requirements skills experienceLevel").lean();
    if (!job) {
      await InterviewScorecard.updateOne({ interviewId }, { $set: { status: "failed", error: "The job no longer exists" } });
      return { skipped: "job missing" };
    }
    try {
      const { competencies, source } = await generate(ai, job);
      await InterviewScorecard.updateOne(
        { interviewId },
        { $set: { status: "ready", source, competencies }, $unset: { error: "" } },
      );
      return { competencies: competencies.length, source };
    } catch (error) {
      await InterviewScorecard.updateOne(
        { interviewId },
        { $set: { status: "failed", error: error.message.slice(0, 300) } },
      );
      throw error;
    }
  };

export const createRefreshHandler =
  ({ ai, run }) =>
  async ({ interviewId }, ctx, now = Date.now()) => {
    const card = await InterviewScorecard.findOne({ interviewId }).lean();
    if (card?.status !== "ready") return { skipped: "scorecard not ready" };
    const segments = await TranscriptSegment.find({ interviewId }).sort({ startedAt: 1 }).lean();
    const lastCandidate = [...segments].reverse().find((s) => s.speaker === "candidate");
    if (!lastCandidate) return { skipped: "no candidate speech yet" };
    if (card.copilot?.lastSegmentAt && lastCandidate.createdAt <= card.copilot.lastSegmentAt) {
      return { skipped: "nothing new" };
    }
    const result = await run(ai, {
      competencies: card.competencies,
      segments,
      previousSuggestions: card.suggestions ?? [],
    });
    const { set, arrayFilters } = coverageUpdate(result.competencies);
    const suggestions = result.followUps.map((f) => ({ ...f, id: newSuggestionId(), createdAt: new Date(now) }));
    await InterviewScorecard.updateOne(
      { interviewId },
      {
        $set: {
          ...set,
          "copilot.lastRunAt": new Date(now),
          "copilot.lastSegmentAt": lastCandidate.createdAt,
          "copilot.degraded": result.source !== "model",
        },
        $inc: { "copilot.runs": 1 },
        ...(suggestions.length && { $push: { suggestions: { $each: suggestions, $slice: -MAX_SUGGESTIONS } } }),
      },
      { arrayFilters },
    );
    return { suggestions: suggestions.length, source: result.source };
  };

export const createDraftHandler =
  ({ ai, draft }) =>
  async ({ interviewId }) => {
    const card = await InterviewScorecard.findOne({ interviewId }).lean();
    if (card?.status !== "ready") return { skipped: "scorecard not ready" };
    const segments = await TranscriptSegment.find({ interviewId }).sort({ startedAt: 1 }).lean();
    if (!segments.some((s) => s.speaker === "candidate")) {
      await InterviewScorecard.updateOne(
        { interviewId },
        { $set: { "draft.status": "ready", "draft.generatedAt": new Date(), "draft.note": "No candidate transcript, so no draft ratings." } },
      );
      return { skipped: "no transcript" };
    }
    try {
      const result = await draft(ai, { competencies: card.competencies, segments });
      const set = {};
      const arrayFilters = [];
      result.competencies.forEach((c, i) => {
        set[`competencies.$[d${i}].aiDraft`] = c.aiDraft;
        arrayFilters.push({ [`d${i}.id`]: c.id });
      });
      await InterviewScorecard.updateOne(
        { interviewId },
        {
          $set: {
            ...set,
            "draft.status": "ready",
            "draft.generatedAt": new Date(),
            "draft.model": result.model,
            "draft.note": result.truncated ? "The transcript was long; the earliest part wasn't used." : undefined,
          },
        },
        { arrayFilters },
      );
      return { rated: result.competencies.filter((c) => c.aiDraft.rating).length };
    } catch (error) {
      await InterviewScorecard.updateOne(
        { interviewId },
        { $set: { "draft.status": "failed", "draft.note": "The AI was unavailable; try again later." } },
      );
      throw error;
    }
  };
