/**
 * Semantic discovery. Mounted at /api/v1/discover.
 *
 *   GET /jobs?q=…&limit=…        semantic job search; without q, "jobs for
 *                                you" from the caller's analyzed resume
 *   GET /candidates?q=…&jobId=…  recruiter talent search over blind
 *                                screening profiles of jobs they manage
 */
import express from "express";
import mongoose from "mongoose";
import isAuthenticated, {
  isRecruiter,
} from "../middlewares/isAuthenticated.js";
import { aiLimiter } from "../middlewares/rateLimiters.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { ApplicantScreening } from "../models/applicantScreening.model.js";
import {
  embedQuery,
  embeddingsConfigured,
  getEmbedding,
  searchSimilar,
} from "../platform/embeddings/index.js";
import { normalizeSkills } from "../modules/resume-intel/taxonomy.js";

const router = express.Router();

const MAX_LIMIT = 20;
// Drop results far weaker than the best one. Relative, because absolute
// cosine values differ between embedding models.
const MIN_RELATIVE_SIMILARITY = 0.6;

const keepStrong = (hits) => {
  const floor = (hits[0]?.score ?? 0) * MIN_RELATIVE_SIMILARITY;
  return hits.filter((h) => h.score >= floor);
};
const parseLimit = (value, fallback) =>
  Math.min(Math.max(Number(value) || fallback, 1), MAX_LIMIT);

const unavailable = (res) =>
  res.status(503).json({
    success: false,
    code: "EMBEDDINGS_UNAVAILABLE",
    message: "Semantic search isn't configured on this server.",
  });

const readQuery = (req, res, { required = false, max = 200 } = {}) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if ((required && q.length < 2) || q.length > max) {
    res.status(400).json({
      success: false,
      code: "INVALID_QUERY",
      message: `Search for 2–${max} characters.`,
    });
    return null;
  }
  return q;
};

const skillOverlap = (jobSkills, userSkills) => {
  const mine = new Set(
    normalizeSkills(userSkills).map((s) => s.canonical.toLowerCase()),
  );
  const theirs = normalizeSkills(jobSkills).map((s) => s.canonical);
  return {
    matchedSkills: theirs.filter((s) => mine.has(s.toLowerCase())),
    missingSkills: theirs.filter((s) => !mine.has(s.toLowerCase())),
  };
};

router.get("/jobs", isAuthenticated, aiLimiter, async (req, res, next) => {
  try {
    if (!embeddingsConfigured()) return unavailable(res);
    const q = readQuery(req, res);
    if (q === null) return;
    const limit = parseLimit(req.query.limit, 6);

    const resume = await getEmbedding("resume", req.id);
    let vector;
    if (q) {
      vector = await embedQuery(q);
    } else if (resume) {
      vector = resume.vector;
    } else {
      return res.json({
        success: true,
        mode: "profile",
        needsAnalysis: true,
        jobs: [],
      });
    }

    const applied = await Application.find({ applicant: req.id }).distinct(
      "job",
    );
    const hits = await searchSimilar({
      kind: "job",
      vector,
      excludeRefIds: applied,
      limit: limit * 3, // headroom: inactive jobs are dropped below
    });

    const jobs = await Job.find({
      _id: { $in: hits.map((h) => h.refId) },
      isActive: { $ne: false },
    })
      .select("title location jobType salary experienceLevel skills company")
      .populate("company", "name logo")
      .lean();
    const byId = new Map(jobs.map((j) => [String(j._id), j]));
    const userSkills = resume?.meta?.skills || [];

    res.json({
      success: true,
      mode: q ? "query" : "profile",
      jobs: keepStrong(hits.filter((h) => byId.has(h.refId)))
        .slice(0, limit)
        .map((h) => {
          const job = byId.get(h.refId);
          return {
            _id: job._id,
            title: job.title,
            company: job.company
              ? {
                  _id: job.company._id,
                  name: job.company.name,
                  logo: job.company.logo,
                }
              : null,
            location: job.location,
            jobType: job.jobType,
            salary: job.salary,
            experienceLevel: job.experienceLevel,
            similarity: Math.round(h.score * 100) / 100,
            ...(userSkills.length
              ? skillOverlap(job.skills || [], userSkills)
              : {}),
          };
        }),
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/candidates",
  isAuthenticated,
  isRecruiter,
  aiLimiter,
  async (req, res, next) => {
    try {
      if (!embeddingsConfigured()) return unavailable(res);
      const q = readQuery(req, res, { required: true, max: 300 });
      if (q === null) return;
      const limit = parseLimit(req.query.limit, 10);

      const managed = await Job.find({
        $or: [
          { created_by: req.user._id },
          ...(req.user.companyId ? [{ company: req.user.companyId }] : []),
        ],
      })
        .select("title")
        .lean();
      let jobIds = managed.map((j) => j._id);
      if (req.query.jobId) {
        if (
          !mongoose.isValidObjectId(req.query.jobId) ||
          !jobIds.some((id) => String(id) === req.query.jobId)
        ) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }
        jobIds = [new mongoose.Types.ObjectId(req.query.jobId)];
      }
      if (jobIds.length === 0)
        return res.json({ success: true, candidates: [] });

      const hits = await searchSimilar({
        kind: "applicant",
        vector: await embedQuery(q),
        filter: { "meta.jobId": { $in: jobIds } },
        limit,
      });

      const screenings = await ApplicantScreening.find({
        applicationId: { $in: hits.map((h) => h.refId) },
        status: "completed",
      })
        .select("applicationId jobId score signals profile.experience flags")
        .lean();
      const byApplication = new Map(
        screenings.map((s) => [String(s.applicationId), s]),
      );
      const titles = new Map(managed.map((j) => [String(j._id), j.title]));

      res.json({
        success: true,
        candidates: keepStrong(
          hits.filter((h) => byApplication.has(h.refId)),
        ).map((h) => {
          const s = byApplication.get(h.refId);
          return {
            applicationId: s.applicationId,
            screeningId: s._id,
            jobId: s.jobId,
            jobTitle: titles.get(String(s.jobId)) ?? null,
            similarity: Math.round(h.score * 100) / 100,
            score: s.score?.overall ?? null,
            band: s.score?.band ?? null,
            headline: s.profile?.experience?.[0]?.title ?? null,
            years: s.signals?.experience?.years ?? null,
            topSkills: (s.signals?.skills || []).slice(0, 8).map((k) => k.name),
            flagged: (s.flags || []).some((f) => f.type !== "warning"),
          };
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
