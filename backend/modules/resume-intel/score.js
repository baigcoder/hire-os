/**
 * Stage 6: deterministic, versioned scoring. The same signals and matches
 * always give the same score; the LLM explains the score but never sets it.
 */

export const SCORE_VERSION = "score-v1";

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export const bandFor = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
};

const impactScore = (impact) =>
  impact.bullets === 0
    ? 0
    : 0.6 * clamp01(impact.quantifiedRatio / 0.4) +
      0.4 * clamp01(impact.actionRatio / 0.6);

const atsScore = (ats) => (ats.total ? ats.passed / ats.total : 0);

/**
 * @param {object} signals  from computeSignals
 * @param {object|null} job  { requirements: [{id, kind}], minYears } or null
 * @param {Array|null} matches  [{ requirementId, status }] (verified)
 * @returns {{ version, mode, overall, band, components: Array<{id, label,
 *   weight, value, points}> }}
 */
export const computeScore = (signals, job = null, matches = null) => {
  const years = signals.experience.years;
  const components = [];

  if (job && job.requirements.length > 0) {
    const statusById = new Map(
      (matches || []).map((m) => [m.requirementId, m.status]),
    );
    let weighted = 0;
    let total = 0;
    for (const req of job.requirements) {
      const weight = req.kind === "must" ? 2 : 1;
      const status = statusById.get(req.id) || "missing";
      weighted +=
        weight * (status === "met" ? 1 : status === "partial" ? 0.5 : 0);
      total += weight;
    }
    const experienceFit = job.minYears ? clamp01(years / job.minYears) : 1;

    components.push(
      {
        id: "requirements",
        label: "Job requirements",
        weight: 50,
        value: weighted / total,
      },
      {
        id: "experience",
        label: "Experience level",
        weight: 15,
        value: experienceFit,
      },
      {
        id: "impact",
        label: "Impact & achievements",
        weight: 20,
        value: impactScore(signals.impact),
      },
      {
        id: "ats",
        label: "ATS readiness",
        weight: 15,
        value: atsScore(signals.ats),
      },
    );
  } else {
    components.push(
      {
        id: "impact",
        label: "Impact & achievements",
        weight: 35,
        value: impactScore(signals.impact),
      },
      {
        id: "ats",
        label: "ATS readiness",
        weight: 30,
        value: atsScore(signals.ats),
      },
      {
        id: "skills",
        label: "Skill breadth",
        weight: 20,
        value: clamp01(signals.skills.length / 12),
      },
      {
        id: "experience",
        label: "Experience",
        weight: 15,
        value: clamp01(years / 3),
      },
    );
  }

  const scored = components.map((c) => ({
    ...c,
    value: Math.round(c.value * 100) / 100,
    points: Math.round(c.weight * c.value * 10) / 10,
  }));
  const overall = Math.round(
    scored.reduce((sum, c) => sum + c.weight * c.value, 0),
  );

  return {
    version: SCORE_VERSION,
    mode: job && job.requirements.length > 0 ? "job-match" : "profile-strength",
    overall,
    band: bandFor(overall),
    components: scored,
  };
};
