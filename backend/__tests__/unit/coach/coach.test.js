import { runCoachTurn, MAX_STEPS } from "../../../modules/coach/agent.js";
import { toolByName, toolDefinitions } from "../../../modules/coach/tools.js";
import { createAiGateway } from "../../../platform/ai-gateway/gateway.js";
import { ModelRateLimiter } from "../../../platform/ai-gateway/rateLimiter.js";
import { assignIds } from "../../../modules/resume-intel/profile.js";
import { computeSignals } from "../../../modules/resume-intel/signals.js";
import { computeScore } from "../../../modules/resume-intel/score.js";
import { verifyMatches } from "../../../modules/resume-intel/verify.js";
import { buildItemIndex } from "../../../modules/resume-intel/profile.js";
import {
  backendExtraction,
  backendMatches,
} from "../../../tests/fixtures/resumeIntelOutputs.js";

const NOW = new Date("2026-10-01T00:00:00Z");

/** A completed report built from the fixtures with the real pipeline pieces. */
const makeReport = () => {
  const profile = assignIds(backendExtraction);
  const resumeText = [
    "Jordan Reyes jordan.reyes@example.com +1 555 010 2233 github.com/x",
    ...profile.experience.flatMap((r) => r.bullets.map((b) => b.text)),
  ].join("\n");
  const signals = computeSignals(profile, resumeText, { now: NOW });
  const job = {
    title: "Backend Engineer",
    minYears: 3,
    requirements: [
      { id: "req_1", text: "3+ years backend", kind: "must", skills: [] },
      { id: "req_2", text: "Node.js and TypeScript", kind: "must", skills: [] },
      { id: "req_3", text: "PostgreSQL", kind: "must", skills: [] },
      { id: "req_4", text: "Kubernetes", kind: "nice", skills: [] },
    ],
  };
  const { matches } = verifyMatches(
    backendMatches.matches,
    job.requirements,
    buildItemIndex(profile),
  );
  return {
    report: {
      profile,
      signals,
      job,
      matches,
      score: computeScore(signals, job, matches),
      flags: [],
      warnings: [],
    },
    resumeText,
  };
};

/** Scripted gateway: each call returns the next scripted response. */
const scriptedAi = (script) => {
  const calls = [];
  return {
    calls,
    run: async (options) => {
      calls.push(structuredClone(options));
      const next = script[calls.length - 1];
      if (!next) throw new Error("script exhausted");
      return { content: "", toolCalls: [], model: "fake", ...next };
    },
  };
};

const toolCall = (id, name, args) => ({
  id,
  name,
  arguments: typeof args === "string" ? args : JSON.stringify(args),
});

describe("coach tools", () => {
  const { report, resumeText } = makeReport();
  const ctx = { report, resumeText };

  it("exposes OpenAI-style function definitions without $schema", () => {
    expect(toolDefinitions.map((d) => d.function.name)).toEqual([
      "get_report_overview",
      "get_requirements",
      "get_resume_items",
      "get_ats_checks",
      "what_if_rescore",
      "search_jobs",
    ]);
    for (const d of toolDefinitions) {
      expect(d.type).toBe("function");
      expect(d.function.parameters.type).toBe("object");
      expect(d.function.parameters.$schema).toBeUndefined();
    }
  });

  it("filters requirements and lists unquantified bullets", async () => {
    const missing = await toolByName
      .get("get_requirements")
      .run({ status: "missing" }, ctx);
    expect(missing.requirements.map((r) => r.id)).toEqual(["req_4"]);

    const items = await toolByName
      .get("get_resume_items")
      .run({ ids: null, kind: null, unquantifiedOnly: true }, ctx);
    expect(items.items.map((i) => i.id)).toEqual(
      report.signals.impact.unquantifiedBulletIds,
    );
  });

  it("re-scores deterministically when bullets gain metrics", async () => {
    const weakBullets = report.signals.impact.unquantifiedBulletIds.slice(0, 3);
    const result = await toolByName.get("what_if_rescore").run(
      {
        bulletEdits: [
          ...weakBullets.map((itemId) => ({
            itemId,
            text: "Reduced incident volume by 40% across 12 services",
          })),
          { itemId: "exp_1", text: "a role, not a bullet" },
        ],
        addSkills: [],
      },
      ctx,
    );
    expect(result.before).toBe(report.score.overall);
    expect(result.after).toBeGreaterThanOrEqual(result.before);
    expect(result.applied).toEqual(weakBullets);
    expect(result.rejected).toEqual([
      { itemId: "exp_1", reason: "not a bullet id" },
    ]);
    // The stored report is untouched
    expect(report.profile.experience[0].bullets[0].text).not.toMatch(
      /incident volume/,
    );
    expect(toolByName.get("what_if_rescore").summarize({}, result)).toBe(
      `Re-scored: ${result.before} → ${result.after}`,
    );
  });
});

describe("what_if_rescore on a weak resume", () => {
  it("raises the score when unquantified bullets gain metrics", async () => {
    const { report, resumeText } = makeReport();
    // Strip every number so no bullet counts as quantified
    for (const role of report.profile.experience) {
      for (const b of role.bullets)
        b.text = b.text.replace(/[\d,.%]+/g, "").trim();
    }
    const text = resumeText.replace(/\d/g, "");
    report.signals = computeSignals(report.profile, text, { now: NOW });
    report.score = computeScore(report.signals, report.job, report.matches);
    expect(report.signals.impact.quantified).toBe(0);

    const edits = report.signals.impact.unquantifiedBulletIds
      .slice(0, 4)
      .map((itemId) => ({
        itemId,
        text: "Cut p95 latency by 60% for 12,000 daily users",
      }));
    const result = await toolByName
      .get("what_if_rescore")
      .run({ bulletEdits: edits, addSkills: [] }, { report, resumeText: text });

    expect(result.after).toBeGreaterThan(result.before);
    const impact = result.components.find((c) => c.id === "impact");
    expect(impact.after).toBeGreaterThan(impact.before);
  });
});

describe("runCoachTurn", () => {
  it("runs tools the model asks for and returns the final reply with a trace", async () => {
    const { report, resumeText } = makeReport();
    const ai = scriptedAi([
      {
        toolCalls: [
          toolCall("c1", "get_report_overview", {}),
          toolCall("c2", "get_requirements", { status: "missing" }),
        ],
      },
      { content: "Add Kubernetes experience first." },
    ]);

    const turn = await runCoachTurn({
      ai,
      report,
      resumeText,
      history: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      message: "What should I fix?",
    });

    expect(turn.reply).toBe("Add Kubernetes experience first.");
    expect(turn.trace).toEqual([
      { tool: "get_report_overview", summary: "Read the report overview" },
      { tool: "get_requirements", summary: "Checked missing requirements" },
    ]);

    const second = ai.calls[1].messages;
    expect(second.map((m) => m.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
      "assistant",
      "tool",
      "tool",
    ]);
    expect(second[4].tool_calls[1]).toMatchObject({
      id: "c2",
      type: "function",
      function: { name: "get_requirements" },
    });
    expect(second[5].tool_call_id).toBe("c1");
    expect(JSON.parse(second[6].content).requirements[0].id).toBe("req_4");
    expect(ai.calls[0].tools).toHaveLength(6);
  });

  it("reports bad tool calls back to the model instead of failing", async () => {
    const { report } = makeReport();
    const ai = scriptedAi([
      {
        toolCalls: [
          toolCall("a", "delete_everything", {}),
          toolCall("b", "get_requirements", "{not json"),
          toolCall("c", "search_jobs", { query: "x" }),
        ],
      },
      { content: "Done." },
    ]);
    const turn = await runCoachTurn({ ai, report, message: "go" });

    const results = ai.calls[1].messages
      .filter((m) => m.role === "tool")
      .map((m) => JSON.parse(m.content).error);
    expect(results[0]).toMatch(/Unknown tool/);
    expect(results[1]).toMatch(/not valid JSON/);
    expect(results[2]).toMatch(/Invalid arguments: query/);
    expect(turn.reply).toBe("Done.");
  });

  it("forces a final answer without tools after MAX_STEPS", async () => {
    const { report } = makeReport();
    const loop = { toolCalls: [toolCall("x", "get_ats_checks", {})] };
    const ai = scriptedAi([
      ...Array(MAX_STEPS).fill(loop),
      { content: "Here is what I found." },
    ]);
    const turn = await runCoachTurn({ ai, report, message: "go" });

    expect(turn.reply).toBe("Here is what I found.");
    expect(ai.calls).toHaveLength(MAX_STEPS + 1);
    expect(ai.calls.at(-1).toolChoice).toBe("none");
    expect(turn.trace).toHaveLength(MAX_STEPS);
  });
});

describe("gateway tool calls", () => {
  const provider = (name, { tools }) => {
    const calls = [];
    return {
      calls,
      isConfigured: () => true,
      supportsStrictSchema: () => false,
      supportsTools: () => tools,
      complete: async (request) => {
        calls.push(request);
        return {
          content: "",
          toolCalls: [{ id: "1", name: "get_ats_checks", arguments: "{}" }],
          usage: {},
          headers: {},
        };
      },
    };
  };

  it("only routes tool chats to tool-capable providers and returns tool calls", async () => {
    const gemini = provider("gemini", { tools: false });
    const groq = provider("groq", { tools: true });
    const gateway = createAiGateway({
      providers: { gemini, groq },
      limiter: new ModelRateLimiter(),
      routes: () => ({
        fast: [
          { provider: "gemini", model: "g" },
          { provider: "groq", model: "q" },
        ],
      }),
    });

    const result = await gateway.run({
      task: "t",
      messages: [{ role: "user", content: "hi" }],
      tools: toolDefinitions,
      toolChoice: "none",
    });
    expect(gemini.calls).toHaveLength(0);
    expect(groq.calls[0]).toMatchObject({ toolChoice: "none" });
    expect(result.toolCalls).toEqual([
      { id: "1", name: "get_ats_checks", arguments: "{}" },
    ]);

    await expect(
      gateway.run({
        task: "t",
        messages: [{ role: "user", content: "hi" }],
        tools: toolDefinitions,
        json: true,
      }),
    ).rejects.toThrow(/can't be combined/);
  });
});
