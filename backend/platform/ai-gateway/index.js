/**
 * AI gateway — the one place new code should call an LLM from.
 *
 *   import ai from "../platform/ai-gateway/index.js";
 *   const { data } = await ai.run({
 *     task: "resume.extract",
 *     tier: "fast",
 *     schema: ResumeProfileSchema,          // zod; strict JSON on Groq
 *     messages: [{ role: "system", content: "..." }, { role: "user", content: text }],
 *     cacheKey: resumeHash,                 // optional
 *   });
 *
 * Handles: Groq-first model routing with fallback, per-model rate limiting
 * from Groq headers, strict structured outputs + zod validation, Redis
 * caching, and AiRun telemetry (see GET /api/v1/admin/ai/stats).
 */
import mongoose from "mongoose";
import cache from "../../utils/cache.js";
import logger, { getLogContext } from "../../utils/logger.js";
import { AiRun } from "../../models/aiRun.model.js";
import { createAiGateway } from "./gateway.js";
import { ModelRateLimiter } from "./rateLimiter.js";
import { createGroqProvider, createGeminiProvider } from "./providers.js";

export { AiGatewayError } from "./gateway.js";
export { RateLimitedError } from "./rateLimiter.js";

const recordRun = (run) => {
  // Skip when disconnected: mongoose would buffer the write for 10s
  if (mongoose.connection.readyState !== 1) return;
  AiRun.create(run).catch((error) =>
    logger.warn("Failed to record AI run", { error: error.message }),
  );
};

let instance = null;

const getGateway = () => {
  instance ??= createAiGateway({
    providers: {
      groq: createGroqProvider(),
      gemini: createGeminiProvider(),
    },
    limiter: new ModelRateLimiter(),
    cache,
    recordRun,
    getContext: getLogContext,
    logger,
  });
  return instance;
};

const ai = {
  run: (options) => getGateway().run(options),
  limiterSnapshot: () => getGateway().limiterSnapshot(),
};

export default ai;
