/**
 * Short-lived server-side sessions (live interview practice, practice MCQ tests) that must
 * survive across requests even when requests land on different servers.
 *
 * Stored in Redis when it is connected, so any instance can serve the next request. Without
 * Redis it falls back to a per-process Map with the same expiry (single-instance only).
 * Values must be JSON-safe (dates are stored as strings).
 */
import cache from "./cache.js";

export const createSessionStore = (name, ttlSeconds) => {
  const memory = new Map(); // id -> { value, expires }
  const key = (id) => `sess:${name}:${id}`;

  const sweep = () => {
    const now = Date.now();
    for (const [id, entry] of memory) if (entry.expires <= now) memory.delete(id);
  };

  const redis = async () => {
    await cache.ensureInitialized?.();
    return cache.isConnected && cache.client ? cache.client : null;
  };

  return {
    async get(id) {
      if (!id) return undefined;
      const client = await redis();
      if (client) {
        try {
          const raw = await client.get(key(id));
          if (raw) return JSON.parse(raw);
        } catch {
          // fall back to memory
        }
      }
      const entry = memory.get(id);
      if (!entry) return undefined;
      if (entry.expires <= Date.now()) {
        memory.delete(id);
        return undefined;
      }
      return entry.value;
    },

    async set(id, value) {
      const client = await redis();
      if (client) {
        try {
          await client.setex(key(id), ttlSeconds, JSON.stringify(value));
          return;
        } catch {
          // fall back to memory
        }
      }
      if (memory.size > 5000) sweep();
      memory.set(id, { value, expires: Date.now() + ttlSeconds * 1000 });
    },

    async delete(id) {
      memory.delete(id);
      const client = await redis();
      if (client) await client.del(key(id)).catch(() => {});
    },
  };
};
