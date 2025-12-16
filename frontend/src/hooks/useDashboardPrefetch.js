/**
 * useDashboardPrefetch Hook
 * Prefetches dashboard tab data in the background for faster tab switching
 */

import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { CAREER_INSIGHTS_API_END_POINT } from '@/utils/constant';

// Simple in-memory cache
const prefetchCache = new Map();

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

export const useDashboardPrefetch = () => {
    const prefetchedRef = useRef(false);

    // Check if cache is valid
    const isCacheValid = useCallback((key) => {
        const cached = prefetchCache.get(key);
        if (!cached) return false;
        return Date.now() - cached.timestamp < CACHE_EXPIRY_MS;
    }, []);

    // Get cached data
    const getCachedData = useCallback((key) => {
        if (isCacheValid(key)) {
            return prefetchCache.get(key).data;
        }
        return null;
    }, [isCacheValid]);

    // Prefetch all tab data in parallel
    const prefetchAllData = useCallback(async () => {
        if (prefetchedRef.current) return;
        prefetchedRef.current = true;

        const endpoints = [
            { key: 'skill-gap', url: `${CAREER_INSIGHTS_API_END_POINT}/skill-gap` },
            { key: 'salary', url: `${CAREER_INSIGHTS_API_END_POINT}/salary` },
            { key: 'learning', url: `${CAREER_INSIGHTS_API_END_POINT}/learning` }
        ];

        // Prefetch in parallel without blocking
        endpoints.forEach(async ({ key, url }) => {
            if (!isCacheValid(key)) {
                try {
                    const res = await axios.get(url, { withCredentials: true });
                    if (res.data.success) {
                        prefetchCache.set(key, {
                            data: res.data,
                            timestamp: Date.now()
                        });
                    }
                } catch (error) {
                    // Silently fail - component will handle fetching
                    console.debug(`Prefetch failed for ${key}`);
                }
            }
        });
    }, [isCacheValid]);

    // Start prefetching on mount
    useEffect(() => {
        // Delay prefetch slightly to not block main dashboard load
        const timer = setTimeout(prefetchAllData, 500);
        return () => clearTimeout(timer);
    }, [prefetchAllData]);

    return {
        getCachedData,
        isCacheValid,
        invalidateCache: (key) => prefetchCache.delete(key),
        clearAllCache: () => prefetchCache.clear()
    };
};

// Export cache for direct access from child components
export const dashboardCache = {
    get: (key) => {
        const cached = prefetchCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
            return cached.data;
        }
        return null;
    },
    set: (key, data) => {
        prefetchCache.set(key, {
            data,
            timestamp: Date.now()
        });
    },
    has: (key) => {
        const cached = prefetchCache.get(key);
        return cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS;
    }
};

export default useDashboardPrefetch;
