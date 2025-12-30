/**
 * Performance Monitoring Middleware
 * Tracks API response times and provides performance insights
 */

import logger from './logger.js';

// In-memory stats (for development - use Redis/DataDog in production)
const stats = {
    requests: 0,
    totalResponseTime: 0,
    slowRequests: [],
    routeStats: new Map(),
    errors: 0,
};

// Configuration
const SLOW_THRESHOLD_MS = 1000; // Requests taking > 1s are considered slow
const MAX_SLOW_REQUESTS = 100; // Keep last 100 slow requests

/**
 * Performance monitoring middleware
 * Tracks response times and logs slow requests
 */
export const performanceMonitor = (req, res, next) => {
    const start = process.hrtime.bigint();
    const route = `${req.method} ${req.route?.path || req.path}`;

    // Increment request counter
    stats.requests++;

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function (...args) {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6; // Convert to milliseconds

        // Update stats
        stats.totalResponseTime += durationMs;

        // Track per-route stats
        if (!stats.routeStats.has(route)) {
            stats.routeStats.set(route, {
                count: 0,
                totalTime: 0,
                maxTime: 0,
                minTime: Infinity,
            });
        }
        const routeStat = stats.routeStats.get(route);
        routeStat.count++;
        routeStat.totalTime += durationMs;
        routeStat.maxTime = Math.max(routeStat.maxTime, durationMs);
        routeStat.minTime = Math.min(routeStat.minTime, durationMs);

        // Log slow requests
        if (durationMs > SLOW_THRESHOLD_MS) {
            const slowRequest = {
                route,
                duration: Math.round(durationMs),
                timestamp: new Date().toISOString(),
                statusCode: res.statusCode,
                userAgent: req.get('User-Agent')?.substring(0, 50),
            };

            stats.slowRequests.push(slowRequest);
            if (stats.slowRequests.length > MAX_SLOW_REQUESTS) {
                stats.slowRequests.shift();
            }

            logger.warn(`⚠️ Slow request: ${route} took ${Math.round(durationMs)}ms`);
        }

        // Track errors
        if (res.statusCode >= 500) {
            stats.errors++;
        }

        // Set response header with timing (useful for debugging)
        if (!res.headersSent) {
            res.setHeader('X-Response-Time', `${Math.round(durationMs)}ms`);
        }

        return originalEnd.apply(this, args);
    };

    next();
};

/**
 * Get performance statistics
 */
export const getPerformanceStats = () => {
    const routeStatsArray = [];
    stats.routeStats.forEach((value, key) => {
        routeStatsArray.push({
            route: key,
            count: value.count,
            avgTime: Math.round(value.totalTime / value.count),
            maxTime: Math.round(value.maxTime),
            minTime: value.minTime === Infinity ? 0 : Math.round(value.minTime),
        });
    });

    // Sort by average time (slowest first)
    routeStatsArray.sort((a, b) => b.avgTime - a.avgTime);

    return {
        summary: {
            totalRequests: stats.requests,
            avgResponseTime: stats.requests > 0
                ? Math.round(stats.totalResponseTime / stats.requests)
                : 0,
            errorCount: stats.errors,
            errorRate: stats.requests > 0
                ? `${((stats.errors / stats.requests) * 100).toFixed(2)}%`
                : '0%',
        },
        slowRequests: stats.slowRequests.slice(-20), // Last 20 slow requests
        routeStats: routeStatsArray.slice(0, 20), // Top 20 slowest routes
        timestamp: new Date().toISOString(),
    };
};

/**
 * Reset performance stats (useful for periodic clearing)
 */
export const resetPerformanceStats = () => {
    stats.requests = 0;
    stats.totalResponseTime = 0;
    stats.slowRequests = [];
    stats.routeStats.clear();
    stats.errors = 0;
};

/**
 * Database query profiler
 * Wraps mongoose to profile query performance
 */
export const enableQueryProfiling = (mongoose) => {
    mongoose.set('debug', (collectionName, methodName, ...methodArgs) => {
        const query = methodArgs[0] || {};
        const options = methodArgs[1] || {};

        // Log slow queries (this is a simple implementation)
        logger.debug(`📊 DB Query: ${collectionName}.${methodName}`, {
            query: JSON.stringify(query).substring(0, 200),
        });
    });
};

export default performanceMonitor;
