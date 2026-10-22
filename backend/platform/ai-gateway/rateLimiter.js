/**
 * Per-model rate limiter driven by Groq's response headers.
 *
 * Groq reports, on every response:
 *   x-ratelimit-remaining-requests / x-ratelimit-reset-requests  (daily window)
 *   x-ratelimit-remaining-tokens   / x-ratelimit-reset-tokens    (per-minute window)
 * and `retry-after` (seconds) on a 429.
 *
 * Before a call we check the last known budget: if the per-minute token budget
 * is short we wait for the reset (up to maxWaitMs); if the daily request budget
 * is gone we fail fast so the gateway can fall back to another model.
 *
 * State is in-process: correct for a single long-running API/worker instance,
 * best-effort across serverless invocations.
 */

export class RateLimitedError extends Error {
  constructor(model, retryInMs, reason) {
    super(
      `Rate limit for ${model}: ${reason} (retry in ${Math.ceil(retryInMs / 1000)}s)`,
    );
    this.name = "RateLimitedError";
    this.model = model;
    this.retryInMs = retryInMs;
  }
}

/** Parse Groq durations like "7.66s", "2m59.56s", "1h2m3s", "350ms". */
export const parseDuration = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(parseFloat(text) * 1000);
  const re = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
  let total = 0;
  let matched = false;
  let m;
  while ((m = re.exec(text)) !== null) {
    matched = true;
    const n = parseFloat(m[1]);
    total += { h: 3_600_000, m: 60_000, s: 1000, ms: 1 }[m[2]] * n;
  }
  return matched ? Math.round(total) : null;
};

const readHeader = (headers, name) => {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
};

const toInt = (value) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
};

export const estimateTokens = (messages, maxOutputTokens = 0) => {
  const chars = messages.reduce(
    (sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0),
    0,
  );
  return Math.ceil(chars / 4) + maxOutputTokens;
};

export class ModelRateLimiter {
  constructor({
    now = () => Date.now(),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {}) {
    this.now = now;
    this.sleep = sleep;
    this.state = new Map();
  }

  #get(model) {
    if (!this.state.has(model)) {
      this.state.set(model, {
        remainingTokens: null,
        tokensResetAt: 0,
        remainingRequests: null,
        requestsResetAt: 0,
        blockedUntil: 0,
      });
    }
    return this.state.get(model);
  }

  /** Record the budget reported by a response (success or error). */
  update(model, headers) {
    const s = this.#get(model);
    const now = this.now();

    const remainingTokens = toInt(
      readHeader(headers, "x-ratelimit-remaining-tokens"),
    );
    const tokensReset = parseDuration(
      readHeader(headers, "x-ratelimit-reset-tokens"),
    );
    if (remainingTokens !== null) {
      s.remainingTokens = remainingTokens;
      s.tokensResetAt = now + (tokensReset ?? 60_000);
    }

    const remainingRequests = toInt(
      readHeader(headers, "x-ratelimit-remaining-requests"),
    );
    const requestsReset = parseDuration(
      readHeader(headers, "x-ratelimit-reset-requests"),
    );
    if (remainingRequests !== null) {
      s.remainingRequests = remainingRequests;
      s.requestsResetAt = now + (requestsReset ?? 86_400_000);
    }

    const retryAfter = parseDuration(readHeader(headers, "retry-after"));
    if (retryAfter !== null) {
      s.blockedUntil = Math.max(s.blockedUntil, now + retryAfter);
    }
  }

  /**
   * Wait until `estimatedTokens` fit the model's budget, or throw
   * RateLimitedError if that would take longer than maxWaitMs.
   */
  async acquire(model, estimatedTokens, { maxWaitMs = 15_000 } = {}) {
    const s = this.#get(model);
    let now = this.now();

    if (
      s.remainingRequests !== null &&
      s.remainingRequests <= 0 &&
      s.requestsResetAt > now
    ) {
      throw new RateLimitedError(
        model,
        s.requestsResetAt - now,
        "daily request limit reached",
      );
    }

    let waitMs = Math.max(0, s.blockedUntil - now);
    if (
      s.remainingTokens !== null &&
      s.remainingTokens < estimatedTokens &&
      s.tokensResetAt > now
    ) {
      waitMs = Math.max(waitMs, s.tokensResetAt - now);
    }

    if (waitMs > maxWaitMs) {
      throw new RateLimitedError(model, waitMs, "token budget exhausted");
    }
    if (waitMs > 0) {
      await this.sleep(waitMs);
      now = this.now();
      if (s.tokensResetAt <= now) s.remainingTokens = null;
    }

    // Reserve optimistically so concurrent calls don't all see the same budget;
    // the next response's headers overwrite this with the real figure.
    if (s.remainingTokens !== null) s.remainingTokens -= estimatedTokens;
    if (s.remainingRequests !== null) s.remainingRequests -= 1;
  }

  snapshot() {
    const now = this.now();
    return Object.fromEntries(
      [...this.state.entries()].map(([model, s]) => [
        model,
        {
          remainingTokens: s.remainingTokens,
          tokensResetInMs: Math.max(0, s.tokensResetAt - now),
          remainingRequests: s.remainingRequests,
          requestsResetInMs: Math.max(0, s.requestsResetAt - now),
          blockedForMs: Math.max(0, s.blockedUntil - now),
        },
      ]),
    );
  }
}
