import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  mintRealtimeToken,
  uuidForUser,
  privateChannelsEnabled,
  broadcastPrivate,
  setRealtimeFetchForTests,
} from "../../../platform/realtime/index.js";
import {
  getIceServers,
  coturnCredentials,
  setTurnFetchForTests,
} from "../../../platform/turn/index.js";

const ENV_KEYS = [
  "SUPABASE_JWT_SECRET",
  "SUPABASE_JWT_KID",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "TURN_PROVIDER",
  "TURN_URLS",
  "TURN_SHARED_SECRET",
  "CLOUDFLARE_TURN_KEY_ID",
  "CLOUDFLARE_TURN_API_TOKEN",
  "METERED_DOMAIN",
  "METERED_API_KEY",
];
const saved = {};
beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  setRealtimeFetchForTests(null);
  setTurnFetchForTests(null);
});

const USER = "6ad93d7eebac0c49421a5371";

describe("realtime tokens", () => {
  it("is off without a JWT secret", () => {
    expect(privateChannelsEnabled()).toBe(false);
    expect(mintRealtimeToken({ userId: USER, topics: ["user:x"] })).toBeNull();
  });

  it("mints a short-lived Supabase-shaped token listing only the given topics", () => {
    process.env.SUPABASE_JWT_SECRET = "s3cret";
    process.env.SUPABASE_JWT_KID = "kid-1";
    const now = Date.parse("2026-10-22T10:00:00Z");
    const minted = mintRealtimeToken({ userId: USER, topics: ["interview:abc", `user:${USER}`], now });
    const decoded = jwt.verify(minted.token, "s3cret", { clockTimestamp: now / 1000 + 1, complete: true });
    expect(decoded.header).toMatchObject({ alg: "HS256", kid: "kid-1" });
    expect(decoded.payload).toMatchObject({
      role: "authenticated",
      aud: "authenticated",
      sub: uuidForUser(USER),
      app_user_id: USER,
      hireos_topics: ["interview:abc", `user:${USER}`],
    });
    expect(decoded.payload.exp - decoded.payload.iat).toBe(15 * 60);
    expect(minted.expiresAt).toBe("2026-10-22T10:15:00.000Z");
  });

  it("derives a stable, valid UUID per user (auth.uid() casts sub to uuid)", () => {
    const id = uuidForUser(USER);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidForUser(USER)).toBe(id);
    expect(uuidForUser("someone-else")).not.toBe(id);
  });

  it("broadcasts to a private topic with the service-role key, and never throws", async () => {
    expect(await broadcastPrivate("user:x", "e", {})).toBe(false); // not configured
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.SUPABASE_URL = "https://proj.supabase.co/";
    process.env.SUPABASE_JWT_SECRET = "s3cret";
    const calls = [];
    setRealtimeFetchForTests(async (url, init) => {
      calls.push({ url, init });
      return { ok: true };
    });
    expect(await broadcastPrivate(`user:${USER}`, "student_joined_interview", { a: 1 })).toBe(true);
    expect(calls[0].url).toBe("https://proj.supabase.co/realtime/v1/api/broadcast");
    expect(calls[0].init.headers.apikey).toBe("service");
    expect(JSON.parse(calls[0].init.body)).toEqual({
      messages: [{ topic: `user:${USER}`, event: "student_joined_interview", payload: { a: 1 }, private: true }],
    });
    setRealtimeFetchForTests(async () => ({ ok: false, status: 500 }));
    expect(await broadcastPrivate("user:x", "e", {})).toBe(false);
  });
});

describe("ICE servers", () => {
  it("uses STUN only when no TURN provider is configured", async () => {
    const ice = await getIceServers({ userId: USER });
    expect(ice.relay).toBe(false);
    expect(ice.iceServers.every((s) => [].concat(s.urls).every((u) => u.startsWith("stun:")))).toBe(true);
  });

  it("issues coturn REST-API credentials that expire", async () => {
    const now = Date.parse("2026-10-22T10:00:00Z");
    const [server] = coturnCredentials({ urls: ["turn:t.example:3478"], sharedSecret: "shh", userId: USER, ttlSeconds: 60, now });
    expect(server.username).toBe(`${now / 1000 + 60}:${USER}`);
    expect(server.credential).toBe(crypto.createHmac("sha1", "shh").update(server.username).digest("base64"));

    process.env.TURN_PROVIDER = "coturn";
    process.env.TURN_URLS = "turn:t.example:3478, turns:t.example:5349";
    process.env.TURN_SHARED_SECRET = "shh";
    const ice = await getIceServers({ userId: USER });
    expect(ice).toMatchObject({ relay: true, provider: "coturn" });
    expect(ice.iceServers.at(-1).urls).toEqual(["turn:t.example:3478", "turns:t.example:5349"]);
  });

  it("gets Cloudflare credentials with the configured TTL", async () => {
    process.env.TURN_PROVIDER = "cloudflare";
    process.env.CLOUDFLARE_TURN_KEY_ID = "key";
    process.env.CLOUDFLARE_TURN_API_TOKEN = "tok";
    const calls = [];
    setTurnFetchForTests(async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ iceServers: { urls: ["turn:turn.cloudflare.com:3478"], username: "u", credential: "c" } }) };
    });
    const ice = await getIceServers({ userId: USER, ttlSeconds: 600 });
    expect(calls[0].url).toBe("https://rtc.live.cloudflare.com/v1/turn/keys/key/credentials/generate-ice-servers");
    expect(JSON.parse(calls[0].init.body)).toEqual({ ttl: 600 });
    expect(ice.iceServers.at(-1)).toMatchObject({ username: "u", credential: "c" });
  });

  it("gets Metered credentials", async () => {
    process.env.TURN_PROVIDER = "metered";
    process.env.METERED_DOMAIN = "hireos.metered.live";
    process.env.METERED_API_KEY = "k&y";
    setTurnFetchForTests(async (url) => {
      expect(url).toBe("https://hireos.metered.live/api/v1/turn/credentials?apiKey=k%26y");
      return { ok: true, json: async () => [{ urls: "turn:a.relay.metered.ca:80", username: "u", credential: "c" }] };
    });
    expect((await getIceServers({ userId: USER })).relay).toBe(true);
  });

  it("falls back to STUN when the provider fails, instead of breaking the call", async () => {
    process.env.TURN_PROVIDER = "cloudflare";
    process.env.CLOUDFLARE_TURN_KEY_ID = "key";
    process.env.CLOUDFLARE_TURN_API_TOKEN = "tok";
    setTurnFetchForTests(async () => ({ ok: false, status: 503 }));
    const ice = await getIceServers({ userId: USER });
    expect(ice).toMatchObject({ relay: false, provider: "cloudflare" });
    expect(ice.iceServers.length).toBeGreaterThan(0);
  });
});
