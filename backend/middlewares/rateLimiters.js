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
 * Redis-backed rate limit store
 * Enables rate limiting across multiple server instances
 */
class RedisRateLimitStore {
  constructor(prefix = "rl:") {
    this.prefix = prefix;
  }

  async increment(key) {
    if (!cache.isConnected) {
      return { totalHits: 0, resetTime: new Date(Date.now() + 60000) };
    }

    const redisKey = this.prefix + key;

    try {
      const multi = cache.client.multi();
      multi.incr(redisKey);
      multi.ttl(redisKey);

      const results = await multi.exec();
      const totalHits = results[0][1];
      const ttl = results[1][1];

      // Set TTL if this is a new key
      if (ttl === -1) {
        await cache.client.expire(redisKey, 60);
      }

      return {
        totalHits,
        resetTime: new Date(Date.now() + (ttl > 0 ? ttl * 1000 : 60000)),
      };
    } catch (error) {
      console.warn("Rate limit store error:", error.message);
      return { totalHits: 0, resetTime: new Date(Date.now() + 60000) };
    }
  }

  async decrement(key) {
    if (!cache.isConnected) return;

    try {
      await cache.client.decr(this.prefix + key);
    } catch (error) {
      console.warn("Rate limit decrement error:", error.message);
    }
  }

  async resetKey(key) {
    if (!cache.isConnected) return;

    try {
      await cache.client.del(this.prefix + key);
    } catch (error) {
      console.warn("Rate limit reset error:", error.message);
    }
  }
}

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
    const email = req.body?.email || "";
    return `${req.ip}:${email}`;
  },
  skip: (req) => process.env.NODE_ENV === "test", // Disable for tests
});

/**
 * Strict auth limiter for password reset
 * 3 requests per hour
 */
export const passwordResetLimiter = rateLimit({
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
