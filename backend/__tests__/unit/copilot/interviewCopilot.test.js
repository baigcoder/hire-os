import { cleanSegments } from "../../../modules/copilot/transcribe.js";
import {
  verifyTranscriptEvidence,
  mergeCoverage,
  filterFollowUps,
  ruleBasedFollowUps,
  runCopilot,
  draftRatings,
  PROTECTED_TOPICS,
} from "../../../modules/copilot/copilot.js";
import { generateScorecard, pickRequirements } from "../../../modules/copilot/scorecard.js";

const seg = (id, speaker, text) => ({ _id: id, speaker, text, createdAt: new Date() });
const SEGMENTS = [
  seg("s1", "recruiter", "Tell me about a time you scaled a Node.js service under heavy load."),
  seg("s2", "candidate", "At Shipfast I moved our order API to a queue and cut p95 latency from 900ms to 120ms."),
  seg("s3", "candidate", "I also did some Postgres work but mostly reading queries."),
];
const BY_ID = new Map(SEGMENTS.map((s) => [s._id, s]));
const COMPETENCIES = [
  { id: "c1", kind: "must", title: "Node.js at scale", probes: ["How did you scale it?", "What broke first?"], coverage: { status: "not_covered", evidence: [] } },
  { id: "c2", kind: "must", title: "PostgreSQL", probes: ["Describe a slow query you fixed."], coverage: { status: "not_covered", evidence: [] } },
  { id: "c3", kind: "nice", title: "AWS", probes: ["Which AWS services have you run in production?"], coverage: { status: "not_covered", evidence: [] } },
];

describe("transcript cleaning", () => {
  it("drops silence and Whisper's stock hallucinations, keeps real speech", () => {
    const kept = cleanSegments([
      { text: " I led the migration. ", no_speech_prob: 0.05, avg_logprob: -0.2 },
      { text: "Thank you.", no_speech_prob: 0.3, avg_logprob: -0.9 },
      { text: "Thanks for watching!", no_speech_prob: 0.2, avg_logprob: -1.1 },
      { text: "hmm", no_speech_prob: 0.9 },
      { text: "   " },
      { text: "Thank you.", no_speech_prob: 0.02, avg_logprob: -0.1 }, // confidently said: keep
    ]);
    expect(kept.map((s) => s.text)).toEqual(["I led the migration.", "Thank you."]);
  });
});

describe("evidence and coverage guard rails", () => {
  it("accepts only real quotes of what the candidate said", () => {
    const evidence = verifyTranscriptEvidence(
      [
        { segmentId: "s2", quote: "cut p95 latency from 900ms to 120ms" },
        { segmentId: "s1", quote: "scaled a Node.js service" }, // interviewer's words
        { segmentId: "s3", quote: "designed the whole Postgres schema" }, // not said
        { segmentId: "s9", quote: "anything" }, // no such segment
      ],
      BY_ID,
    );
    expect(evidence).toEqual([{ segmentId: "s2", quote: "cut p95 latency from 900ms to 120ms" }]);
  });

  it("needs evidence for coverage and never lowers it", () => {
    let merged = mergeCoverage(
      COMPETENCIES,
      [
        { competencyId: "c1", status: "covered", evidence: [{ segmentId: "s2", quote: "moved our order API to a queue" }] },
        { competencyId: "c2", status: "covered", evidence: [] }, // no evidence: not covered
      ],
      BY_ID,
    );
    expect(merged.map((c) => c.coverage.status)).toEqual(["covered", "not_covered", "not_covered"]);

    merged = mergeCoverage(merged, [{ competencyId: "c1", status: "not_covered", evidence: [] }], BY_ID);
    expect(merged[0].coverage.status).toBe("covered");
    expect(merged[0].coverage.evidence).toHaveLength(1);
  });
});

describe("follow-up suggestions", () => {
  it("drops protected-characteristic questions, repeats and unknown competencies", () => {
    const out = filterFollowUps(
      [
        { competencyId: "c2", question: "What was the slowest query you fixed, and how?", reason: "vague answer" },
        { competencyId: "c1", question: "Are you planning to have children soon?", reason: "availability" },
        { competencyId: "c1", question: "Where are you really from?", reason: "rapport" },
        { competencyId: "c9", question: "Unrelated competency question here?", reason: "x" },
        { competencyId: "c2", question: "What was the slowest query you fixed and how", reason: "dup" },
        { competencyId: "c3", question: "How did you disable a misbehaving feature flag in production?", reason: "AWS ops" },
      ],
      COMPETENCIES,
      [],
    );
    expect(out.map((f) => f.question)).toEqual([
      "What was the slowest query you fixed, and how?",
      "How did you disable a misbehaving feature flag in production?",
    ]);
  });

  it("doesn't flag ordinary engineering vocabulary", () => {
    for (const ok of [
      "How did you find that race condition?",
      "How do you monitor system health?",
      "Have you built software for medical devices?",
      "How do you manage a partner team's dependencies?",
      "What would you disable first under load?",
      "Which font family does the design system use?",
      "How did you version the SDK family?",
    ]) {
      expect(PROTECTED_TOPICS.test(ok)).toBe(false);
    }
    for (const bad of ["How old are you?", "Are you married?", "Do you have a disability?", "What is your religion?", "Seemed distracted, maybe family issues.", "How does your family feel about relocating?"]) {
      expect(PROTECTED_TOPICS.test(bad)).toBe(true);
    }
  });

  it("falls back to prepared probes for uncovered must-haves first", () => {
    const covered = COMPETENCIES.map((c) => (c.id === "c1" ? { ...c, coverage: { status: "covered" } } : c));
    expect(ruleBasedFollowUps(covered, [{ question: "Describe a slow query you fixed." }])).toEqual([
      { competencyId: "c3", question: "Which AWS services have you run in production?", reason: "AWS isn't covered yet" },
    ]);
  });

  it("uses the rule-based fallback when the model is down", async () => {
    const ai = { run: async () => { throw new Error("down"); } };
    const result = await runCopilot(ai, { competencies: COMPETENCIES, segments: SEGMENTS });
    expect(result.source).toBe("rules");
    expect(result.followUps[0]).toMatchObject({ competencyId: "c1", question: "How did you scale it?" });
  });
});

describe("draft ratings", () => {
  it("keeps a rating only when it's backed by a verified candidate quote", async () => {
    const ai = {
      run: async ({ schema }) => ({
        model: "fake-120b",
        data: schema.parse({
          ratings: [
            { competencyId: "c1", rating: 4, rationale: "Concrete scaling result.", evidence: [{ segmentId: "s2", quote: "cut p95 latency from 900ms to 120ms" }] },
            { competencyId: "c2", rating: 3, rationale: "Says they did Postgres.", evidence: [{ segmentId: "s3", quote: "optimised every index in the database" }] },
            { competencyId: "c3", rating: null, rationale: "Not discussed.", evidence: [] },
          ],
        }),
      }),
    };
    const { competencies, model } = await draftRatings(ai, { competencies: COMPETENCIES, segments: SEGMENTS });
    expect(model).toBe("fake-120b");
    expect(competencies[0].aiDraft).toMatchObject({ rating: 4, evidence: [{ segmentId: "s2" }] });
    expect(competencies[1].aiDraft.rating).toBeUndefined();
    expect(competencies[1].aiDraft.rationale).toMatch(/Not enough quoted evidence/);
    expect(competencies[2].aiDraft).toMatchObject({ rating: undefined, rationale: "Not discussed." });
  });
});

describe("scorecard generation", () => {
  const job = { title: "Backend Engineer", description: "Build APIs.", requirements: ["Node.js", "PostgreSQL"], experienceLevel: 3 };
  const requirementsOutput = {
    title: "Backend Engineer",
    minYears: 3,
    requirements: [
      { text: "Nice: AWS", kind: "nice", skills: ["AWS"] },
      { text: "3+ years Node.js", kind: "must", skills: ["Node.js"] },
      { text: "PostgreSQL", kind: "must", skills: ["PostgreSQL"] },
    ],
  };

  it("orders musts first and caps the list", () => {
    const reqs = Array.from({ length: 9 }, (_, i) => ({ id: `r${i}`, kind: i % 3 ? "must" : "nice" }));
    const picked = pickRequirements(reqs);
    expect(picked).toHaveLength(6);
    expect(picked.slice(0, 6).every((r) => r.kind === "must")).toBe(true);
  });

  it("builds competencies from the model and fills gaps with rules", async () => {
    const ai = {
      run: async ({ task, schema }) => {
        if (task === "resume.requirements") return { data: schema.parse(requirementsOutput) };
        return {
          data: schema.parse({
            competencies: [
              {
                requirementId: "req_2",
                title: "Node.js services",
                description: "Builds and runs Node.js APIs.",
                probes: ["Tell me about a Node.js service you owned.", "How did you debug a memory leak?"],
                rubric: { 1: "none", 2: "some", 3: "meets", 4: "exceeds" },
              },
            ],
          }),
        };
      },
    };
    const { competencies, source } = await generateScorecard(ai, job);
    expect(source).toBe("model");
    expect(competencies.map((c) => [c.id, c.requirementId, c.kind])).toEqual([
      ["c1", "req_2", "must"],
      ["c2", "req_3", "must"],
      ["c3", "req_1", "nice"],
    ]);
    expect(competencies[0].title).toBe("Node.js services");
    expect(competencies[1].probes[0]).toMatch(/PostgreSQL/); // rule-based fill
  });

  it("still produces a scorecard from the posting when the AI is down", async () => {
    const ai = { run: async () => { throw new Error("down"); } };
    const { competencies, source } = await generateScorecard(ai, job);
    expect(source).toBe("rules");
    expect(competencies.map((c) => c.description)).toEqual(["Node.js", "PostgreSQL"]);
  });
});
