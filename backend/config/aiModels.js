/**
 * LLM model registry - single source of truth for provider model IDs.
 *
 * Providers retire models regularly (Gemini 1.5, Groq Mixtral and the Groq
 * Llama 3.x free-tier models are all gone), so call sites import IDs from
 * here and each can be overridden with an env var without a code change.
 */
import dotenv from "dotenv";

// Loaded here too because ES module imports run before index.js calls dotenv
dotenv.config();

export const GROQ_MODELS = {
  // Strongest Groq production model; replaces llama-3.3-70b-versatile
  REASONING: process.env.GROQ_MODEL_REASONING || "openai/gpt-oss-120b",
  // Fast/cheap Groq production model; replaces llama-3.1-8b-instant and mixtral
  FAST: process.env.GROQ_MODEL_FAST || "openai/gpt-oss-20b",
};

export const GEMINI_MODELS = {
  // Fast, low-cost stable model; replaces gemini-1.5-flash
  FLASH: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  // More capable stable model; replaces gemini-1.5-pro
  PRO: process.env.GEMINI_MODEL_PRO || "gemini-3.8-flash",
};

// Speech-to-text for live interview transcripts (Groq Whisper)
export const TRANSCRIPTION_MODEL = process.env.GROQ_MODEL_TRANSCRIBE || "whisper-large-v3-turbo";

// Groq has no embedding models; semantic search uses Gemini embeddings
export const EMBEDDING_MODEL = {
  ID: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
  DIMENSIONS: Number(process.env.EMBEDDING_DIMENSIONS) || 768,
};

export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const geminiGenerateUrl = (model = GEMINI_MODELS.FLASH) =>
  `${GEMINI_API_BASE}/${model}:generateContent`;

// Key goes in a header, not the ?key= query string, so it stays out of logs
export const geminiHeaders = () => ({
  "Content-Type": "application/json",
  "x-goog-api-key": process.env.GEMINI_API_KEY || "",
});

/**
 * Gemini 3.x models think by default and maxOutputTokens includes thought
 * tokens, so small budgets can come back empty. Keep thinking at the lowest
 * level each model accepts. Returns undefined for other model families.
 */
export const geminiThinkingConfig = (model = GEMINI_MODELS.FLASH) => {
  if (!model.startsWith("gemini-3")) return undefined;
  return { thinkingLevel: model.includes("flash-lite") ? "minimal" : "low" };
};

/**
 * Extra request params for Groq models. gpt-oss models are reasoning models;
 * low effort keeps latency and token use close to the old non-reasoning models.
 */
export const groqModelParams = (model) =>
  model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {};
