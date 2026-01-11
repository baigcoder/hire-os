import Redis from "ioredis";

/**
 * Redis Cache Utility
 * Provides caching layer for performance optimization
 * Falls back gracefully if Redis is not available
 * Uses lazy initialization to avoid issues in serverless environments
 */

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.initPromise = null;
    this.defaultTTL = 300; // 5 minutes default
    // Don't call init() here - use lazy initialization instead
  }

  /**
   * Lazy initialization - called on first cache operation
   */
  async ensureInitialized() {
    if (this.isInitialized) return;

    // Use a promise to prevent multiple init calls
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.init();
    return this.initPromise;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        console.log(
          "ℹ️ Redis disabled (no REDIS_URL provided), using in-memory mode",
        );
        this.isConnected = false;
        this.isInitialized = true;
        return;
      }

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        enableReadyCheck: true,
        connectTimeout: 5000,
      });

      this.client.on("connect", () => {
        console.log("✅ Redis connected");
        this.isConnected = true;
      });

      this.client.on("error", (error) => {
        console.warn("⚠️ Redis connection error:", error.message);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        console.log("🔴 Redis connection closed");
        this.isConnected = false;
      });

      // Attempt to connect
      await this.client.connect().catch((err) => {
        console.warn("⚠️ Redis not available, caching disabled:", err.message);
        this.isConnected = false;
      });

      this.isInitialized = true;
    } catch (error) {
      console.warn("⚠️ Redis initialization failed:", error.message);
      this.isConnected = false;
      this.isInitialized = true; // Mark as initialized even on failure to prevent retries
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    await this.ensureInitialized();
    if (!this.isConnected) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn("Cache get error:", error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    await this.ensureInitialized();
    if (!this.isConnected) return false;

    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Cache set error:", error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    await this.ensureInitialized();
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.warn("Cache delete error:", error.message);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., 'jobs:*')
   * @returns {Promise<number>} - Number of deleted keys
   */
  async delPattern(pattern) {
    await this.ensureInitialized();
    if (!this.isConnected) return 0;

    try {
      let cursor = "0";
      let deleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );

        if (keys.length > 0) {
          const pipeline = this.client.pipeline();
          keys.forEach((key) => pipeline.unlink(key));
          const results = await pipeline.exec();
          deleted += results.filter((result) => !result[0]).length;
        }

        cursor = nextCursor;
      } while (cursor !== "0");

      return deleted;
    } catch (error) {
      console.warn("Cache pattern delete error:", error.message);
      return 0;
    }
  }

  /**
   * Cache-aside pattern helper
   * Fetches from cache or executes function and caches result
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to get data
   * @param {number} ttl - Cache TTL
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache the result
    await this.set(key, data, ttl);

    return data;
  }

  /**
   * Flush all cache
   * @returns {Promise<boolean>}
   */
  async flush() {
    await this.ensureInitialized();
    if (!this.isConnected) return false;

    try {
      await this.delPattern("*");
      return true;
    } catch (error) {
      console.warn("Cache flush error:", error.message);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   * Useful for graceful shutdowns and testing
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log("Redis disconnected gracefully");
      } catch (error) {
        console.warn("Redis disconnect error:", error.message);
        // Force disconnect if quit fails
        this.client.disconnect();
      }
    }
  }
}

// Singleton instance
const cache = new CacheManager();

// Cache key generators
export const cacheKeys = {
  allJobs: (page, limit, filters = "") =>
    `jobs:all:${page}:${limit}:${filters}`,
  job: (id) => `jobs:${id}`,
  company: (id) => `companies:${id}`,
  userProfile: (id) => `users:profile:${id}`,
  jobStats: (userId) => `jobs:stats:${userId}`,
  recommendations: (userId) => `recommendations:${userId}`,
};

// Cache TTL values (in seconds)
export const cacheTTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  veryLong: 86400, // 24 hours
};

export default cache;
