/**
 * Token Blacklist Utility
 * Stores revoked tokens in memory with automatic cleanup
 * For production with multiple instances, use Redis instead
 */

import crypto from 'crypto';

// In-memory store for blacklisted tokens
// Format: { tokenHash: expiryTimestamp }
const blacklistedTokens = new Map();

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Hash a token for storage (we don't need to store the full token)
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
};

/**
 * Add a token to the blacklist
 * @param {string} token - JWT token to blacklist
 * @param {number} expiryTime - Unix timestamp when token expires (or Date object)
 */
export const blacklistToken = (token, expiryTime) => {
    if (!token) return;

    const hash = hashToken(token);
    const expiry = expiryTime instanceof Date
        ? expiryTime.getTime()
        : (expiryTime * 1000); // Convert seconds to ms if needed

    blacklistedTokens.set(hash, expiry);
    console.log(`🔒 Token blacklisted (hash: ${hash.substring(0, 8)}...)`);
};

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} - true if blacklisted
 */
export const isTokenBlacklisted = (token) => {
    if (!token) return false;

    const hash = hashToken(token);
    return blacklistedTokens.has(hash);
};

/**
 * Remove expired tokens from blacklist
 */
const cleanupExpiredTokens = () => {
    const now = Date.now();
    let cleaned = 0;

    for (const [hash, expiry] of blacklistedTokens.entries()) {
        if (expiry < now) {
            blacklistedTokens.delete(hash);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired tokens from blacklist`);
    }
};

/**
 * Get blacklist statistics
 */
export const getBlacklistStats = () => ({
    size: blacklistedTokens.size,
    entries: Array.from(blacklistedTokens.entries()).map(([hash, expiry]) => ({
        hash: hash.substring(0, 8) + '...',
        expiresAt: new Date(expiry).toISOString(),
        isExpired: expiry < Date.now()
    }))
});

/**
 * Clear all blacklisted tokens (for testing)
 */
export const clearBlacklist = () => {
    blacklistedTokens.clear();
};

// Start cleanup interval
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);

// Run initial cleanup on module load
cleanupExpiredTokens();

export default {
    blacklistToken,
    isTokenBlacklisted,
    getBlacklistStats,
    clearBlacklist
};
