import { z } from "zod";
import {
  createAiGateway,
  AiGatewayError,
} from "../../../platform/ai-gateway/gateway.js";
import {
  ModelRateLimiter,
  RateLimitedError,
  parseDuration,
} from "../../../platform/ai-gateway/rateLimiter.js";
import { toStrictJsonSchema } from "../../../platform/ai-gateway/strictSchema.js";

const ProfileSchema = z.object({
  name: z.string(),
  years: z.number().nullable(),
  skills: z.array(
    z.object({ name: z.string(), level: z.enum(["low", "high"]) }),
  ),
});

const messages = [{ role: "user", content: "Extract the profile" }];
const goodJson = JSON.stringify({
  name: "Ada",
  years: 3,
  skills: [{ name: "Go", level: "high" }],
});

/** Fake provider: replies come from a queue of functions or values. */
const fakeProvider = (name, replies, { configured = true } = {}) => {
  const calls = [];
  return {
    name,
    calls,
    isConfigured: () => configured,
    supportsStrictSchema: () => true,
    async complete(request) {
      calls.push(request);
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return typeof next === "function"
        ? next(request)
        : {
            content: next,
            usage: { inputTokens: 10, outputTokens: 5 },
            headers: {},
          };
    },
  };
};

const routes = () => ({
  fast: [
    { provider: "groq", model: "groq-fast" },
    { provider: "groq", model: "groq-big" },
    { provider: "gemini", model: "gemini-flash" },
  ],
  reasoning: [{ provider: "groq", model: "groq-big" }],
});

const makeGateway = (providers, extra = {}) => {
  const runs = [];
  const gateway = createAiGateway({
    providers,
    limiter: new ModelRateLimiter({ sleep: async () => {} }),
    recordRun: (run) => runs.push(run),
    getContext: () => ({ requestId: "req-1", userId: "user-1" }),
    routes,
    ...extra,
  });
  return { gateway, runs };
};

describe("toStrictJsonSchema", () => {
  it("closes every object and requires every property", () => {
    const schema = toStrictJsonSchema(ProfileSchema);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["name", "years", "skills"]);
    const item = schema.properties.skills.items;
    expect(item.additionalProperties).toBe(false);
    expect(item.required).toEqual(["name", "level"]);
    expect(schema.$schema).toBeUndefined();
  });

  it("rejects optional properties", () => {
    expect(() =>
      toStrictJsonSchema(z.object({ a: z.string().optional() })),
    ).toThrow(/use \.nullable\(\)/);
  });
});

describe("parseDuration", () => {
  it.each([
    ["7.66s", 7660],
    ["2m59.56s", 179560],
    ["1h2m3s", 3723000],
    ["350ms", 350],
    ["2", 2000],
    ["", null],
  ])("parses %s", (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });
});

describe("ModelRateLimiter", () => {
  it("waits for the token window when the budget is short", async () => {
    let clock = 0;
    const slept = [];
    const limiter = new ModelRateLimiter({
      now: () => clock,
      sleep: async (ms) => {
        slept.push(ms);
        clock += ms;
      },
    });
    limiter.update("m", {
      "x-ratelimit-remaining-tokens": "100",
      "x-ratelimit-reset-tokens": "5s",
    });
    await limiter.acquire("m", 500);
    expect(slept).toEqual([5000]);
  });

  it("fails fast when the wait is too long or the daily cap is hit", async () => {
    const limiter = new ModelRateLimiter({ now: () => 0 });
    limiter.update("m", {
      "x-ratelimit-remaining-tokens": "0",
      "x-ratelimit-reset-tokens": "50s",
    });
    await expect(limiter.acquire("m", 10)).rejects.toBeInstanceOf(
      RateLimitedError,
    );

    limiter.update("d", {
      "x-ratelimit-remaining-requests": "0",
      "x-ratelimit-reset-requests": "3h",
    });
    await expect(limiter.acquire("d", 1)).rejects.toThrow(/daily/);
  });

  it("honours retry-after", async () => {
    const limiter = new ModelRateLimiter({ now: () => 0 });
    limiter.update("m", { "retry-after": "120" });
    await expect(limiter.acquire("m", 1)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
  });
});

describe("createAiGateway", () => {
  it("returns validated data from the first model and records telemetry", async () => {
    const groq = fakeProvider("groq", [goodJson]);
    const { gateway, runs } = makeGateway({ groq });

    const result = await gateway.run({
      task: "test.extract",
      messages,
      schema: ProfileSchema,
    });

    expect(result.data.name).toBe("Ada");
    expect(result.model).toBe("groq-fast");
    expect(result.degraded).toBe(false);
    expect(groq.calls[0].jsonSchema.additionalProperties).toBe(false);
    expect(groq.calls[0].schemaName).toBe("test_extract");
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      task: "test.extract",
      status: "success",
      model: "groq-fast",
      requestId: "req-1",
      userId: "user-1",
      inputTokens: 10,
    });
  });

  it("falls back when output fails validation, marking the result degraded", async () => {
    const groq = fakeProvider("groq", ['{"name": 1}', goodJson]);
    const { gateway, runs } = makeGateway({ groq });

    const result = await gateway.run({
      task: "t",
      messages,
      schema: ProfileSchema,
    });

    expect(result.model).toBe("groq-big");
    expect(result.degraded).toBe(true);
    expect(runs[0].attempts.map((a) => a.ok)).toEqual([false, true]);
    expect(runs[0].attempts[0].error).toMatch(/Schema validation failed/);
  });

  it("skips unconfigured providers and parses JSON wrapped in prose", async () => {
    const groq = fakeProvider("groq", [], { configured: false });
    const gemini = fakeProvider("gemini", [
      "Here you go:\n```json\n" + goodJson + "\n```",
    ]);
    const { gateway } = makeGateway({ groq, gemini });

    const result = await gateway.run({
      task: "t",
      messages,
      schema: ProfileSchema,
    });
    expect(result.provider).toBe("gemini");
    expect(result.data.skills[0].name).toBe("Go");
  });

  it("updates the limiter from headers, including on 429 errors", async () => {
    const rateLimited = Object.assign(new Error("Too many requests"), {
      status: 429,
      headers: { "retry-after": "600" },
    });
    const groq = fakeProvider("groq", [rateLimited, goodJson, goodJson]);
    const { gateway } = makeGateway({ groq });

    await gateway.run({ task: "t", messages, schema: ProfileSchema });
    // groq-fast is now blocked for 10 minutes, so the next call skips it
    const second = await gateway.run({
      task: "t",
      messages,
      schema: ProfileSchema,
    });
    expect(second.model).toBe("groq-big");
    expect(groq.calls.map((c) => c.model)).toEqual([
      "groq-fast",
      "groq-big",
      "groq-big",
    ]);
  });

  it("serves repeat calls with the same cacheKey from cache", async () => {
    const store = new Map();
    const cache = {
      get: async (k) => store.get(k) ?? null,
      set: async (k, v) => store.set(k, v),
    };
    const groq = fakeProvider("groq", [goodJson]);
    const { gateway, runs } = makeGateway({ groq }, { cache });
    const options = {
      task: "t",
      messages,
      schema: ProfileSchema,
      cacheKey: "resume-hash",
    };

    await gateway.run(options);
    const second = await gateway.run(options);

    expect(groq.calls).toHaveLength(1);
    expect(second.cached).toBe(true);
    expect(second.data.name).toBe("Ada");
    expect(runs.map((r) => r.cached)).toEqual([false, true]);
  });

  it("throws AiGatewayError listing every attempt when all models fail", async () => {
    const groq = fakeProvider("groq", [new Error("boom"), new Error("down")]);
    const gemini = fakeProvider("gemini", ["not json at all"]);
    const { gateway, runs } = makeGateway({ groq, gemini });

    const error = await gateway
      .run({ task: "t", messages, schema: ProfileSchema })
      .catch((e) => e);

    expect(error).toBeInstanceOf(AiGatewayError);
    expect(error.attempts).toHaveLength(3);
    expect(runs[0].status).toBe("error");
  });

  it("returns plain text and JSON-mode results without a schema", async () => {
    const groq = fakeProvider("groq", ["hello", '{"ok":true}']);
    const { gateway } = makeGateway({ groq });

    const text = await gateway.run({ task: "t", messages });
    expect(text.content).toBe("hello");
    expect(text.data).toBeUndefined();

    const json = await gateway.run({ task: "t", messages, json: true });
    expect(json.data).toEqual({ ok: true });
    expect(groq.calls[1].json).toBe(true);
  });

  it("uses an explicit model chain when given", async () => {
    const groq = fakeProvider("groq", ["hi"]);
    const { gateway } = makeGateway({ groq });
    const result = await gateway.run({
      task: "t",
      messages,
      models: [{ provider: "groq", model: "custom" }],
    });
    expect(result.model).toBe("custom");
  });
});
