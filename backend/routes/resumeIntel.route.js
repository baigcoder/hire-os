/**
 * Resume intelligence API (Phase 2). Mounted at /api/v1/resume-intel.
 *
 *   GET    /capabilities          is the pipeline available (worker running)?
 *   POST   /analyses              upload PDF/DOCX ("resume") or resumeText,
 *                                 optional jobId or jobDescription → 202
 *   GET    /analyses              caller's recent analyses (summaries)
 *   GET    /analyses/:id          full report (owner only)
 *   GET    /analyses/:id/events   SSE progress stream (owner only)
 *   DELETE /analyses/:id          delete a report and its stored resume text
 */
import crypto from "crypto";
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { aiLimiter } from "../middlewares/rateLimiters.js";
import { Job } from "../models/job.model.js";
import { ResumeReport } from "../models/resumeReport.model.js";
import queue from "../platform/queue/index.js";
import { RESUME_ANALYZE_JOB } from "../jobs/resumeAnalyze.js";
import {
  extractResume,
  ExtractionError,
  SUPPORTED_MIME_TYPES,
} from "../modules/resume-intel/extract.js";
import { PIPELINE_VERSION, STAGES } from "../modules/resume-intel/pipeline.js";
import { jobToText } from "../modules/resume-intel/requirements.js";
import logger from "../utils/logger.js";

const router = express.Router();

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_JD_CHARS = 8000;
const REUSE_WINDOW_MS = 7 * 24 * 3600 * 1000;
const dailyLimit = () => Number(process.env.RESUME_ANALYSES_PER_DAY) || 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) =>
    SUPPORTED_MIME_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(
          new ExtractionError(
            "UNSUPPORTED_FORMAT",
            "Upload a PDF or DOCX resume.",
          ),
        ),
});

const acceptUpload = (req, res, next) =>
  upload.single("resume")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof ExtractionError) {
      return res
        .status(400)
        .json({ success: false, code: error.code, message: error.message });
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        code: "FILE_TOO_LARGE",
        message: "Resume files must be 5 MB or smaller.",
      });
    }
    next(error);
  });

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const isPipelineAvailable = () => queue.hasActiveWorker(RESUME_ANALYZE_JOB);

const findOwned = (id, userId, projection) =>
  mongoose.isValidObjectId(id)
    ? ResumeReport.findOne({ _id: id, userId }, projection)
    : null;

router.get("/capabilities", isAuthenticated, async (req, res, next) => {
  try {
    res.json({
      success: true,
      available: await isPipelineAvailable(),
      pipelineVersion: PIPELINE_VERSION,
      formats: ["pdf", "docx", "text"],
      maxUploadMb: MAX_UPLOAD_BYTES / (1024 * 1024),
      dailyLimit: dailyLimit(),
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/analyses",
  isAuthenticated,
  aiLimiter,
  acceptUpload,
  async (req, res, next) => {
    try {
      if (!(await isPipelineAvailable())) {
        return res.status(503).json({
          success: false,
          code: "PIPELINE_UNAVAILABLE",
          message:
            "Resume analysis workers are offline. Please try again later.",
        });
      }

      // Input: file or pasted text
      let extracted;
      try {
        extracted = req.file
          ? await extractResume({
              buffer: req.file.buffer,
              mimetype: req.file.mimetype,
            })
          : await extractResume({ text: String(req.body.resumeText ?? "") });
      } catch (error) {
        if (error instanceof ExtractionError) {
          return res
            .status(400)
            .json({ success: false, code: error.code, message: error.message });
        }
        throw error;
      }

      // Optional target job: a posted job, or a pasted description
      let target = null;
      const { jobId } = req.body;
      if (jobId) {
        if (!mongoose.isValidObjectId(jobId)) {
          return res
            .status(400)
            .json({
              success: false,
              code: "INVALID_JOB",
              message: "Invalid job ID.",
            });
        }
        const job = await Job.findById(jobId)
          .select("title description requirements skills experienceLevel")
          .lean();
        if (!job) {
          return res
            .status(404)
            .json({
              success: false,
              code: "JOB_NOT_FOUND",
              message: "Job not found.",
            });
        }
        target = {
          jobId: job._id,
          title: job.title,
          minYears: job.experienceLevel,
          text: jobToText(job),
        };
      } else if (
        typeof req.body.jobDescription === "string" &&
        req.body.jobDescription.trim()
      ) {
        const text = req.body.jobDescription.trim();
        if (text.length < 50) {
          return res
            .status(400)
            .json({
              success: false,
              code: "JD_TOO_SHORT",
              message: "The job description is too short to analyze.",
            });
        }
        if (text.length > MAX_JD_CHARS) {
          return res
            .status(400)
            .json({
              success: false,
              code: "JD_TOO_LONG",
              message: `Job descriptions are limited to ${MAX_JD_CHARS.toLocaleString()} characters.`,
            });
        }
        target = { title: null, minYears: null, text };
      }

      // Same resume + same job + same pipeline: reuse instead of re-spending tokens
      const dedupeKey = sha256(
        [
          req.id,
          extracted.hash,
          target ? sha256(target.text) : "none",
          PIPELINE_VERSION,
        ].join(":"),
      );
      const existing = await ResumeReport.findOne({
        userId: req.id,
        dedupeKey,
        $or: [
          { status: { $in: ["queued", "running"] } },
          {
            status: "completed",
            completedAt: { $gte: new Date(Date.now() - REUSE_WINDOW_MS) },
          },
        ],
      })
        .sort({ createdAt: -1 })
        .select("status")
        .lean();
      if (existing) {
        return res.status(existing.status === "completed" ? 200 : 202).json({
          success: true,
          analysisId: existing._id,
          status: existing.status,
          reused: true,
        });
      }

      const createdToday = await ResumeReport.countDocuments({
        userId: req.id,
        createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
      });
      if (createdToday >= dailyLimit()) {
        return res.status(429).json({
          success: false,
          code: "DAILY_LIMIT",
          message: `You've reached today's limit of ${dailyLimit()} resume analyses. Try again tomorrow.`,
        });
      }

      const report = await ResumeReport.create({
        userId: req.id,
        pipelineVersion: PIPELINE_VERSION,
        dedupeKey,
        input: {
          source: extracted.format,
          fileName: req.file?.originalname?.slice(0, 200),
          pages: extracted.pages,
          chars: extracted.chars,
          truncated: extracted.truncated,
          textHash: extracted.hash,
          jobId: target?.jobId,
          jobTitle: target?.title,
          minYears: target?.minYears,
          jobDescription: target?.text,
        },
        resumeText: extracted.text,
        warnings: extracted.warnings,
        stages: STAGES.map((s) => ({
          ...s,
          status:
            !target && ["requirements", "match"].includes(s.id)
              ? "skipped"
              : "pending",
        })),
      });

      const job = await queue.enqueue(
        RESUME_ANALYZE_JOB,
        { reportId: String(report._id) },
        { dedupeKey: `resume-report:${report._id}`, maxAttempts: 2 },
      );
      await ResumeReport.updateOne(
        { _id: report._id },
        { $set: { jobQueueId: job._id } },
      );

      logger.info("Resume analysis queued", {
        reportId: String(report._id),
        withJob: Boolean(target),
      });
      res
        .status(202)
        .json({ success: true, analysisId: report._id, status: "queued" });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/analyses", isAuthenticated, async (req, res, next) => {
  try {
    const reports = await ResumeReport.find({ userId: req.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select(
        "status score.overall score.band score.mode input.jobTitle input.fileName input.source createdAt completedAt degraded",
      )
      .lean();
    res.json({ success: true, analyses: reports });
  } catch (error) {
    next(error);
  }
});

router.get("/analyses/:id", isAuthenticated, async (req, res, next) => {
  try {
    const report = await findOwned(req.params.id, req.id)?.lean();
    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Analysis not found" });
    }
    res.json({ success: true, analysis: report });
  } catch (error) {
    next(error);
  }
});

/**
 * Server-Sent Events: `progress` whenever status/stages change, then `done`.
 * Closes after ~25s so it fits serverless limits; EventSource reconnects.
 */
router.get("/analyses/:id/events", isAuthenticated, async (req, res, next) => {
  try {
    const owned = await findOwned(req.params.id, req.id, "_id")?.lean();
    if (!owned) {
      return res
        .status(404)
        .json({ success: false, message: "Analysis not found" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    let last = "";
    let closed = false;
    const started = Date.now();
    req.on("close", () => {
      closed = true;
    });

    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      res.flush?.(); // compression middleware buffers otherwise
    };

    while (!closed) {
      const report = await ResumeReport.findById(owned._id)
        .select("status stages error score.overall score.band")
        .lean();
      if (!report) {
        send("done", { status: "deleted" });
        break;
      }
      const snapshot = JSON.stringify([
        report.status,
        report.stages,
        report.error,
      ]);
      if (snapshot !== last) {
        last = snapshot;
        send("progress", {
          status: report.status,
          stages: report.stages,
          error: report.error,
        });
      }
      if (["completed", "failed"].includes(report.status)) {
        send("done", {
          status: report.status,
          score: report.score ?? null,
          error: report.error ?? null,
        });
        break;
      }
      if (Date.now() - started > 25_000) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    res.end();
  } catch (error) {
    if (res.headersSent) return res.end();
    next(error);
  }
});

router.delete("/analyses/:id", isAuthenticated, async (req, res, next) => {
  try {
    const report = await findOwned(req.params.id, req.id, "_id");
    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Analysis not found" });
    }
    await ResumeReport.deleteOne({ _id: report._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
