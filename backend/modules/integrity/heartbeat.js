/**
 * Signed, sequenced candidate batches.
 *
 * At consent the server issues a per-session ingest key. Every batch the
 * candidate's proctor sends carries a monotonically increasing `seq`, its
 * send time, and HMAC-SHA256(key, `${seq}.${sentAt}.${sha256(events JSON)}`).
 *
 * What this does and doesn't prove, honestly: the key lives in the
 * candidate's browser, so a determined candidate who rewrites the client
 * can still sign whatever they like. The signature stops replayed,
 * reordered or third-party batches and makes *missing* batches visible
 * (sequence and heartbeat gaps). Defeating a modified client is the job of
 * the independent recruiter-side detector and the cross-check.
 */
import crypto from "crypto";

const SENT_AT_TOLERANCE_MS = 2 * 60_000;

export const issueIngestKey = () => crypto.randomBytes(32).toString("base64url");

const sha256Hex = (text) => crypto.createHash("sha256").update(text).digest("hex");

/** The exact string the client signs. `events` is the parsed array. */
export const batchSigningInput = ({ seq, sentAt, events }) =>
  `${seq}.${sentAt}.${sha256Hex(JSON.stringify(events ?? []))}`;

export const signBatch = (key, batch) =>
  crypto.createHmac("sha256", key).update(batchSigningInput(batch)).digest("hex");

/**
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
export const verifyBatch = (key, batch, { lastSeq = 0, now }) => {
  const { seq, sentAt, sig } = batch ?? {};
  if (!key) return { ok: false, code: "NO_SESSION_KEY" };
  if (!Number.isInteger(seq) || seq < 1) return { ok: false, code: "BAD_SEQUENCE" };
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > SENT_AT_TOLERANCE_MS) {
    return { ok: false, code: "STALE_BATCH" };
  }
  if (typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) {
    return { ok: false, code: "BAD_SIGNATURE" };
  }
  const expected = signBatch(key, batch);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { ok: false, code: "BAD_SIGNATURE" };
  }
  if (seq <= lastSeq) return { ok: false, code: "REPLAYED_BATCH" };
  return { ok: true };
};
