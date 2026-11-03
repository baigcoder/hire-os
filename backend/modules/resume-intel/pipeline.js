/**
 * Resume intelligence pipeline (stages 2–8; extraction happens at upload).
 *
 *   guard → structure → signals → [requirements → match] → score → critique+verify
 *
 * Deterministic stages decide the score; LLM stages add structure, semantic
 * matching and advice, and every LLM claim is verified against the resume.
 * `ai` is injected (the gateway in production, a fake in tests).
 */
import { screenResume } from "./guard.js";
import { extractProfile, buildItemIndex, pickMeta } from "./profile.js";
import { computeSignals } from "./signals.js";
import { extractRequirements } from "./requirements.js";
import { matchRequirements } from "./match.js";
import { computeScore } from "./score.js";
import { critique } from "./critic.js";

export const PIPELINE_VERSION = "resume-intel-2.0";

export const STAGES = [
  { id: "guard", label: "Screening for hidden instructions" },
  { id: "structure", label: "Structuring your experience" },
  { id: "signals", label: "Checking dates, impact and ATS basics" },
  { id: "requirements", label: "Reading the job requirements" },
  { id: "match", label: "Matching requirements with evidence" },
  { id: "score", label: "Scoring" },
  { id: "critique", label: "Writing and verifying feedback" },
];

/** Default final stage: the candidate-facing critic. */
export const candidateAdviser = {
  stage: "critique",
  run: async (ai, context, items) => {
    const c = await critique(ai, context, items);
    return { output: c.critique, grounding: c.grounding, meta: c.meta };
  },
};

/**
 * @param {object} input
 * @param {{run: Function}} input.ai
 * @param {string} input.text  extracted resume text
 * @param {string} input.textHash
 * @param {{text: string, title?: string, minYears?: number}|null} input.job
 * @param {(stage: string, status: "running"|"done"|"skipped", info?: object) => Promise<void>|void} [input.onStage]
 * @param {Date} [input.now]
 * @param {{stage: string, run: Function}} [input.adviser]  final advice
 *   stage; recruiter screening swaps in its own summary
 */
export const runResumePipeline = async ({
  ai,
  text,
  textHash,
  job = null,
  onStage = () => {},
  now = new Date(),
  adviser = candidateAdviser,
}) => {
  const models = {};
  const stage = async (id, fn) => {
    const started = Date.now();
    await onStage(id, "running");
    const value = await fn();
    await onStage(id, "done", { ms: Date.now() - started });
    return value;
  };

  const guard = await stage("guard", () => screenResume(text, { ai }));

  const profile = await stage("structure", async () => {
    // Cache by the cleaned text: identical resumes are only extracted once
    const { profile: p, meta } = await extractProfile(ai, guard.text, {
      cacheKey: `${PIPELINE_VERSION}:${textHash}:${guard.text.length}`,
    });
    models.structure = meta;
    return p;
  });
  const items = buildItemIndex(profile);

  const signals = await stage("signals", () =>
    computeSignals(profile, guard.text, { now }),
  );

  let requirementsDoc = null;
  let matches = null;
  let matchDowngrades = 0;
  if (job?.text) {
    requirementsDoc = await stage("requirements", async () => {
      const r = await extractRequirements(ai, job.text, {
        minYears: job.minYears,
      });
      models.requirements = pickMeta(r.meta);
      return {
        title: job.title || r.title,
        minYears: r.minYears,
        requirements: r.requirements,
      };
    });
    const matched = await stage("match", async () => {
      const m = await matchRequirements(
        ai,
        profile,
        requirementsDoc.requirements,
        items,
        signals,
      );
      models.match = pickMeta(m.meta);
      return m;
    });
    matches = matched.matches;
    matchDowngrades = matched.downgraded;
  } else {
    await onStage("requirements", "skipped");
    await onStage("match", "skipped");
  }

  const score = await stage("score", () =>
    computeScore(signals, requirementsDoc, matches),
  );

  const advice = await stage(adviser.stage, async () => {
    const a = await adviser.run(
      ai,
      { profile, signals, score, job: requirementsDoc, matches: matches || [] },
      items,
    );
    models[adviser.stage] = pickMeta(a.meta);
    return a;
  });

  return {
    profile,
    signals,
    job: requirementsDoc,
    matches,
    score,
    // Output of the final stage: candidate critique or recruiter summary
    critique: advice.output,
    flags: guard.flags,
    grounding: {
      ...advice.grounding,
      matchDowngrades,
      guardClassifier: guard.classifier,
    },
    models,
    degraded: Object.values(models).some((m) => m.degraded),
  };
};
