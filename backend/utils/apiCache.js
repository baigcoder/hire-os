/**
 * API Response Cache Utility
 * In-memory caching with per-user TTL for expensive AI operations
 */

// Simple in-memory cache store
const cache = new Map();

// Default TTL: 10 minutes
const DEFAULT_TTL = 10 * 60 * 1000;

/**
 * Generate cache key
 * @param {string} prefix - Route or feature identifier
 * @param {string} userId - User ID for per-user caching
 * @returns {string} Cache key
 */
export const getCacheKey = (prefix, userId) => {
  return `${prefix}:${userId}`;
};

/**
 * Get cached response
 * @param {string} key - Cache key
 * @returns {object|null} Cached data or null if expired/missing
 */
export const getCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cached.data;
};

/**
 * Set cache with TTL
 * @param {string} key - Cache key
 * @param {object} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default: 10 min)
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
    createdAt: Date.now(),
  });
};

/**
 * Delete specific cache entry
 * @param {string} key - Cache key
 */
export const deleteCache = (key) => {
  cache.delete(key);
};

/**
 * Clear all cache entries for a user
 * @param {string} userId - User ID
 */
export const clearUserCache = (userId) => {
  for (const key of cache.keys()) {
    if (key.endsWith(`:${userId}`)) {
      cache.delete(key);
    }
  }
};

/**
 * Clear entire cache
 */
export const clearAllCache = () => {
  cache.clear();
};

/**
 * Cache middleware wrapper for route handlers
 * @param {string} cachePrefix - Prefix for cache key
 * @param {number} ttl - Cache TTL in ms (default: 10 min)
 */
export const withCache = (cachePrefix, ttl = DEFAULT_TTL) => {
  return (handler) => {
    return async (req, res) => {
      const userId = req.id;
      const cacheKey = getCacheKey(cachePrefix, userId);

      // Check cache first
      const cached = getCache(cacheKey);
      if (cached) {
        console.log(`📦 Cache HIT: ${cachePrefix} for user ${userId}`);
        return res.status(200).json(cached);
      }

      console.log(`🔄 Cache MISS: ${cachePrefix} for user ${userId}`);

      // Override res.json to intercept and cache response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200 && data.success) {
          setCache(cacheKey, data, ttl);
          console.log(`💾 Cached: ${cachePrefix} for user ${userId}`);
        }
        return originalJson(data);
      };

      // Call original handler
      return handler(req, res);
    };
  };
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  let activeCount = 0;
  let expiredCount = 0;
  const now = Date.now();

  for (const [key, value] of cache.entries()) {
    if (value.expiresAt > now) {
      activeCount++;
    } else {
      expiredCount++;
    }
  }

  return {
    totalEntries: cache.size,
    activeEntries: activeCount,
    expiredEntries: expiredCount,
  };
};

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (value.expiresAt < now) {
        cache.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export default {
  getCache,
  setCache,
  deleteCache,
  getCacheKey,
  clearUserCache,
  clearAllCache,
  withCache,
  getCacheStats,
};
