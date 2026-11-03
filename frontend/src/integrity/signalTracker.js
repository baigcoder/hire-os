/**
 * Turns per-frame detector readings into timed episodes:
 * "phone in view from 10:04:12 for 6.2 s at ~0.81 confidence".
 *
 * - Flicker tolerance: a signal must be absent for GRACE_MS before an
 *   episode ends, so one missed frame doesn't split it in two.
 * - Confirmation: once an episode lasts its signal's minimum duration
 *   (the same minimums the server applies), onConfirm fires once — the
 *   proctor uses it to capture an evidence frame at that moment.
 * - Long episodes are emitted in SEGMENT_MS slices so the recruiter sees
 *   them live instead of only when they end.
 *
 * Pure: the caller passes timestamps, so it's deterministic and testable.
 */

// Mirrors backend modules/integrity/signals.js minMs
export const CONFIRM_MS = {
  face_missing: 3000,
  multiple_faces: 1500,
  gaze_away: 4000,
  head_turned: 4000,
  phone_detected: 1000,
  book_detected: 2000,
  extra_device: 2000,
  extra_person: 1500,
  speech_lips_closed: 3000,
  second_voice: 3000,
};

export const SNAPSHOT_SIGNALS = new Set([
  "face_missing",
  "multiple_faces",
  "phone_detected",
  "book_detected",
  "extra_device",
  "extra_person",
]);

const GRACE_MS = 1000;
const SEGMENT_MS = 30_000;
const REPORT_MIN_MS = 700;

const round2 = (n) => Math.round(n * 100) / 100;

export const createSignalTracker = ({ onConfirm } = {}) => {
  const episodes = new Map();
  let queue = [];

  const emit = (type, ep, endAt) => {
    const durationMs = Math.round(endAt - ep.startAt);
    if (durationMs < REPORT_MIN_MS && !ep.confirmed) return;
    queue.push({
      type,
      startedAt: Math.round(ep.startAt),
      durationMs,
      confidence: round2(ep.n ? ep.sum / ep.n : 0.8),
      ...(ep.evidenceId && { evidenceId: ep.evidenceId }),
    });
  };

  /**
   * @param {number} at ms timestamp
   * @param {Object<string, number>} readings signal → confidence (0 = absent).
   *   Signals not present in `readings` keep their current state.
   */
  const update = (at, readings) => {
    for (const [type, confidence] of Object.entries(readings)) {
      const ep = episodes.get(type);
      if (confidence > 0) {
        if (!ep) {
          episodes.set(type, { startAt: at, lastAt: at, sum: confidence, n: 1, confirmed: false });
          continue;
        }
        ep.lastAt = at;
        ep.sum += confidence;
        ep.n += 1;
        if (!ep.confirmed && at - ep.startAt >= (CONFIRM_MS[type] ?? 0)) {
          ep.confirmed = true;
          onConfirm?.(type, ep.startAt, (evidenceId) => {
            ep.evidenceId = evidenceId;
          });
        }
        if (at - ep.startAt >= SEGMENT_MS) {
          emit(type, ep, at);
          Object.assign(ep, { startAt: at, sum: 0, n: 0, evidenceId: undefined });
        }
      } else if (ep && at - ep.lastAt > GRACE_MS) {
        emit(type, ep, ep.lastAt);
        episodes.delete(type);
      }
    }
  };

  /** A point-in-time event (copy, paste, devtools…). */
  const instant = (type, at, detail) => {
    queue.push({ type, startedAt: Math.round(at), durationMs: 0, confidence: 1, ...(detail && { detail }) });
  };

  /** An event whose duration the caller measured (tab hidden 12 s…). */
  const push = (event) => queue.push(event);

  /** End every open episode (call stop / page leave). */
  const flush = (at) => {
    for (const [type, ep] of episodes) emit(type, ep, Math.min(at, ep.lastAt + GRACE_MS));
    episodes.clear();
  };

  const drain = () => {
    const out = queue;
    queue = [];
    return out;
  };

  const active = () => [...episodes.keys()];

  return { update, instant, push, flush, drain, active };
};

/**
 * Detector readings → per-signal confidences. Thresholds are heuristics
 * tuned to avoid flagging normal thinking (glancing down, small turns).
 */
export const HEAD_YAW_DEG = 32;
export const HEAD_PITCH_DEG = 28;

export const faceReadings = (face, { gaze = true } = {}) => {
  if (!face) return {};
  if (face.count === 0) {
    return { face_missing: 0.9, multiple_faces: 0, head_turned: 0, ...(gaze && { gaze_away: 0 }) };
  }
  const turned = Math.abs(face.yaw) > HEAD_YAW_DEG || Math.abs(face.pitch) > HEAD_PITCH_DEG;
  const looking = Math.max(face.gazeSide - 0.55, face.gazeDown - 0.6, face.gazeUp - 0.55);
  return {
    face_missing: 0,
    multiple_faces: face.count >= 2 ? 0.9 : 0,
    head_turned: turned ? 0.8 : 0,
    ...(gaze && { gaze_away: !turned && looking > 0 ? Math.min(1, 0.6 + looking) : 0 }),
  };
};

export const objectReadings = (objects) => {
  if (!objects) return {};
  return {
    phone_detected: objects.phone >= 0.5 ? objects.phone : 0,
    book_detected: objects.book >= 0.55 ? objects.book : 0,
    extra_device: objects.device >= 0.6 ? objects.device : 0,
    extra_person: objects.persons >= 2 ? objects.personScore : 0,
  };
};
