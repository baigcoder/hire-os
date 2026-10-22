import {
  scorecardScore,
  completenessGaps,
  recommendationFor,
  assembleReportFacts,
  checkNarrative,
  ruleNarrative,
  generateInterviewReportV2,
} from "../../../modules/report/interviewReport.js";

const comp = (id, kind, rating, extra = {}) => ({
  id,
  title: `Competency ${id}`,
  kind,
  rating: rating == null ? undefined : { value: rating },
  coverage: { status: rating ? "covered" : "not_covered", evidence: [] },
  ...extra,
});

const SEGMENTS = [
  { _id: "s1", speaker: "recruiter", text: "Tell me about a Node.js service you owned." },
  { _id: "s2", speaker: "candidate", text: "I owned the order API and cut p95 latency from 900ms to 120ms with a queue." },
];

const interview = {
  studentId: { fullname: "Sam Candidate" },
  jobId: { title: "Backend Engineer" },
  videoInterview: { duration: 1800 },
  mcqTest: { totalQuestions: 10, correctAnswers: 8, passed: true },
};

const scorecard = (competencies, overall) => ({ status: "ready", competencies, ...(overall && { overall: { recommendation: overall } }) });

describe("report numbers come from the recruiter's ratings only", () => {
  it("weights must-haves double and maps 1–4 to 0–100", () => {
    expect(scorecardScore([comp("c1", "must", 4), comp("c2", "nice", 1)])).toBe(67);
    expect(scorecardScore([comp("c1", "must", 3), comp("c2", "must", 3)])).toBe(67);
    expect(scorecardScore([comp("c1", "must", null, { aiDraft: { rating: 4 } })])).toBeNull();
  });

  it("lists what blocks sending to the CEO", () => {
    expect(completenessGaps(scorecard([comp("c1", "must", 3), comp("c2", "must", null), comp("c3", "nice", null)]))).toEqual([
      { type: "unrated_must", competencyId: "c2", title: "Competency c2" },
      { type: "no_overall", title: "Overall recommendation" },
    ]);
    expect(completenessGaps(scorecard([comp("c1", "must", 3)], "yes"))).toEqual([]);
    expect(completenessGaps(null)).toEqual([]); // legacy interviews without a scorecard
  });

  it("takes the recommendation from the recruiter, else the score", () => {
    const facts = (card) => assembleReportFacts({ interview, scorecard: card, segments: [] });
    expect(recommendationFor(facts(scorecard([comp("c1", "must", 1)], "strong_yes")))).toEqual({ value: "STRONGLY_RECOMMEND", source: "recruiter" });
    expect(recommendationFor(facts(scorecard([comp("c1", "must", 4)])))).toEqual({ value: "STRONGLY_RECOMMEND", source: "scorecard" });
    expect(recommendationFor(facts(null))).toEqual({ value: "CONSIDER", source: "insufficient_data" });
  });

  it("gathers MCQ, talk share and integrity as facts", () => {
    const facts = assembleReportFacts({
      interview,
      scorecard: scorecard([comp("c1", "must", 3)], "yes"),
      segments: SEGMENTS,
      integrity: { status: "ended", report: { status: "ready", data: { reviewPriority: "routine", monitoringReliability: { level: "reliable" }, summary: "Nothing notable." } } },
      screening: { status: "completed", score: { overall: 72, band: "good" } },
    });
    expect(facts).toMatchObject({
      durationMinutes: 30,
      mcq: { percentage: 80, passed: true },
      resumeScreening: { overall: 72 },
      integrity: { reviewPriority: "routine", reliability: "reliable" },
    });
    expect(facts.transcript.candidateTalkShare).toBeGreaterThan(50);
  });
});

describe("narrative guard rails", () => {
  const facts = assembleReportFacts({
    interview,
    scorecard: scorecard([comp("c1", "must", 4), comp("c2", "must", 2), comp("c3", "nice", null)], "yes"),
    segments: SEGMENTS,
  });
  const byId = new Map(SEGMENTS.map((s) => [s._id, s]));

  it("keeps strengths and concerns consistent with the ratings and quotes real", () => {
    const out = checkNarrative(
      {
        summary: "Strong backend engineer with one gap.",
        strengths: [
          { competencyId: "c1", text: "Owned a high-traffic API.", evidence: [{ segmentId: "s2", quote: "cut p95 latency from 900ms to 120ms" }, { segmentId: "s1", quote: "Node.js service you owned" }] },
          { competencyId: "c2", text: "Great at databases.", evidence: [] }, // rated 2: not a strength
        ],
        concerns: [
          { competencyId: "c2", text: "Limited PostgreSQL tuning." },
          { competencyId: "c1", text: "Weak Node.js." }, // rated 4: not a concern
          { competencyId: "c3", text: "AWS wasn't discussed." },
          { competencyId: null, text: "Long gaps in answers." },
        ],
        nextSteps: ["Short follow-up on PostgreSQL."],
      },
      facts,
      byId,
    );
    expect(out.strengths).toEqual([
      { competencyId: "c1", text: "Owned a high-traffic API.", evidence: [{ segmentId: "s2", quote: "cut p95 latency from 900ms to 120ms" }] },
    ]);
    expect(out.concerns.map((c) => c.competencyId)).toEqual(["c2", "c3", null]);
  });

  it("rejects protected characteristics and misconduct verdicts", () => {
    const base = { strengths: [], concerns: [], nextSteps: [] };
    expect(checkNarrative({ ...base, summary: "The candidate was caught cheating." }, facts, byId)).toBeNull();
    const out = checkNarrative(
      { ...base, summary: "Fine.", concerns: [{ competencyId: null, text: "Mentioned planning to have children soon." }, { competencyId: "c2", text: "Thin PostgreSQL depth." }] },
      facts,
      byId,
    );
    expect(out.concerns.map((c) => c.text)).toEqual(["Thin PostgreSQL depth."]);
  });

  it("builds a rule-based narrative from the ratings", () => {
    const out = ruleNarrative(facts);
    expect(out.strengths.map((s) => s.competencyId)).toEqual(["c1"]);
    expect(out.concerns.map((c) => c.competencyId)).toEqual(["c2"]);
  });
});

describe("generateInterviewReportV2", () => {
  const sources = {
    interview,
    scorecard: scorecard([comp("c1", "must", 4), comp("c2", "must", 2)], "yes"),
    segments: SEGMENTS,
  };

  it("uses the model's narrative when it passes the checks", async () => {
    const ai = {
      run: async ({ schema, tier }) => {
        expect(tier).toBe("reasoning");
        return {
          model: "fake-120b",
          data: schema.parse({
            summary: "Solid backend candidate.",
            strengths: [{ competencyId: "c1", text: "Owned a high-traffic API.", evidence: [{ segmentId: "s2", quote: "owned the order API" }] }],
            concerns: [{ competencyId: "c2", text: "Limited PostgreSQL tuning." }],
            nextSteps: ["Follow up on PostgreSQL."],
          }),
        };
      },
    };
    const report = await generateInterviewReportV2(ai, sources);
    expect(report).toMatchObject({
      recommendation: "RECOMMEND",
      recommendationSource: "recruiter",
      overallScore: 67,
      narrativeSource: "model",
      model: "fake-120b",
      gaps: [],
    });
    expect(report.strengths[0].evidence).toHaveLength(1);
  });

  it("falls back to rules when the AI is down, keeping the same numbers", async () => {
    const ai = { run: async () => { throw new Error("down"); } };
    const report = await generateInterviewReportV2(ai, sources);
    expect(report).toMatchObject({ narrativeSource: "rules", recommendation: "RECOMMEND", overallScore: 67 });
  });

  it("doesn't ask the model to write about an interview with no scorecard", async () => {
    let called = false;
    const ai = { run: async () => { called = true; } };
    const report = await generateInterviewReportV2(ai, { interview, scorecard: null, segments: [] });
    expect(called).toBe(false);
    expect(report.summary).toMatch(/No structured scorecard/);
    expect(report.overallScore).toBeNull();
  });
});
