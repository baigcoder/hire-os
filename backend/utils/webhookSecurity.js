/**
 * Payment webhook verification (S16).
 *
 * Webhooks change billing state, so every one must be signed:
 *   - signatures are computed over the raw request body (captured by the
 *     express.json `verify` hook in index.js), never re-serialized JSON
 *   - comparisons are timing-safe
 *   - Paddle signatures carry a timestamp, checked against a tolerance to
 *     stop replays
 *   - with no secret configured, production rejects the webhook; other
 *     environments accept it with a warning so local testing still works
 */
import crypto from "crypto";
import logger from "./logger.js";

const PADDLE_TOLERANCE_SECONDS = 5 * 60;

const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const hmacHex = (secret, payload) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

/** Raw body as a string, or null if it wasn't captured. */
export const rawBodyOf = (req) =>
  Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : null;

/** SafePay: hex HMAC-SHA256 of the raw body in x-safepay-signature. */
export const verifySafepaySignature = (rawBody, signature, secret) =>
  Boolean(rawBody && signature && secret) &&
  safeEqual(String(signature).trim().toLowerCase(), hmacHex(secret, rawBody));

/**
 * Paddle Billing: header "ts=1700000000;h1=<hex>[;h1=<hex>]" signs
 * `${ts}:${rawBody}`.
 */
export const verifyPaddleSignature = (
  rawBody,
  header,
  secret,
  { now = Date.now(), toleranceSeconds = PADDLE_TOLERANCE_SECONDS } = {},
) => {
  if (!rawBody || !header || !secret) return false;
  const parts = String(header)
    .split(";")
    .map((part) => part.split("="))
    .filter(([key, value]) => key && value);
  const ts = parts.find(([key]) => key === "ts")?.[1];
  const signatures = parts.filter(([key]) => key === "h1").map(([, value]) => value);
  if (!ts || !/^\d+$/.test(ts) || signatures.length === 0) return false;
  if (Math.abs(now / 1000 - Number(ts)) > toleranceSeconds) return false;
  const expected = hmacHex(secret, `${ts}:${rawBody}`);
  return signatures.some((signature) => safeEqual(signature, expected));
};

/**
 * Decide what to do when a provider's webhook secret isn't configured.
 * @returns {{ allowed: boolean, verify: boolean }}
 */
export const webhookPolicy = (secret, provider) => {
  if (secret) return { allowed: true, verify: true };
  if (process.env.NODE_ENV === "production") {
    logger.error(`${provider} webhook rejected: no webhook secret configured`);
    return { allowed: false, verify: false };
  }
  logger.warn(`${provider} webhook accepted WITHOUT verification (no secret; non-production)`);
  return { allowed: true, verify: false };
};
