import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseDateRange,
  monthsBetween,
  summarizeIntervals,
} from "../../../modules/resume-intel/dates.js";
import {
  normalizeSkill,
  normalizeSkills,
  findSkillsInText,
} from "../../../modules/resume-intel/taxonomy.js";
import {
  screenResume,
  parseGuardOutput,
  detectKeywordStuffing,
} from "../../../modules/resume-intel/guard.js";
import {
  extractResume,
  normalizeText,
  ExtractionError,
} from "../../../modules/resume-intel/extract.js";
import {
  computeSignals,
  isQuantified,
  startsWithActionVerb,
} from "../../../modules/resume-intel/signals.js";
import { computeScore, bandFor } from "../../../modules/resume-intel/score.js";
import {
  assignIds,
  buildItemIndex,
  renderProfileForPrompt,
} from "../../../modules/resume-intel/profile.js";
import {
  quoteIsGrounded,
  verifyMatches,
  verifyCritique,
} from "../../../modules/resume-intel/verify.js";
import { backendExtraction } from "../../../tests/fixtures/resumeIntelOutputs.js";

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../evals/resume-intel/fixtures",
);
const readFixture = (name) =>
  fs.readFileSync(path.join(fixtureDir, name), "utf8");

const NOW = new Date("2026-10-01T00:00:00Z");

describe("dates", () => {
  it.each([
    ["Mar 2023 – Present", { y: 2023, m: 3 }, null],
    ["Jun 2021 – Feb 2023", { y: 2021, m: 6 }, { y: 2023, m: 2 }],
    ["September 2022 - Present", { y: 2022, m: 9 }, null],
    ["2017 – 2021", { y: 2017, m: 1 }, { y: 2021, m: 12 }],
    ["01/2020 to 06/2020", { y: 2020, m: 1 }, { y: 2020, m: 6 }],
    ["2019-04 — 2020-01", { y: 2019, m: 4 }, { y: 2020, m: 1 }],
  ])("parses %s", (text, start, end) => {
    const parsed = parseDateRange(text);
    expect(parsed.start).toEqual(start);
    expect(parsed.end).toEqual(end);
  });

  it("returns null without a date", () => {
    expect(parseDateRange("Summer internship")).toBeNull();
    expect(parseDateRange(null)).toBeNull();
  });

  it("counts inclusive months and treats null end as now", () => {
    expect(monthsBetween({ y: 2021, m: 6 }, { y: 2023, m: 2 })).toBe(21);
    expect(monthsBetween({ y: 2026, m: 1 }, null, NOW)).toBe(10);
  });

  it("merges overlapping roles and reports long gaps", () => {
    const { totalMonths, gaps } = summarizeIntervals(
      [
        { id: "a", start: { y: 2018, m: 1 }, end: { y: 2018, m: 12 } },
        { id: "b", start: { y: 2018, m: 6 }, end: { y: 2019, m: 6 } },
        { id: "c", start: { y: 2020, m: 6 }, end: { y: 2020, m: 12 } },
      ],
      { now: NOW },
    );
    expect(totalMonths).toBe(18 + 7);
    expect(gaps).toEqual([{ afterId: "b", beforeId: "c", months: 11 }]);
  });
});

describe("taxonomy", () => {
  it("normalizes aliases to canonical skills with families", () => {
    expect(normalizeSkill("reactjs")).toEqual({
      canonical: "React",
      family: "frontend",
    });
    expect(normalizeSkill("Postgres").canonical).toBe("PostgreSQL");
    expect(normalizeSkill("Quantum Basket Weaving")).toEqual({
      canonical: "Quantum Basket Weaving",
      family: null,
    });
  });

  it("de-duplicates aliases", () => {
    expect(
      normalizeSkills(["Node", "node.js", "NodeJS", "k8s", "Kubernetes"]).map(
        (s) => s.canonical,
      ),
    ).toEqual(["Node.js", "Kubernetes"]);
  });

  it("finds skills in prose without matching inside other words", () => {
    const found = findSkillsInText(
      "Built APIs in Express and TypeScript, deployed with Docker on AWS. Excellent go-getter.",
    ).map((s) => s.canonical);
    expect(found).toEqual(
      expect.arrayContaining(["Express", "TypeScript", "Docker", "AWS"]),
    );
    expect(found).not.toContain("Java");
  });
});

describe("extract", () => {
  it("normalizes whitespace but keeps line structure", () => {
    expect(normalizeText("A\u0000  B\r\n\r\n\r\n\r\n• C  ")).toBe("A B\n\n• C");
  });

  it("accepts pasted text and hashes it", async () => {
    const result = await extractResume({
      text: readFixture("resumes/backend_mid.txt"),
    });
    expect(result.format).toBe("text");
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.truncated).toBe(false);
  });

  it("rejects short or unsupported input with codes", async () => {
    await expect(extractResume({ text: "too short" })).rejects.toMatchObject({
      code: "TOO_SHORT",
    });
    await expect(
      extractResume({ buffer: Buffer.from("x"), mimetype: "image/png" }),
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  it("truncates very long resumes and says so", async () => {
    const result = await extractResume({ text: "word ".repeat(5000) });
    expect(result.truncated).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/Only the first/);
  });
});

describe("guard", () => {
  it("removes lines addressed to AI screeners and flags them", async () => {
    const { text, flags, classifier } = await screenResume(
      readFixture("resumes/injection.txt"),
    );
    expect(classifier).toBe("off");
    expect(text).not.toMatch(/ignore all previous instructions/i);
    expect(text).toMatch(/\[removed: text addressed to automated screeners\]/);
    expect(flags[0]).toMatchObject({
      type: "prompt_injection",
      severity: "high",
    });
  });

  it("leaves ordinary ML resumes alone", async () => {
    const { flags } = await screenResume(
      "Trained transformer models and wrote prompts for an LLM evaluation pipeline.\nImproved model accuracy by 12%.",
    );
    expect(flags).toEqual([]);
  });

  it("detects keyword stuffing", () => {
    const text = `${"Python ".repeat(40)} ${"built data pipelines and dashboards for teams ".repeat(30)}`;
    expect(detectKeywordStuffing(text)).toMatchObject({ term: "python" });
  });

  it.each([
    ["0.9987", 0.9987],
    ["Score: 0.02", 0.02],
    ["1", 1],
    ["MALICIOUS", 1],
    ["benign", 0],
    ["¯\\_(ツ)_/¯", null],
  ])("parses classifier output %s", (content, expected) => {
    expect(parseGuardOutput(content)).toBe(expected);
  });

  it("uses the classifier as a review flag only", async () => {
    const original = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "test";
    try {
      const ai = { run: async () => ({ content: "0.97" }) };
      const { flags, classifier, text } = await screenResume(
        "Built a model-serving API.\nMore ordinary resume text here.",
        { ai },
      );
      expect(classifier).toBe("used");
      expect(flags[0].type).toBe("possible_prompt_injection");
      expect(text).toMatch(/model-serving API/);
    } finally {
      if (original === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = original;
    }
  });
});

describe("profile, signals and score", () => {
  const profile = assignIds(backendExtraction);
  const text = readFixture("resumes/backend_mid.txt");

  it("assigns stable ids and parses role dates", () => {
    expect(profile.experience.map((r) => r.id)).toEqual([
      "exp_1",
      "exp_2",
      "exp_3",
    ]);
    expect(profile.experience[0].bullets[0].id).toBe("exp_1.b1");
    expect(profile.experience[0].start).toEqual({ y: 2023, m: 3 });
    expect(profile.experience[0].end).toBeNull();
    expect(profile.projects[0].id).toBe("proj_1");
  });

  it("indexes every citable item and renders ids for prompts", () => {
    const items = buildItemIndex(profile);
    expect(items.get("exp_2.b1").text).toMatch(/REST APIs in Express/);
    expect(items.get("exp_1").text).toMatch(/Parcelwise/);
    expect(renderProfileForPrompt(profile)).toMatch(
      /\[exp_1\.b2\] Designed PostgreSQL/,
    );
  });

  it("computes experience, impact and ATS signals deterministically", () => {
    const signals = computeSignals(profile, text, { now: NOW });
    // Mar 2023–Oct 2026 (44) + Jun 2021–Feb 2023 (21) + Jun–Aug 2020 (3)
    expect(signals.experience.totalMonths).toBe(68);
    expect(signals.experience.gaps).toHaveLength(1);
    expect(signals.impact.bullets).toBe(9);
    expect(signals.impact.quantified).toBe(5);
    expect(signals.ats.checks.find((c) => c.id === "email").passed).toBe(true);
    const postgres = signals.skills.find((s) => s.name === "PostgreSQL");
    expect(postgres.evidence).toEqual(
      expect.arrayContaining(["exp_1", "proj_1"]),
    );
  });

  it("scores deterministically in both modes", () => {
    const signals = computeSignals(profile, text, { now: NOW });
    const general = computeScore(signals);
    expect(general.mode).toBe("profile-strength");
    expect(computeScore(signals)).toEqual(general);

    const job = {
      minYears: 3,
      requirements: [
        { id: "req_1", kind: "must" },
        { id: "req_2", kind: "must" },
        { id: "req_3", kind: "nice" },
      ],
    };
    const allMet = computeScore(signals, job, [
      { requirementId: "req_1", status: "met" },
      { requirementId: "req_2", status: "met" },
      { requirementId: "req_3", status: "met" },
    ]);
    const someMissing = computeScore(signals, job, [
      { requirementId: "req_1", status: "met" },
      { requirementId: "req_2", status: "partial" },
    ]);
    expect(allMet.mode).toBe("job-match");
    expect(allMet.components[0].value).toBe(1);
    // (2*1 + 2*0.5 + 1*0) / 5
    expect(someMissing.components[0].value).toBe(0.6);
    expect(allMet.overall).toBeGreaterThan(someMissing.overall);
  });

  it.each([
    [85, "Excellent"],
    [70, "Good"],
    [55, "Fair"],
    [10, "Poor"],
  ])("bands %i as %s", (score, band) => {
    expect(bandFor(score)).toBe(band);
  });

  it("recognizes quantified bullets and action verbs", () => {
    expect(isQuantified("cut latency by 40%")).toBe(true);
    expect(isQuantified("used by 12,000 businesses")).toBe(true);
    expect(isQuantified("worked on the checkout flow")).toBe(false);
    expect(startsWithActionVerb("• Led the migration")).toBe(true);
    expect(startsWithActionVerb("Responsible for CSS")).toBe(false);
  });
});

describe("verifier", () => {
  const items = buildItemIndex(assignIds(backendExtraction));

  it("accepts exact and lightly reworded quotes, rejects invented ones", () => {
    const source = items.get("exp_1.b1").text;
    expect(
      quoteIsGrounded("cutting p95 latency from 820ms to 190ms", source),
    ).toBe(true);
    expect(
      quoteIsGrounded("Led migration of the shipment tracking API", source),
    ).toBe(true);
    expect(
      quoteIsGrounded("managed a Kubernetes cluster of 200 nodes", source),
    ).toBe(false);
  });

  it("downgrades unsupported matches and fills skipped requirements", () => {
    const requirements = [
      { id: "req_1", text: "Node.js" },
      { id: "req_2", text: "Kubernetes" },
      { id: "req_3", text: "Mentoring" },
    ];
    const { matches, downgraded } = verifyMatches(
      [
        {
          requirementId: "req_1",
          status: "met",
          evidence: [{ itemId: "exp_1.b1", quote: "6 Node.js microservices" }],
          rationale: "ok",
        },
        {
          requirementId: "req_2",
          status: "met",
          evidence: [
            { itemId: "exp_1.b3", quote: "managed Kubernetes clusters" },
          ],
          rationale: "hallucinated",
        },
        {
          requirementId: "req_99",
          status: "met",
          evidence: [],
          rationale: "unknown id",
        },
      ],
      requirements,
      items,
    );
    expect(matches.map((m) => m.status)).toEqual(["met", "missing", "missing"]);
    expect(matches[1].downgradedFrom).toBe("met");
    expect(matches[1].rationale).toMatch(/No evidence .* verified/);
    expect(matches[2].rationale).toBe("Not assessed.");
    expect(downgraded).toBe(1);
  });

  it("drops ungrounded strengths and takes rewrite 'before' from the resume", () => {
    const { critique, checked, dropped } = verifyCritique(
      {
        summary: "s",
        strengths: [
          {
            text: "Owns PostgreSQL design",
            evidence: [
              {
                itemId: "exp_1.b2",
                quote: "Designed PostgreSQL schemas and partitioning",
              },
            ],
          },
          { text: "Invented", evidence: [{ itemId: "exp_9", quote: "nope" }] },
        ],
        gaps: [
          {
            text: "No Kubernetes",
            requirementId: "req_404",
            suggestion: "learn",
          },
        ],
        rewrites: [
          {
            itemId: "exp_3.b1",
            after: "Built X used by [N] staff",
            why: "impact",
          },
          { itemId: "exp_1", after: "role, not a bullet", why: "bad" },
        ],
        quickWins: ["a"],
        interviewQuestions: [],
        learningPath: [],
      },
      items,
      [{ id: "req_1" }],
    );
    expect(critique.strengths).toHaveLength(1);
    expect(critique.rewrites).toHaveLength(1);
    expect(critique.rewrites[0].before).toMatch(/internal admin dashboard API/);
    expect(critique.gaps[0].requirementId).toBeNull();
    expect({ checked, dropped }).toEqual({ checked: 4, dropped: 2 });
  });
});
