/**
 * Deterministic, server-side risk engine for live-interview integrity.
 * Pure functions: no DB, no clock reads (callers pass `now`), so every rule
 * here is unit-testable and the same input always gives the same score.
 *
 *   normalize → debounce (min duration, cooldown) → points → decayed score
 *
 *   risk(t) = min(100, Σ pointsᵢ · e^(−(t − tᵢ)/τ)),  τ = 90 s
 *
 * The live score shows what is happening *now* and fades when behavior
 * stops; the report also uses the cumulative totals, so nothing is lost.
 */
import { BEHAVIOR_SIGNALS, TAMPER_SIGNALS } from "./signals.js";

export const DECAY_TAU_MS = 90_000;
const MAX_EVENT_MS = 10 * 60_000;
const CLOCK_SKEW_MS = 2 * 60_000;
// A recruiter-side sighting is checked against the candidate's detector
// only once the candidate's batch for that moment has had time to arrive
export const CROSS_CHECK_SETTLE_MS = 15_000;
const CROSS_CHECK_SLACK_MS = 5_000;
// Vision signals both detectors can see, so they can be cross-checked
const CROSS_CHECKED = new Set([
  "face_missing",
  "multiple_faces",
  "phone_detected",
  "extra_person",
  "extra_device",
  "book_detected",
]);
export const MISMATCHES_FOR_TAMPER = 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toMs = (value) => {
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : NaN;
};

export const bandFor = (score) =>
  score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "elevated" : "low";

/**
 * Validate raw detector events. Unknown types, events from a source that
 * may not report them, and timestamps outside the session are rejected.
 *
 * @param {Array} raw  [{type, startedAt, durationMs, confidence, evidenceId, detail}]
 * @param {{source: "candidate"|"recruiter", now: number, sessionStartedAt?: number}} ctx
 */
export const normalizeEvents = (raw, { source, now, sessionStartedAt }) => {
  const accepted = [];
  const rejected = [];
  const tamper = [];
  const earliest = (sessionStartedAt ?? now - 6 * 3600_000) - CLOCK_SKEW_MS;

  for (const event of Array.isArray(raw) ? raw : []) {
    const type = event?.type;
    const at = toMs(event?.startedAt);
    if (!Number.isFinite(at) || at > now + CLOCK_SKEW_MS || at < earliest) {
      rejected.push({ type, reason: "bad_timestamp" });
      continue;
    }
    if (TAMPER_SIGNALS[type]?.reportable) {
      tamper.push({ type, at, source, detail: String(event.detail ?? "").slice(0, 200) });
      continue;
    }
    const spec = BEHAVIOR_SIGNALS[type];
    if (!spec) {
      rejected.push({ type, reason: "unknown_type" });
      continue;
    }
    if (!spec.sources.includes(source)) {
      rejected.push({ type, reason: "source_not_allowed" });
      continue;
    }
    accepted.push({
      type,
      source,
      at,
      durationMs: clamp(Math.round(Number(event.durationMs) || 0), 0, MAX_EVENT_MS),
      confidence: clamp(Number(event.confidence ?? 0.8) || 0, 0, 1),
      evidenceId: typeof event.evidenceId === "string" ? event.evidenceId : undefined,
      detail: event.detail ? String(event.detail).slice(0, 200) : undefined,
    });
  }
  accepted.sort((a, b) => a.at - b.at);
  return { accepted, rejected, tamper };
};

/** Points one occurrence is worth before decay. */
export const pointsFor = ({ type, durationMs, confidence }) => {
  const spec = BEHAVIOR_SIGNALS[type];
  const extra = Math.max(0, durationMs - spec.minMs);
  // Longer occurrences count up to double; low-confidence ones count less
  const durationFactor = 1 + Math.min(1, extra / 30_000);
  return Math.round(spec.weight * confidence * durationFactor * 10) / 10;
};

/**
 * Debounce: drop occurrences shorter than the signal's minimum, merge
 * repeats inside its cooldown, and zero out signals the recruiter marked as
 * expected for this candidate. Returns every event with its outcome, and
 * the updated last-counted time per (source, type).
 *
 * @param {Array} events      normalized events, sorted by time
 * @param {Object} lastCounted { "candidate:phone_detected": ms, ... }
 * @param {Set<string>} expected signal types marked expected
 */
export const debounce = (events, lastCounted = {}, expected = new Set()) => {
  const last = { ...lastCounted };
  const outcomes = events.map((event) => {
    const spec = BEHAVIOR_SIGNALS[event.type];
    const key = `${event.source}:${event.type}`;
    if (event.durationMs < spec.minMs) {
      return { ...event, counted: false, reason: "below_min_duration", points: 0 };
    }
    if (last[key] != null && event.at - last[key] < spec.cooldownMs) {
      return { ...event, counted: false, reason: "cooldown", points: 0 };
    }
    last[key] = event.at;
    if (expected.has(event.type)) {
      return { ...event, counted: true, reason: "expected", points: 0 };
    }
    return { ...event, counted: true, points: pointsFor(event) };
  });
  return { outcomes, lastCounted: last };
};

/** Decayed 0–100 score at `now` from counted occurrences [{at, points}]. */
export const scoreAt = (scored, now, tau = DECAY_TAU_MS) => {
  let total = 0;
  for (const { at, points } of scored) {
    if (!points || at > now) continue;
    total += points * Math.exp(-(now - at) / tau);
  }
  return Math.min(100, Math.round(total));
};

/**
 * Recruiter-side sightings the candidate's detector didn't report.
 * Only vision signals both sides can see are compared, only once the
 * moment has settled, and only while the candidate's detector was alive
 * (otherwise that's a heartbeat gap, flagged separately).
 *
 * @param {Array} recruiterEvents counted recruiter events not yet checked
 * @param {Array} candidateEvents candidate events around the same times
 * @param {(at: number) => boolean} candidateAliveAt
 * @returns {{ checked: Array, mismatched: Array }}
 */
export const crossCheck = (recruiterEvents, candidateEvents, candidateAliveAt, now) => {
  const checked = [];
  const mismatched = [];
  for (const r of recruiterEvents) {
    if (!CROSS_CHECKED.has(r.type)) {
      checked.push(r);
      continue;
    }
    if (now - (r.at + r.durationMs) < CROSS_CHECK_SETTLE_MS) continue;
    checked.push(r);
    if (!candidateAliveAt(r.at)) continue;
    const from = r.at - CROSS_CHECK_SLACK_MS;
    const to = r.at + r.durationMs + CROSS_CHECK_SLACK_MS;
    const seen = candidateEvents.some(
      (c) => c.type === r.type && c.at <= to && c.at + c.durationMs >= from,
    );
    if (!seen) mismatched.push(r);
  }
  return { checked, mismatched };
};
