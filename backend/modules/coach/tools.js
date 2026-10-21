/**
 * Tools the Resume Coach agent can call. All of them work on the
 * candidate's own report (ctx.report) or public job postings — the agent
 * can't reach other users' data. Arguments are validated with zod before a
 * tool runs, and results are plain JSON the model reads as data.
 */
import { z } from "zod";
import { Job } from "../../models/job.model.js";
import { buildItemIndex } from "../resume-intel/profile.js";
import { computeSignals } from "../resume-intel/signals.js";
import { computeScore } from "../resume-intel/score.js";
import {
  embedQuery,
  embeddingsConfigured,
  searchSimilar,
} from "../../platform/embeddings/index.js";

const MAX_ITEMS = 30;

const nullable = (schema) => schema.nullable().optional().default(null);

const toolDef = (name, description, schema, run, summarize) => {
  const { $schema: _ignored, ...parameters } = z.toJSONSchema(schema, {
    target: "draft-7",
    io: "input",
  });
  return {
    name,
    description,
    schema,
    run,
    summarize,
    definition: {
      type: "function",
      function: { name, description, parameters },
    },
  };
};

const scoreOf = (report) => report.score;

const getOverview = toolDef(
  "get_report_overview",
  "Overall score, score breakdown, target job, years of experience and any flags for the candidate's resume analysis. Call this first to orient yourself.",
  z.object({}),
  async (_args, { report }) => ({
    score: scoreOf(report).overall,
    band: scoreOf(report).band,
    mode: scoreOf(report).mode,
    components: scoreOf(report).components.map(
      ({ id, label, weight, points }) => ({
        id,
        label,
        points,
        outOf: weight,
      }),
    ),
    targetJob: report.job?.title ?? null,
    experienceYears: report.signals?.experience?.years ?? null,
    flags: (report.flags || []).map((f) => f.type),
    warnings: report.warnings || [],
  }),
  () => "Read the report overview",
);

const getRequirements = toolDef(
  "get_requirements",
  "The target job's requirements with match status (met / partial / missing), quoted evidence from the resume and a rationale. Optionally filter by status.",
  z.object({ status: nullable(z.enum(["met", "partial", "missing"])) }),
  async ({ status }, { report }) => {
    if (!report.job?.requirements?.length) {
      return { note: "This analysis has no target job." };
    }
    const byId = new Map(
      (report.matches || []).map((m) => [m.requirementId, m]),
    );
    return {
      requirements: report.job.requirements
        .map((r) => {
          const m = byId.get(r.id) || { status: "missing", evidence: [] };
          return {
            id: r.id,
            text: r.text,
            kind: r.kind,
            status: m.status,
            evidence: m.evidence,
            rationale: m.rationale,
          };
        })
        .filter((r) => !status || r.status === status),
    };
  },
  ({ status }) =>
    status ? `Checked ${status} requirements` : "Checked requirements",
);

const getResumeItems = toolDef(
  "get_resume_items",
  "Read items from the candidate's resume by id (e.g. exp_1, exp_1.b2, proj_1) or by kind. Set unquantifiedOnly to list bullets without numbers — the best candidates for rewriting.",
  z.object({
    ids: nullable(z.array(z.string()).max(MAX_ITEMS)),
    kind: nullable(
      z.enum([
        "summary",
        "role",
        "bullet",
        "project",
        "education",
        "certification",
        "skills",
      ]),
    ),
    unquantifiedOnly: nullable(z.boolean()),
  }),
  async ({ ids, kind, unquantifiedOnly }, { report }) => {
    const items = buildItemIndex(report.profile);
    const unquantified = new Set(
      report.signals?.impact?.unquantifiedBulletIds || [],
    );
    let entries = [...items.entries()];
    if (ids?.length) entries = entries.filter(([id]) => ids.includes(id));
    if (kind) entries = entries.filter(([, item]) => item.kind === kind);
    if (unquantifiedOnly)
      entries = entries.filter(([id]) => unquantified.has(id));
    return {
      items: entries.slice(0, MAX_ITEMS).map(([id, item]) => ({
        id,
        kind: item.kind,
        label: item.label,
        text: item.text,
      })),
      truncated: entries.length > MAX_ITEMS,
    };
  },
  ({ unquantifiedOnly }) =>
    unquantifiedOnly ? "Found bullets without numbers" : "Read resume items",
);

const getAtsChecks = toolDef(
  "get_ats_checks",
  "The ATS readiness checklist (pass/fail per check) and bullet impact statistics.",
  z.object({}),
  async (_args, { report }) => ({
    checks: report.signals?.ats?.checks || [],
    impact: {
      bullets: report.signals?.impact?.bullets,
      quantified: report.signals?.impact?.quantified,
      startingWithActionVerb: report.signals?.impact?.actionVerbs,
    },
  }),
  () => "Checked the ATS checklist",
);

/**
 * Deterministic "what if": apply bullet rewrites and added skills, then
 * recompute signals and the score with the same formula. Requirement
 * matches aren't re-judged (that needs the LLM), so the requirements
 * component stays as it is.
 */
const whatIfRescore = toolDef(
  "what_if_rescore",
  "Recalculate the score as if the given bullet rewrites and added skills were applied to the resume. Use it to show the impact of your suggestions. Requirement matches are not re-evaluated.",
  z.object({
    bulletEdits: z
      .array(z.object({ itemId: z.string(), text: z.string().min(3).max(400) }))
      .max(10)
      .default([]),
    addSkills: z.array(z.string().min(1).max(60)).max(15).default([]),
  }),
  async ({ bulletEdits, addSkills }, { report, resumeText }) => {
    const profile = structuredClone(report.profile);
    let text = resumeText || "";
    const applied = [];
    const rejected = [];
    for (const edit of bulletEdits) {
      const bullet = [...profile.experience, ...profile.projects]
        .flatMap((entry) => entry.bullets)
        .find((b) => b.id === edit.itemId);
      if (!bullet) {
        rejected.push({ itemId: edit.itemId, reason: "not a bullet id" });
        continue;
      }
      if (text.includes(bullet.text))
        text = text.replace(bullet.text, edit.text);
      bullet.text = edit.text;
      applied.push(edit.itemId);
    }
    profile.skills = [...profile.skills, ...addSkills];

    const signals = computeSignals(profile, text);
    const after = computeScore(signals, report.job, report.matches);
    const before = report.score;
    return {
      before: before.overall,
      after: after.overall,
      bandAfter: after.band,
      components: after.components.map((c) => ({
        id: c.id,
        label: c.label,
        before: before.components.find((b) => b.id === c.id)?.points ?? null,
        after: c.points,
      })),
      applied,
      rejected,
      note: "Requirement matches were not re-evaluated; re-run the analysis after updating your resume for a full re-score.",
    };
  },
  (_args, result) =>
    result?.before !== undefined
      ? `Re-scored: ${result.before} → ${result.after}`
      : "Tried a re-score",
);

const searchJobs = toolDef(
  "search_jobs",
  'Search open job postings on the platform. Describe what you\'re looking for in plain language (e.g. "backend Node.js role with PostgreSQL"); semantic search finds related jobs even without exact keywords. Returns up to `limit` jobs.',
  z.object({
    query: z.string().min(2).max(120),
    limit: nullable(z.number().int().min(1).max(5)),
  }),
  async ({ query, limit }) => {
    const max = limit || 5;
    let jobs;
    let method = "keyword";
    if (embeddingsConfigured()) {
      // Semantic: rank by meaning, then keep only active postings
      const hits = await searchSimilar({
        kind: "job",
        vector: await embedQuery(query),
        limit: max * 3,
      });
      const found = await Job.find({
        _id: { $in: hits.map((h) => h.refId) },
        isActive: { $ne: false },
      })
        .select("title location jobType experienceLevel skills company")
        .populate("company", "name")
        .lean();
      const byId = new Map(found.map((j) => [String(j._id), j]));
      jobs = hits
        .filter((h) => byId.has(h.refId))
        .slice(0, max)
        .map((h) => byId.get(h.refId));
      method = "semantic";
    } else {
      jobs = await Job.find(
        { $text: { $search: query }, isActive: { $ne: false } },
        { score: { $meta: "textScore" } },
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(max)
        .select("title location jobType experienceLevel skills company")
        .populate("company", "name")
        .lean();
    }
    return {
      method,
      jobs: jobs.map((j) => ({
        id: String(j._id),
        title: j.title,
        company: j.company?.name ?? null,
        location: j.location,
        jobType: j.jobType,
        minYears: j.experienceLevel,
        skills: (j.skills || []).slice(0, 10),
      })),
    };
  },
  ({ query }, result) =>
    `Searched jobs for “${query}” (${result?.jobs?.length ?? 0} found)`,
);

export const COACH_TOOLS = [
  getOverview,
  getRequirements,
  getResumeItems,
  getAtsChecks,
  whatIfRescore,
  searchJobs,
];

export const toolByName = new Map(COACH_TOOLS.map((t) => [t.name, t]));
export const toolDefinitions = COACH_TOOLS.map((t) => t.definition);
