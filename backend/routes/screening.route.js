/**
 * Recruiter screening API (Phase 3). Mounted at /api/v1/screening.
 * Every route checks that the recruiter can manage the job (jobAccess.js).
 *
 *   GET  /jobs/:jobId       ranked screenings + progress counts for a job
 *   POST /jobs/:jobId/run   queue screening for unscreened applicants
 *                           ({ force: true } re-screens everyone)
 *   GET  /:screeningId      one screening in full
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
import queue from "../platform/queue/index.js";
import { canManageJob } from "../utils/jobAccess.js";
import {
  APPLICANT_SCREEN_JOB,
  enqueueScreening,
} from "../modules/screening/enqueue.js";

const router = express.Router();
router.use(isAuthenticated, isRecruiter);

const MAX_PER_RUN = 200;

const loadManagedJob = async (req, res) => {
  const { jobId } = req.params;
  if (!mongoose.isValidObjectId(jobId)) {
    res.status(400).json({ success: false, message: "Invalid job ID" });
    return null;
  }
  const job = await Job.findById(jobId)
    .select("title created_by company")
    .lean();
  if (!job) {
    res.status(404).json({ success: false, message: "Job not found" });
    return null;
  }
  if (!canManageJob(req.user, job)) {
    res.status(403).json({ success: false, message: "Access denied" });
    return null;
  }
  return job;
};

const mustHaveCoverage = (screening) => {
  const musts = (screening.job?.requirements || []).filter(
    (r) => r.kind === "must",
  );
  const met = musts.filter((r) =>
    screening.matches?.some(
      (m) => m.requirementId === r.id && m.status === "met",
    ),
  ).length;
  return { met, total: musts.length };
};

router.get("/jobs/:jobId", async (req, res, next) => {
  try {
    const job = await loadManagedJob(req, res);
    if (!job) return;

    const [applications, screenings, workerAvailable] = await Promise.all([
      Application.find({ job: job._id })
        .select("applicant status createdAt")
        .populate("applicant", "fullname")
        .lean(),
      ApplicantScreening.find({ jobId: job._id })
        .select(
          "applicationId status score matches job.requirements summary.summary flags degraded error completedAt",
        )
        .lean(),
      queue.hasActiveWorker(APPLICANT_SCREEN_JOB),
    ]);

    const byApplication = new Map(
      screenings.map((s) => [String(s.applicationId), s]),
    );
    const counts = {
      total: applications.length,
      completed: 0,
      pending: 0,
      failed: 0,
      noResume: 0,
      notScreened: 0,
    };

    const candidates = applications.map((app) => {
      const s = byApplication.get(String(app._id));
      const status = s?.status ?? "not_screened";
      if (status === "completed") counts.completed++;
      else if (status === "queued" || status === "running") counts.pending++;
      else if (status === "failed") counts.failed++;
      else if (status === "no_resume") counts.noResume++;
      else counts.notScreened++;

      return {
        applicationId: app._id,
        screeningId: s?._id ?? null,
        name: app.applicant?.fullname ?? "Unknown applicant",
        appliedAt: app.createdAt,
        applicationStatus: app.status,
        status,
        score: s?.score?.overall ?? null,
        band: s?.score?.band ?? null,
        mustHave: s?.status === "completed" ? mustHaveCoverage(s) : null,
        summary: s?.summary?.summary ?? null,
        flags: (s?.flags || [])
          .filter((f) => f.type !== "warning")
          .map((f) => f.type),
        degraded: Boolean(s?.degraded),
        error: s?.error?.message ?? null,
      };
    });

    // Best first; unscored applicants after, newest first
    candidates.sort(
      (a, b) =>
        (b.score ?? -1) - (a.score ?? -1) ||
        new Date(b.appliedAt) - new Date(a.appliedAt),
    );

    res.json({
      success: true,
      job: { _id: job._id, title: job.title },
      counts,
      workerAvailable,
      candidates,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/jobs/:jobId/run", aiLimiter, async (req, res, next) => {
  try {
    const job = await loadManagedJob(req, res);
    if (!job) return;

    if (!(await queue.hasActiveWorker(APPLICANT_SCREEN_JOB))) {
      return res.status(503).json({
        success: false,
        code: "PIPELINE_UNAVAILABLE",
        message: "Screening workers are offline. Please try again later.",
      });
    }

    const force = req.body?.force === true;
    const applications = await Application.find({ job: job._id })
      .select("job applicant")
      .sort({ createdAt: -1 })
      .limit(MAX_PER_RUN)
      .lean();

    let queued = 0;
    for (const application of applications) {
      const outcome = await enqueueScreening(application, {
        force,
        requestedBy: req.id,
      });
      if (outcome === "queued") queued++;
    }
    res.json({ success: true, queued, considered: applications.length });
  } catch (error) {
    next(error);
  }
});

router.get("/:screeningId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.screeningId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid screening ID" });
    }
    const screening = await ApplicantScreening.findById(
      req.params.screeningId,
    ).lean();
    if (!screening) {
      return res
        .status(404)
        .json({ success: false, message: "Screening not found" });
    }
    const job = await Job.findById(screening.jobId)
      .select("created_by company")
      .lean();
    if (!canManageJob(req.user, job)) {
      return res
        .status(404)
        .json({ success: false, message: "Screening not found" });
    }
    res.json({ success: true, screening });
  } catch (error) {
    next(error);
  }
});

export default router;
