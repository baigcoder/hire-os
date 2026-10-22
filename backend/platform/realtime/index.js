/**
 * Supabase Realtime private channels for interview calls.
 *
 * Users sign in with this API's own JWT, not a Supabase session, so the
 * API mints a short-lived Supabase-compatible token listing exactly which
 * topics the caller may use ("interview:<id>", "user:<id>"). The RLS
 * policies in docs/supabase/realtime-private-channels.sql check that claim.
 *
 * The token must be signed with a key Supabase accepts: the project's
 * legacy JWT secret (while it isn't revoked) or an HS256 secret imported as
 * a signing key (set SUPABASE_JWT_KID to its key id). Without
 * SUPABASE_JWT_SECRET this is off and callers fall back to public channels.
 *
 * `sub` is a UUID derived from the user's id, because Supabase's auth.uid()
 * casts `sub` to uuid and Mongo ids aren't UUIDs.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import logger from "../../utils/logger.js";

export const REALTIME_TOKEN_TTL_SECONDS = 15 * 60;
const ISSUER = "hireos-api";

const secret = () => process.env.SUPABASE_JWT_SECRET || "";
const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");

export const privateChannelsEnabled = () => Boolean(secret());

export const interviewTopic = (interviewId) => `interview:${interviewId}`;
export const userTopic = (userId) => `user:${userId}`;

/** Deterministic RFC 4122-shaped (v5-style) UUID for an app user id. */
export const uuidForUser = (userId) => {
  const h = crypto.createHash("sha1").update(`hireos-user:${userId}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * @returns {{ token: string, expiresAt: string, topics: string[] } | null}
 */
export const mintRealtimeToken = ({ userId, topics, ttlSeconds = REALTIME_TOKEN_TTL_SECONDS, now = Date.now() }) => {
  if (!privateChannelsEnabled()) return null;
  const iat = Math.floor(now / 1000);
  const exp = iat + ttlSeconds;
  const kid = process.env.SUPABASE_JWT_KID;
  const token = jwt.sign(
    {
      iss: ISSUER,
      aud: "authenticated",
      role: "authenticated",
      sub: uuidForUser(userId),
      app_user_id: String(userId),
      hireos_topics: topics,
      iat,
      exp,
    },
    secret(),
    { algorithm: "HS256", ...(kid && { keyid: kid }) },
  );
  return { token, expiresAt: new Date(exp * 1000).toISOString(), topics };
};

let fetchImpl = (...args) => fetch(...args);
/** Test seam for the broadcast HTTP call (null restores fetch). */
export const setRealtimeFetchForTests = (fn) => {
  fetchImpl = fn ?? ((...args) => fetch(...args));
};

/**
 * Server-side broadcast to a private topic through Supabase's REST API.
 * The service-role key bypasses the RLS policies, so only the API can push
 * to a user's private topic. Never throws: a missed nudge isn't fatal.
 */
export const broadcastPrivate = async (topic, event, payload) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = supabaseUrl();
  if (!serviceKey || !url) return false;
  try {
    const res = await fetchImpl(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ messages: [{ topic, event, payload, private: privateChannelsEnabled() }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (error) {
    logger.warn("Realtime broadcast failed", { topic, event, error: error.message });
    return false;
  }
};
