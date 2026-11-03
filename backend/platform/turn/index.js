/**
 * ICE servers for interview calls, with short-lived TURN credentials.
 *
 * STUN alone fails for roughly 1 in 5 real-world pairs (symmetric NAT,
 * corporate firewalls, some mobile carriers): the call never connects.
 * TURN relays the media in those cases. Credentials are issued per call
 * and expire, so they can't be lifted from one page and reused.
 *
 * TURN_PROVIDER selects the source:
 *   cloudflare  CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN
 *   metered     METERED_DOMAIN (e.g. hireos.metered.live) + METERED_API_KEY
 *   coturn      TURN_URLS (comma-separated) + TURN_SHARED_SECRET
 *               (coturn's use-auth-secret / "TURN REST API" scheme)
 * Unset, or on any provider error: public STUN only (works on most home
 * networks; logged so the gap is visible).
 */
import crypto from "crypto";
import logger from "../../utils/logger.js";

export const TURN_TTL_SECONDS = 4 * 3600;

const STUN = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

let fetchImpl = (...args) => fetch(...args);
/** Test seam for provider HTTP calls (null restores fetch). */
export const setTurnFetchForTests = (fn) => {
  fetchImpl = fn ?? ((...args) => fetch(...args));
};

/** coturn REST API: username "<expiry>:<id>", credential base64(HMAC-SHA1). */
export const coturnCredentials = ({ urls, sharedSecret, userId, ttlSeconds = TURN_TTL_SECONDS, now = Date.now() }) => {
  const username = `${Math.floor(now / 1000) + ttlSeconds}:${userId}`;
  const credential = crypto.createHmac("sha1", sharedSecret).update(username).digest("base64");
  return [{ urls, username, credential }];
};

const providers = {
  cloudflare: async ({ ttlSeconds }) => {
    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
    if (!keyId || !apiToken) throw new Error("CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_API_TOKEN not set");
    const res = await fetchImpl(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: ttlSeconds }),
      },
    );
    if (!res.ok) throw new Error(`Cloudflare TURN HTTP ${res.status}`);
    const data = await res.json();
    const servers = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers];
    return servers.filter(Boolean);
  },
  metered: async () => {
    const domain = process.env.METERED_DOMAIN;
    const apiKey = process.env.METERED_API_KEY;
    if (!domain || !apiKey) throw new Error("METERED_DOMAIN / METERED_API_KEY not set");
    const res = await fetchImpl(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`);
    if (!res.ok) throw new Error(`Metered TURN HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Metered TURN: unexpected response");
    return data;
  },
  coturn: async ({ userId, ttlSeconds }) => {
    const urls = (process.env.TURN_URLS || "").split(",").map((u) => u.trim()).filter(Boolean);
    const sharedSecret = process.env.TURN_SHARED_SECRET;
    if (!urls.length || !sharedSecret) throw new Error("TURN_URLS / TURN_SHARED_SECRET not set");
    return coturnCredentials({ urls, sharedSecret, userId, ttlSeconds });
  },
};

/**
 * @returns {Promise<{ iceServers: RTCIceServer[], relay: boolean, provider: string|null, expiresAt: string|null }>}
 */
export const getIceServers = async ({ userId, ttlSeconds = TURN_TTL_SECONDS, now = Date.now() } = {}) => {
  const name = (process.env.TURN_PROVIDER || "").toLowerCase();
  const provider = providers[name];
  if (!provider) {
    if (name) logger.warn("Unknown TURN_PROVIDER; using STUN only", { provider: name });
    return { iceServers: STUN, relay: false, provider: null, expiresAt: null };
  }
  try {
    const turn = await provider({ userId, ttlSeconds });
    return {
      iceServers: [...STUN, ...turn],
      relay: true,
      provider: name,
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
    };
  } catch (error) {
    logger.warn("TURN credentials unavailable; using STUN only", { provider: name, error: error.message });
    return { iceServers: STUN, relay: false, provider: name, expiresAt: null };
  }
};
