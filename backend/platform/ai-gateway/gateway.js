import crypto from "crypto";
import { GROQ_MODELS, GEMINI_MODELS } from "../../config/aiModels.js";
import { toStrictJsonSchema } from "./strictSchema.js";
import { RateLimitedError, estimateTokens } from "./rateLimiter.js";

export class AiGatewayError extends Error {
  constructor(task, attempts) {
    const summary = attempts
      .map((a) => `${a.provider}/${a.model}: ${a.error}`)
      .join("; ");
    super(`AI task "${task}" failed on every model. ${summary}`);
    this.name = "AiGatewayError";
    this.task = task;
    this.attempts = attempts;
  }
}

const CACHE_VERSION = "v1";
const DEFAULT_CACHE_TTL_SECONDS = 7 * 24 * 3600;

/** Default model chains per tier. Each Groq model has its own rate limits. */
export const defaultRoutes = () => ({
  reasoning: [
    { provider: "groq", model: GROQ_MODELS.REASONING },
    { provider: "groq", model: GROQ_MODELS.FAST },
    { provider: "gemini", model: GEMINI_MODELS.FLASH },
  ],
  fast: [
    { provider: "groq", model: GROQ_MODELS.FAST },
    { provider: "groq", model: GROQ_MODELS.REASONING },
    { provider: "gemini", model: GEMINI_MODELS.FLASH },
  ],
});

const describeError = (error) => {
  const status = error?.status ? ` [${error.status}]` : "";
  return `${error?.message || String(error)}${status}`.slice(0, 300);
};

const parseJson = (content) => {
  const text = content.trim();
  try {
    return JSON.parse(text);
  } catch {
    // Non-strict fallbacks sometimes wrap JSON in prose or code fences
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("Response was not JSON");
    return JSON.parse(match[0]);
  }
};

/**
 * Build a gateway. Everything external is injected so it can be tested
 * without network, Redis or Mongo.
 *
 * @param {object} deps
 * @param {Record<string, object>} deps.providers  name -> provider adapter
 * @param {import("./rateLimiter.js").ModelRateLimiter} deps.limiter
 * @param {{get: Function, set: Function}} [deps.cache]
 * @param {(run: object) => void} [deps.recordRun]  telemetry sink
 * @param {() => object|undefined} [deps.getContext]  request log context
 * @param {object} [deps.logger]
 * @param {() => object} [deps.routes]
 */
export const createAiGateway = ({
  providers,
  limiter,
  cache = null,
  recordRun = () => {},
  getContext = () => undefined,
  logger = null,
  routes = defaultRoutes,
  maxWaitMs = 15_000,
}) => {
  const schemaCache = new WeakMap();
  const jsonSchemaFor = (schema) => {
    if (!schemaCache.has(schema)) {
      schemaCache.set(schema, toStrictJsonSchema(schema));
    }
    return schemaCache.get(schema);
  };

  /**
   * Run one AI task.
   *
   * @param {object} options
   * @param {string} options.task  stable task name, e.g. "resume.extract"
   * @param {Array<{role: string, content: string}>} options.messages
   * @param {import("zod").ZodType} [options.schema]  structured output schema
   * @param {boolean} [options.json]  JSON object mode without a schema
   * @param {"reasoning"|"fast"} [options.tier="fast"]
   * @param {Array<{provider: string, model: string}>} [options.models]
   *   explicit model chain (overrides tier)
   * @param {number} [options.maxOutputTokens=2048]
   * @param {number} [options.temperature=0.2]
   * @param {string} [options.cacheKey]  content identity for caching
   * @param {number} [options.cacheTtlSeconds]
   * @param {string} [options.userId]
   * @param {Array<object>} [options.tools]  OpenAI-style function tools for
   *   agent loops; only tool-capable providers are tried, and results are
   *   never cached. Returns `toolCalls` ({ id, name, arguments }) when the
   *   model asks for tools.
   * @returns {Promise<{data?: any, content: string, provider: string,
   *   model: string, degraded: boolean, cached: boolean, latencyMs: number,
   *   usage: {inputTokens: number, outputTokens: number}}>}
   */
  const run = async ({
    task,
    messages,
    schema = null,
    json = false,
    tier = "fast",
    models = null,
    maxOutputTokens = 2048,
    temperature = 0.2,
    cacheKey = null,
    cacheTtlSeconds = DEFAULT_CACHE_TTL_SECONDS,
    userId = null,
    tools = null,
    toolChoice = "auto",
  }) => {
    if (!task) throw new Error("ai.run requires a task name");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("ai.run requires messages");
    }
    if (tools?.length && (schema || json || cacheKey)) {
      throw new Error(
        "ai.run tools can't be combined with schema, json or cacheKey",
      );
    }

    const started = Date.now();
    const context = getContext() || {};
    const telemetryBase = {
      task,
      requestId: context.requestId,
      userId: userId || context.userId,
    };

    const jsonSchema = schema ? jsonSchemaFor(schema) : null;
    const schemaName = task.replace(/[^\w-]/g, "_").slice(0, 64);

    const fullCacheKey =
      cacheKey && cache
        ? `ai:${CACHE_VERSION}:${task}:${crypto
            .createHash("sha256")
            .update(cacheKey)
            .digest("hex")}`
        : null;

    if (fullCacheKey) {
      const hit = await cache.get(fullCacheKey);
      const valid = hit && (!schema || schema.safeParse(hit.data).success);
      if (valid) {
        const result = {
          ...hit,
          cached: true,
          latencyMs: Date.now() - started,
        };
        recordRun({
          ...telemetryBase,
          status: "success",
          provider: hit.provider,
          model: hit.model,
          cached: true,
          degraded: hit.degraded,
          latencyMs: result.latencyMs,
          attempts: [],
        });
        return result;
      }
    }

    const chain = models || routes()[tier];
    if (!chain) throw new Error(`Unknown AI tier "${tier}"`);

    const attempts = [];
    const estimated =
      estimateTokens(messages, maxOutputTokens) +
      (tools?.length ? Math.ceil(JSON.stringify(tools).length / 4) : 0);

    for (const [index, { provider: providerName, model }] of chain.entries()) {
      const provider = providers[providerName];
      if (!provider?.isConfigured()) {
        attempts.push({
          provider: providerName,
          model,
          ok: false,
          error: "not configured",
          latencyMs: 0,
        });
        continue;
      }
      if (tools?.length && !provider.supportsTools?.(model)) {
        attempts.push({
          provider: providerName,
          model,
          ok: false,
          error: "no tool support",
          latencyMs: 0,
        });
        continue;
      }

      const attemptStart = Date.now();
      try {
        if (providerName === "groq") {
          await limiter.acquire(model, estimated, { maxWaitMs });
        }

        const response = await provider.complete({
          model,
          messages,
          jsonSchema,
          schemaName,
          json,
          tools,
          toolChoice,
          maxOutputTokens,
          temperature,
        });
        if (providerName === "groq") limiter.update(model, response.headers);

        if (!response.content && !response.toolCalls?.length) {
          throw new Error(
            `Empty response (finish reason: ${response.finishReason || "unknown"})`,
          );
        }

        let data;
        if (schema) {
          const parsed = schema.safeParse(parseJson(response.content));
          if (!parsed.success) {
            throw new Error(
              `Schema validation failed: ${parsed.error.issues
                .slice(0, 3)
                .map((i) => `${i.path.join(".")} ${i.message}`)
                .join("; ")}`,
            );
          }
          data = parsed.data;
        } else if (json) {
          data = parseJson(response.content);
        }

        const latencyMs = Date.now() - attemptStart;
        attempts.push({ provider: providerName, model, ok: true, latencyMs });

        const result = {
          data,
          content: response.content,
          toolCalls: response.toolCalls || [],
          provider: providerName,
          model,
          degraded: index > 0,
          cached: false,
          latencyMs: Date.now() - started,
          usage: response.usage,
        };

        if (fullCacheKey) {
          const {
            data: d,
            content,
            provider: p,
            model: m,
            degraded,
            usage,
          } = result;
          await cache.set(
            fullCacheKey,
            { data: d, content, provider: p, model: m, degraded, usage },
            cacheTtlSeconds,
          );
        }

        recordRun({
          ...telemetryBase,
          status: "success",
          provider: providerName,
          model,
          degraded: result.degraded,
          cached: false,
          latencyMs: result.latencyMs,
          inputTokens: response.usage?.inputTokens ?? 0,
          outputTokens: response.usage?.outputTokens ?? 0,
          attempts,
        });
        return result;
      } catch (error) {
        if (providerName === "groq" && error?.headers) {
          limiter.update(model, error.headers);
        }
        attempts.push({
          provider: providerName,
          model,
          ok: false,
          error: describeError(error),
          latencyMs: Date.now() - attemptStart,
        });
        logger?.warn("AI attempt failed", {
          task,
          provider: providerName,
          model,
          rateLimited:
            error instanceof RateLimitedError || error?.status === 429,
          error: describeError(error),
        });
      }
    }

    const failure = new AiGatewayError(task, attempts);
    recordRun({
      ...telemetryBase,
      status: "error",
      latencyMs: Date.now() - started,
      attempts,
      error: failure.message.slice(0, 500),
    });
    throw failure;
  };

  return {
    run,
    limiterSnapshot: () => limiter.snapshot(),
  };
};
