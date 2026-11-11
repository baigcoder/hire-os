/**
 * Per-user AI budget: one person can't drain the shared model capacity (or the paid
 * quota) for everyone else.
 *
 * Two windows per user: calls per minute and estimated tokens per day. Counters live in
 * Redis when it is connected (so the budget holds across servers), otherwise in memory.
 * Cache hits are free: this is only charged when a model will actually be called.
 */

export class UserBudgetError extends Error {
  constructor(reason, retryInSeconds) {
    super(`AI usage limit reached (${reason}). Try again in ${Math.ceil(retryInSeconds)}s.`);
    this.name = "UserBudgetError";
    this.status = 429;
    this.retryInSeconds = retryInSeconds;
  }
}

const intEnv = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const createUserBudget = ({
  cache = null,
  callsPerMinute = () => intEnv("AI_USER_CALLS_PER_MIN", 30),
  tokensPerDay = () => intEnv("AI_USER_TOKENS_PER_DAY", 400_000),
  now = () => Date.now(),
} = {}) => {
  const memory = new Map(); // key -> { n, expires }

  const bump = async (key, amount, ttlSeconds) => {
    if (cache?.isConnected && cache.client?.incrby) {
      try {
        const total = await cache.client.incrby(key, amount);
        if (total === amount) await cache.client.expire(key, ttlSeconds);
        return total;
      } catch {
        // fall through to memory
      }
    }
    const t = now();
    let entry = memory.get(key);
    if (!entry || entry.expires <= t) {
      entry = { n: 0, expires: t + ttlSeconds * 1000 };
      memory.set(key, entry);
      if (memory.size > 20_000) for (const [k, v] of memory) if (v.expires <= t) memory.delete(k);
    }
    entry.n += amount;
    return entry.n;
  };

  /** Charge one call of roughly `tokens` tokens to `userId`; throws UserBudgetError over budget. */
  const charge = async (userId, tokens) => {
    if (!userId) return; // server-initiated work (queue jobs) is not a user's budget
    const t = now();
    const minute = Math.floor(t / 60_000);
    const day = Math.floor(t / 86_400_000);

    const calls = await bump(`aib:m:${userId}:${minute}`, 1, 120);
    if (calls > callsPerMinute()) {
      throw new UserBudgetError("too many requests", 60 - ((t / 1000) % 60));
    }
    const used = await bump(`aib:d:${userId}:${day}`, Math.max(1, Math.round(tokens)), 2 * 86_400);
    if (used > tokensPerDay()) {
      throw new UserBudgetError("daily allowance used", 86_400 - ((t / 1000) % 86_400));
    }
  };

  return { charge };
};
