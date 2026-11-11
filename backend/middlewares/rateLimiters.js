/**
 * Rate Limiters - Per-Endpoint Protection
 * Prevents abuse and brute-force attacks
 * Different limits for different endpoint types
 */

import rateLimit from "express-rate-limit";
import cache from "../utils/cache.js";

// ═══════════════════════════════════════════════════════════════
// REDIS STORE FOR RATE LIMITING (Distributed)
// ═══════════════════════════════════════════════════════════════

/**
 * Rate limit store shared across server instances through Redis when REDIS_URL is set.
 * Counts live for exactly the limiter's window (set from its windowMs). If Redis is
 * missing or errors, it falls back to a per-instance in-memory counter, so limits are
 * never silently dropped.
 */
export class RedisRateLimitStore {
  constructor(prefix = "rl:") {
    this.prefix = prefix;
    this.windowMs = 60_000;
    this.memory = new Map();
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  memoryIncrement(key) {
    const now = Date.now();
    let entry = this.memory.get(key);
    if (!entry || entry.reset <= now) {
      entry = { hits: 0, reset: now + this.windowMs };
      this.memory.set(key, entry);
      if (this.memory.size > 10_000) {
        for (const [k, v] of this.memory) if (v.reset <= now) this.memory.delete(k);
      }
    }
    entry.hits += 1;
    return { totalHits: entry.hits, resetTime: new Date(entry.reset) };
  }

  async increment(key) {
    if (cache.isConnected) {
      const redisKey = this.prefix + key;
      try {
        const hits = await cache.client.incr(redisKey);
        let ttl = await cache.client.pttl(redisKey);
        if (hits === 1 || ttl < 0) {
          await cache.client.pexpire(redisKey, this.windowMs);
          ttl = this.windowMs;
        }
        return { totalHits: hits, resetTime: new Date(Date.now() + ttl) };
      } catch (error) {
        console.warn("Rate limit store error, using memory:", error.message);
      }
    }
    return this.memoryIncrement(key);
  }

  async decrement(key) {
    const entry = this.memory.get(key);
    if (entry && entry.hits > 0) entry.hits -= 1;
    if (!cache.isConnected) return;
    try {
      await cache.client.decr(this.prefix + key);
    } catch (error) {
      console.warn("Rate limit decrement error:", error.message);
    }
  }

  async resetKey(key) {
    this.memory.delete(key);
    if (!cache.isConnected) return;
    try {
      await cache.client.del(this.prefix + key);
    } catch (error) {
      console.warn("Rate limit reset error:", error.message);
    }
  }
}

export const sharedStore = (name) => new RedisRateLimitStore(`rl:${name}:`);

// ═══════════════════════════════════════════════════════════════
// RATE LIMITER CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

const standardMessage = {
  success: false,
  message: "Too many requests, please try again later.",
  retryAfter: "Check Retry-After header",
};

/**
 * General API rate limiter
 * 100 requests per minute
 */
export const apiLimiter = rateLimit({
  store: sharedStore("apiLimiter"),
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: standardMessage,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"] || "unknown",
  skip: (req) => {
    // Skip rate limiting for health checks and tests
    return (
      process.env.NODE_ENV === "test" ||
      req.path === "/health" ||
      req.path === "/api/health"
    );
  },
});

/**
 * Auth rate limiter (login, register)
 * 5 requests per 15 minutes - strict for brute-force protection
 */
export const authLimiter = rateLimit({
  store: sharedStore("authLimiter"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + email combination for login
    const email = String(req.body?.email || "").toLowerCase().trim();
    return `${req.ip}:${email}`;
  },
  skip: (req) => process.env.NODE_ENV === "test", // Disable for tests
});

/**
 * Strict auth limiter for password reset
 * 3 requests per hour
 */
export const passwordResetLimiter = rateLimit({
  store: sharedStore("passwordResetLimiter"),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: "Too many password reset requests. Please try again in 1 hour.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * File upload rate limiter
 * 10 uploads per hour
 */
export const uploadLimiter = rateLimit({
  store: sharedStore("uploadLimiter"),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: "Upload limit reached. Please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * AI feature rate limiter
 * 20 requests per minute (AI is expensive)
 */
export const aiLimiter = rateLimit({
  store: sharedStore("aiLimiter"),
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    success: false,
    message: "AI feature rate limit reached. Please wait before trying again.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * Job posting rate limiter
 * 5 job posts per hour
 */
export const jobPostLimiter = rateLimit({
  store: sharedStore("jobPostLimiter"),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: "Job posting limit reached. Please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * Application submission rate limiter
 * 20 applications per hour
 */
export const applicationLimiter = rateLimit({
  store: sharedStore("applicationLimiter"),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: "Application limit reached. Please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * Search rate limiter
 * 60 searches per minute
 */
export const searchLimiter = rateLimit({
  store: sharedStore("searchLimiter"),
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    message: "Search rate limit reached. Please slow down.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * Sync rate limiter (for supabase-sync, data-sync)
 * 30 requests per minute - lenient for frequent syncs
 */
export const syncLimiter = rateLimit({
  store: sharedStore("syncLimiter"),
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: "Sync rate limit reached. Please wait a moment.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || "unknown",
  skip: (req) => process.env.NODE_ENV === "test",
});

// ═══════════════════════════════════════════════════════════════
// DYNAMIC RATE LIMITER
// ═══════════════════════════════════════════════════════════════

/**
 * Create custom rate limiter
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMinutes - Time window in minutes
 * @param {string} customMessage - Custom error message
 */
export const createLimiter = (
  maxRequests,
  windowMinutes,
  customMessage = null,
) => {
  return rateLimit({
    store: sharedStore(`custom:${maxRequests}:${windowMinutes}:${Math.random().toString(36).slice(2, 8)}`),
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: customMessage || {
      success: false,
      message: `Rate limit reached. Max ${maxRequests} requests per ${windowMinutes} minutes.`,
      retryAfter: `${windowMinutes} minutes`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test",
  });
};

/**
 * Global per-IP limiter for every /api request (generous: dashboards make many calls).
 */
export const globalLimiter = rateLimit({
  store: sharedStore("global"),
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: "Too many requests. Please try again later.", success: false, code: "RATE_LIMITED" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  aiLimiter,
  jobPostLimiter,
  applicationLimiter,
  searchLimiter,
  syncLimiter,
  createLimiter,
  RedisRateLimitStore,
};
