/**
 * What gets embedded for semantic search, and when.
 *
 *   job        title, skills, requirements, description — on create/update
 *   resume     the candidate's latest analyzed profile — after an analysis
 *   applicant  the blind screening profile — after screening
 *
 * Profiles are embedded from structured roles, bullets and skills, never
 * contact details, so applicant vectors stay as blind as the screening.
 */
import { Job } from "../../models/job.model.js";
import { Embedding } from "../../models/embedding.model.js";
import queue from "../../platform/queue/index.js";
import {
  deleteEmbedding,
  embeddingsConfigured,
  upsertEmbedding,
} from "../../platform/embeddings/index.js";
import { normalizeSkills } from "../resume-intel/taxonomy.js";
import logger from "../../utils/logger.js";

export const EMBED_JOB = "embed.job";

const MAX_DESCRIPTION_CHARS = 2500;
const MAX_BULLETS = 25;

export const jobDocument = (job) => {
  const skills = normalizeSkills(job.skills || []).map((s) => s.canonical);
  return {
    title: job.title,
    text: [
      job.title,
      skills.length && `Skills: ${skills.join(", ")}`,
      job.requirements?.length &&
        `Requirements: ${job.requirements.join("; ")}`,
      job.experienceLevel != null &&
        `Experience: ${job.experienceLevel}+ years`,
      job.location && `Location: ${job.location} (${job.jobType || ""})`,
      (job.description || "").slice(0, MAX_DESCRIPTION_CHARS),
    ]
      .filter(Boolean)
      .join("\n"),
    meta: {
      jobId: job._id,
      companyId: job.company?._id ?? job.company,
      createdBy: job.created_by,
      skills,
    },
  };
};

export const profileDocument = (profile, signals) => {
  const skills = (signals?.skills || []).map((s) => s.name);
  const roles = (profile.experience || []).map((r) =>
    [r.title, r.company].filter(Boolean).join(" at "),
  );
  const bullets = [
    ...(profile.experience || []).flatMap((r) => r.bullets),
    ...(profile.projects || []).flatMap((p) => p.bullets),
  ]
    .slice(0, MAX_BULLETS)
    .map((b) => b.text);
  return {
    title: profile.experience?.[0]?.title || "Candidate",
    text: [
      profile.summary,
      roles.length && `Roles: ${roles.join("; ")}`,
      signals?.experience?.years != null &&
        `Experience: ${signals.experience.years} years`,
      skills.length && `Skills: ${skills.join(", ")}`,
      (profile.projects || []).length &&
        `Projects: ${profile.projects.map((p) => p.name).join(", ")}`,
      ...bullets,
    ]
      .filter(Boolean)
      .join("\n"),
    skills,
  };
};

export const indexJob = async (jobId) => {
  const job = await Job.findById(jobId)
    .select(
      "title description requirements skills experienceLevel location jobType company created_by",
    )
    .lean();
  if (!job) {
    await deleteEmbedding("job", jobId);
    return "deleted";
  }
  const doc = jobDocument(job);
  return upsertEmbedding({ kind: "job", refId: job._id, ...doc });
};

/** Index a completed candidate report as that user's resume vector. */
export const indexResumeReport = async (report) => {
  const doc = profileDocument(report.profile, report.signals);
  return upsertEmbedding({
    kind: "resume",
    refId: report.userId,
    title: doc.title,
    text: doc.text,
    meta: { userId: report.userId, skills: doc.skills },
  });
};

/** Index a completed blind screening. */
export const indexScreening = async (screening, { companyId, createdBy }) => {
  const doc = profileDocument(screening.profile, screening.signals);
  return upsertEmbedding({
    kind: "applicant",
    refId: screening.applicationId,
    title: doc.title,
    text: doc.text,
    meta: {
      jobId: screening.jobId,
      companyId,
      createdBy,
      skills: doc.skills,
    },
  });
};

/** Never let indexing break the operation that triggered it. */
export const indexSafely = async (label, fn) => {
  if (!embeddingsConfigured()) return null;
  try {
    return await fn();
  } catch (error) {
    logger.warn("Semantic indexing failed", { label, error: error.message });
    return null;
  }
};

export const enqueueJobIndexing = (jobId) =>
  embeddingsConfigured()
    ? queue
        .enqueue(
          EMBED_JOB,
          { jobId: String(jobId) },
          { dedupeKey: `embed:job:${jobId}`, priority: -2 },
        )
        .catch((error) =>
          logger.warn("Could not queue job indexing", {
            jobId: String(jobId),
            error: error.message,
          }),
        )
    : null;

export const removeJobFromIndex = async (jobId) => {
  await Embedding.deleteMany({
    $or: [
      { kind: "job", refId: jobId },
      { kind: "applicant", "meta.jobId": jobId },
    ],
  });
};

export const createEmbedJobHandler =
  () =>
  async ({ jobId }) => ({
    outcome: await indexJob(jobId),
  });
