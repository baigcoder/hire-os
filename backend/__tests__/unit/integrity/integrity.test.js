import {
  normalizeEvents,
  debounce,
  scoreAt,
  bandFor,
  pointsFor,
  crossCheck,
  CROSS_CHECK_SETTLE_MS,
} from "../../../modules/integrity/riskEngine.js";
import {
  issueIngestKey,
  signBatch,
  verifyBatch,
} from "../../../modules/integrity/heartbeat.js";
import {
  buildIntegrityFacts,
  assessReliability,
  reviewPriorityFor,
  checkNarrative,
  generateIntegrityReport,
} from "../../../modules/integrity/report.js";

const NOW = Date.parse("2026-10-22T10:00:00Z");
const ev = (type, offsetMs, durationMs = 5000, extra = {}) => ({
  type,
  startedAt: NOW + offsetMs,
  durationMs,
  confidence: 0.9,
  ...extra,
});

describe("normalizeEvents", () => {
  it("accepts known signals and rejects junk", () => {
    const { accepted, rejected, tamper } = normalizeEvents(
      [
        ev("phone_detected", -1000),
        { type: "made_up", startedAt: NOW },
        ev("gaze_away", 10 * 60_000), // far future
        { type: "virtual_camera", startedAt: NOW, detail: "OBS Virtual Camera" },
      ],
      { source: "candidate", now: NOW },
    );
    expect(accepted.map((e) => e.type)).toEqual(["phone_detected"]);
    expect(rejected.map((r) => r.reason).sort()).toEqual(["bad_timestamp", "unknown_type"]);
    expect(tamper).toEqual([expect.objectContaining({ type: "virtual_camera" })]);
  });

  it("only lets each detector report what it can see", () => {
    const { accepted, rejected } = normalizeEvents(
      [ev("tab_hidden", 0), ev("phone_detected", 0)],
      { source: "recruiter", now: NOW },
    );
    expect(accepted.map((e) => e.type)).toEqual(["phone_detected"]);
    expect(rejected).toEqual([{ type: "tab_hidden", reason: "source_not_allowed" }]);
  });

  it("clamps confidence and duration", () => {
    const { accepted } = normalizeEvents(
      [{ type: "face_missing", startedAt: NOW, durationMs: 1e9, confidence: 7 }],
      { source: "candidate", now: NOW },
    );
    expect(accepted[0]).toMatchObject({ confidence: 1, durationMs: 600_000 });
  });
});

describe("debounce", () => {
  const norm = (events) => normalizeEvents(events, { source: "candidate", now: NOW + 60_000 }).accepted;

  it("ignores a glance shorter than the signal's minimum", () => {
    const { outcomes } = debounce(norm([ev("gaze_away", 0, 2000)]));
    expect(outcomes[0]).toMatchObject({ counted: false, reason: "below_min_duration", points: 0 });
  });

  it("merges repeats inside the cooldown", () => {
    const { outcomes } = debounce(
      norm([ev("phone_detected", 0), ev("phone_detected", 5000), ev("phone_detected", 25_000)]),
    );
    expect(outcomes.map((o) => o.counted)).toEqual([true, false, true]);
  });

  it("keeps cooldown state across batches", () => {
    const first = debounce(norm([ev("phone_detected", 0)]));
    const second = debounce(norm([ev("phone_detected", 5000)]), first.lastCounted);
    expect(second.outcomes[0].reason).toBe("cooldown");
  });

  it("counts expected signals with zero points", () => {
    const { outcomes } = debounce(norm([ev("gaze_away", 0, 8000)]), {}, new Set(["gaze_away"]));
    expect(outcomes[0]).toMatchObject({ counted: true, reason: "expected", points: 0 });
  });
});

describe("scoring", () => {
  it("weights longer, more confident occurrences more", () => {
    const short = pointsFor({ type: "face_missing", durationMs: 3000, confidence: 0.6 });
    const long = pointsFor({ type: "face_missing", durationMs: 40_000, confidence: 1 });
    expect(long).toBeGreaterThan(short * 2);
  });

  it("decays over time and caps at 100", () => {
    const scored = [{ at: NOW, points: 40 }];
    expect(scoreAt(scored, NOW)).toBe(40);
    expect(scoreAt(scored, NOW + 90_000)).toBe(Math.round(40 / Math.E));
    expect(scoreAt(scored, NOW + 10 * 60_000)).toBe(0);
    expect(scoreAt([{ at: NOW, points: 80 }, { at: NOW, points: 80 }], NOW)).toBe(100);
  });

  it("bands the score", () => {
    expect([0, 30, 60, 90].map(bandFor)).toEqual(["low", "elevated", "high", "critical"]);
  });
});

describe("crossCheck", () => {
  const recruiter = (type, at) => ({ _id: `${type}${at}`, type, at, durationMs: 3000 });
  const later = NOW + CROSS_CHECK_SETTLE_MS + 10_000;

  it("flags recruiter-side sightings the candidate didn't report", () => {
    const { checked, mismatched } = crossCheck(
      [recruiter("phone_detected", NOW), recruiter("multiple_faces", NOW)],
      [{ type: "phone_detected", at: NOW + 1000, durationMs: 2000 }],
      () => true,
      later,
    );
    expect(checked).toHaveLength(2);
    expect(mismatched.map((m) => m.type)).toEqual(["multiple_faces"]);
  });

  it("waits for the candidate's batch to settle", () => {
    const { checked } = crossCheck([recruiter("phone_detected", NOW)], [], () => true, NOW + 5000);
    expect(checked).toHaveLength(0);
  });

  it("doesn't blame a silent detector twice (that's a heartbeat gap)", () => {
    const { checked, mismatched } = crossCheck([recruiter("phone_detected", NOW)], [], () => false, later);
    expect(checked).toHaveLength(1);
    expect(mismatched).toHaveLength(0);
  });
});

describe("signed batches", () => {
  const key = issueIngestKey();
  const batch = (seq, events = []) => {
    const b = { seq, sentAt: NOW, events };
    return { ...b, sig: signBatch(key, b) };
  };

  it("accepts a correctly signed next batch", () => {
    expect(verifyBatch(key, batch(1, [ev("tab_hidden", 0)]), { lastSeq: 0, now: NOW })).toEqual({ ok: true });
  });

  it("rejects tampered, replayed, stale and foreign batches", () => {
    const signed = batch(2, [ev("phone_detected", 0)]);
    expect(verifyBatch(key, { ...signed, events: [] }, { lastSeq: 1, now: NOW }).code).toBe("BAD_SIGNATURE");
    expect(verifyBatch(key, signed, { lastSeq: 2, now: NOW }).code).toBe("REPLAYED_BATCH");
    expect(verifyBatch(key, signed, { lastSeq: 1, now: NOW + 10 * 60_000 }).code).toBe("STALE_BATCH");
    expect(verifyBatch(issueIngestKey(), signed, { lastSeq: 1, now: NOW }).code).toBe("BAD_SIGNATURE");
  });
});

describe("integrity report", () => {
  const session = (overrides = {}) => ({
    startedAt: new Date(NOW),
    endedAt: new Date(NOW + 10 * 60_000),
    heartbeat: { batches: 120 },
    verifier: { batches: 100 },
    risk: { score: 10, peak: 30 },
    tamperFlags: [],
    expectedSignals: [],
    ...overrides,
  });
  const event = (type, source = "candidate", offset = 60_000) => ({
    kind: "behavior",
    type,
    source,
    at: new Date(NOW + offset),
    durationMs: 4000,
    confidence: 0.9,
    counted: true,
  });

  it("is routine when monitoring is clean and quiet", () => {
    const facts = buildIntegrityFacts(session(), []);
    const reliability = assessReliability(facts);
    expect(reliability.level).toBe("reliable");
    expect(reviewPriorityFor(facts, reliability)).toBe("routine");
  });

  it("treats tampered monitoring as unreliable and a priority", () => {
    const facts = buildIntegrityFacts(
      session({ tamperFlags: [{ type: "virtual_camera", count: 1, firstAt: new Date(NOW) }] }),
      [],
    );
    const reliability = assessReliability(facts);
    expect(reliability.level).toBe("unreliable");
    expect(reviewPriorityFor(facts, reliability)).toBe("priority_review");
  });

  it("counts a signal confirmed by the recruiter-side detector as strong", () => {
    const facts = buildIntegrityFacts(session(), [
      event("phone_detected"),
      event("phone_detected", "recruiter", 61_000),
    ]);
    expect(facts.signals[0]).toMatchObject({ signal: "phone_detected", counted: 2, confirmedByRecruiterSide: true });
    expect(reviewPriorityFor(facts, assessReliability(facts))).toBe("review");
  });

  it("drops ungrounded observations and catches verdict wording", () => {
    const facts = buildIntegrityFacts(session(), [event("gaze_away")]);
    const narrative = {
      summary: "Neutral.",
      observations: [
        { signal: "gaze_away", observed: "Looked away twice.", strength: "weak", possibleBenignExplanations: [] },
        { signal: "phone_detected", observed: "Invented.", strength: "strong", possibleBenignExplanations: [] },
      ],
      suggestedFollowUps: [],
    };
    const ok = checkNarrative(narrative, facts);
    expect(ok.dropped).toBe(1);
    expect(ok.verdict).toBe(false);
    expect(checkNarrative({ ...narrative, summary: "The candidate was cheating." }, facts).verdict).toBe(true);
  });

  it("falls back to rule-based text when the model breaks the wording rule", async () => {
    const ai = {
      run: async ({ schema }) => ({
        model: "fake",
        data: schema.parse({
          summary: "Clear fraud.",
          observations: [],
          suggestedFollowUps: [],
        }),
      }),
    };
    const report = await generateIntegrityReport(ai, session(), [event("gaze_away")]);
    expect(report.narrativeSource).toBe("rules");
    expect(report.summary).not.toMatch(/fraud/i);
    expect(report.note).toMatch(/observation-only/);
  });

  it("still produces a report when the AI is down", async () => {
    const ai = { run: async () => { throw Object.assign(new Error("down"), { code: "ALL_PROVIDERS_FAILED" }); } };
    const report = await generateIntegrityReport(ai, session(), [event("face_missing")]);
    expect(report.narrativeSource).toBe("rules");
    expect(report.observations[0].signal).toBe("face_missing");
    expect(report.disclaimer).toMatch(/not evidence of misconduct/);
  });
});
