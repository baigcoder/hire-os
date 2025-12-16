/**
 * Cache Middleware - Express Route Caching
 * Automatically caches GET responses using Redis
 * Provides cache invalidation hooks
 */

import cache, { cacheKeys, cacheTTL } from '../utils/cache.js';

/**
 * Create cache middleware for a route
 * @param {string} keyPrefix - Cache key prefix (e.g., 'jobs', 'companies')
 * @param {number} ttl - Cache TTL in seconds
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (keyPrefix, ttl = cacheTTL.medium) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        if (!cache.isConnected) {
            return next();
        }

        // Generate cache key from URL + query params
        const queryString = JSON.stringify(req.query);
        const cacheKey = `${keyPrefix}:${req.originalUrl}:${queryString}`;

        try {
            // Try to get from cache
            const cachedData = await cache.get(cacheKey);

            if (cachedData) {
                console.log(`⚡ Cache HIT: ${cacheKey}`);
                return res.json({
                    ...cachedData,
                    _cached: true,
                    _cachedAt: cachedData._cachedAt
                });
            }

            console.log(`💾 Cache MISS: ${cacheKey}`);

            // Store original res.json to intercept response
            const originalJson = res.json.bind(res);

            res.json = async (data) => {
                // Cache the response
                if (res.statusCode === 200 && data) {
                    const dataToCache = {
                        ...data,
                        _cachedAt: new Date().toISOString()
                    };
                    await cache.set(cacheKey, dataToCache, ttl);
                    console.log(`💾 Cached: ${cacheKey} (TTL: ${ttl}s)`);
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.warn('Cache middleware error:', error.message);
            next();
        }
    };
};

/**
 * Cache invalidation middleware
 * Clears cache when data is modified
 * @param {string} keyPattern - Pattern to match keys (e.g., 'jobs:*')
 */
export const invalidateCache = (keyPattern) => {
    return async (req, res, next) => {
        // Run after response is sent
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const deleted = await cache.delPattern(keyPattern);
                if (deleted > 0) {
                    console.log(`🗑️ Invalidated ${deleted} cache entries: ${keyPattern}`);
                }
            }
        });
        next();
    };
};

/**
 * Specific cache invalidators
 */
export const invalidateJobsCache = invalidateCache('jobs:*');
export const invalidateCompaniesCache = invalidateCache('companies:*');
export const invalidateUsersCache = (userId) => invalidateCache(`users:*:${userId}`);

/**
 * Pre-built cache middlewares for common routes
 */
export const cacheJobs = cacheMiddleware('jobs', cacheTTL.medium);
export const cacheJobDetails = cacheMiddleware('job-detail', cacheTTL.long);
export const cacheCompanies = cacheMiddleware('companies', cacheTTL.long);
export const cacheUserProfile = cacheMiddleware('user-profile', cacheTTL.short);

/**
 * Cache statistics endpoint handler
 */
export const getCacheStats = async (req, res) => {
    try {
        const stats = {
            connected: cache.isConnected,
            defaultTTL: cache.defaultTTL,
            ttlValues: cacheTTL
        };

        if (cache.isConnected) {
            const info = await cache.client.info('stats');
            const memoryInfo = await cache.client.info('memory');

            // Parse Redis INFO response
            const parseInfo = (info) => {
                const result = {};
                info.split('\n').forEach(line => {
                    const [key, value] = line.split(':');
                    if (key && value) {
                        result[key.trim()] = value.trim();
                    }
                });
                return result;
            };

            const parsedStats = parseInfo(info);
            const parsedMemory = parseInfo(memoryInfo);

            stats.redis = {
                totalConnections: parsedStats.total_connections_received,
                totalCommands: parsedStats.total_commands_processed,
                keyspaceHits: parsedStats.keyspace_hits,
                keyspaceMisses: parsedStats.keyspace_misses,
                hitRate: parsedStats.keyspace_hits && parsedStats.keyspace_misses
                    ? (parseInt(parsedStats.keyspace_hits) / (parseInt(parsedStats.keyspace_hits) + parseInt(parsedStats.keyspace_misses)) * 100).toFixed(2) + '%'
                    : 'N/A',
                usedMemory: parsedMemory.used_memory_human,
                connectedClients: parsedStats.connected_clients
            };
        }

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export default {
    cacheMiddleware,
    invalidateCache,
    invalidateJobsCache,
    invalidateCompaniesCache,
    invalidateUsersCache,
    cacheJobs,
    cacheJobDetails,
    cacheCompanies,
    cacheUserProfile,
    getCacheStats
};
