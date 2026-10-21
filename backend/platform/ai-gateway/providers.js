import Groq from "groq-sdk";
import {
  geminiGenerateUrl,
  geminiHeaders,
  geminiThinkingConfig,
  groqModelParams,
} from "../../config/aiModels.js";

/**
 * Provider adapters. Each exposes:
 *   name, isConfigured(), supportsStrictSchema(model)
 *   complete({ model, messages, jsonSchema, schemaName, json, maxOutputTokens,
 *              temperature }) -> { content, usage, headers }
 * Errors carry `.headers` when the provider returned rate-limit headers.
 */

// Models with Groq constrained decoding (strict json_schema)
const GROQ_STRICT_MODELS = new Set([
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "meta-models/muse-spark-open",
]);

export const createGroqProvider = ({
  apiKey = process.env.GROQ_API_KEY,
  client,
} = {}) => {
  let groq = client;
  const getClient = () => {
    // Our limiter handles rate limits; one SDK retry covers transient errors
    groq ??= new Groq({ apiKey, maxRetries: 1, timeout: 60_000 });
    return groq;
  };

  return {
    name: "groq",
    isConfigured: () => Boolean(client || apiKey),
    supportsStrictSchema: (model) => GROQ_STRICT_MODELS.has(model),

    async complete({
      model,
      messages,
      jsonSchema,
      schemaName,
      json,
      maxOutputTokens,
      temperature,
    }) {
      const body = {
        model,
        messages,
        temperature,
        max_completion_tokens: maxOutputTokens,
        ...groqModelParams(model),
      };
      if (jsonSchema && GROQ_STRICT_MODELS.has(model)) {
        body.response_format = {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema: jsonSchema },
        };
      } else if (jsonSchema || json) {
        body.response_format = { type: "json_object" };
      }

      // On failure the SDK's APIError already carries .headers (incl. retry-after)
      const { data, response } = await getClient()
        .chat.completions.create(body)
        .withResponse();
      const choice = data.choices?.[0];
      return {
        content: choice?.message?.content ?? "",
        finishReason: choice?.finish_reason,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
        headers: response.headers,
      };
    },
  };
};

export const createGeminiProvider = ({
  apiKey = process.env.GEMINI_API_KEY,
  fetchImpl = fetch,
} = {}) => ({
  name: "gemini",
  isConfigured: () => Boolean(apiKey),
  supportsStrictSchema: () => false,

  async complete({
    model,
    messages,
    jsonSchema,
    json,
    maxOutputTokens,
    temperature,
  }) {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content);
    if (jsonSchema) {
      system.push(
        `Respond only with JSON that matches this JSON Schema:\n${JSON.stringify(jsonSchema)}`,
      );
    }
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const response = await fetchImpl(geminiGenerateUrl(model), {
      method: "POST",
      headers: { ...geminiHeaders(), "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...(system.length && {
          systemInstruction: { parts: [{ text: system.join("\n\n") }] },
        }),
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens,
          thinkingConfig: geminiThinkingConfig(model),
          ...((jsonSchema || json) && {
            responseMimeType: "application/json",
          }),
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const error = new Error(
        data.error?.message || `Gemini request failed (${response.status})`,
      );
      error.status = response.status;
      error.headers = response.headers;
      throw error;
    }

    const candidate = data.candidates?.[0];
    return {
      content:
        candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "",
      finishReason: candidate?.finishReason,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      headers: response.headers,
    };
  },
});
