/**
 * Interview copilot API (per interview, roles from the interview itself).
 *
 *   POST /:id/audio            either participant: one chunk of their own mic
 *   GET  /:id                  recruiter: scorecard, suggestions, transcript
 *   POST /:id/scorecard        recruiter: (re)generate the scorecard
 *   POST /:id/refresh          recruiter: run the copilot now
 *   POST /:id/draft            recruiter: draft ratings from the transcript
 *   PUT  /:id/competencies/:competencyId/rating   recruiter: 1–4 + notes
 *   PUT  /:id/overall          recruiter: overall recommendation
 */
import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { resolveAccess } from "../modules/integrity/service.js";
import {
  ingestAudio,
  copilotView,
  ensureScorecard,
  scheduleRefresh,
  requestDraft,
  rateCompetency,
  setOverall,
  CopilotError,
  MAX_CHUNK_BYTES,
} from "../modules/copilot/service.js";
import { transcriptionConfigured } from "../modules/copilot/transcribe.js";

const router = express.Router();

// ~4 chunks a minute per speaker, plus retries
const audioLimiter = rateLimit({
  windowMs: 60_000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `copilot-audio:${req.id}`,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, code: "RATE_LIMITED", message: "Too many audio chunks" },
});

router.use(isAuthenticated);

router.param("interviewId", async (req, res, next, interviewId) => {
  try {
    if (!mongoose.isValidObjectId(interviewId)) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }
    const access = await resolveAccess(interviewId, req.id);
    if (!access.role) return res.status(404).json({ success: false, message: "Interview not found" });
    req.copilot = access;
    next();
  } catch (error) {
    next(error);
  }
});

const recruiterOnly = (req, res, next) =>
  req.copilot.role === "recruiter"
    ? next()
    : res.status(403).json({ success: false, message: "Only the interviewer can use the copilot" });

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof CopilotError) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    next(error);
  }
};

router.post(
  "/:interviewId/audio",
  audioLimiter,
  express.raw({ type: "audio/*", limit: MAX_CHUNK_BYTES }),
  handle(async (req, res) => {
    if (!transcriptionConfigured()) {
      return res.status(503).json({ success: false, code: "TRANSCRIPTION_UNAVAILABLE", message: "Transcription isn't configured" });
    }
    const result = await ingestAudio(req.copilot.interview, req.copilot.role, req.id, {
      buffer: req.body,
      mimeType: req.get("content-type"),
      seq: Number(req.get("x-chunk-seq")),
      startedAt: Number(req.get("x-chunk-started-at")),
    });
    // The candidate doesn't get the text back: they see nothing live
    res.status(201).json({ success: true, segments: result.segments });
  }),
);

router.get(
  "/:interviewId",
  recruiterOnly,
  handle(async (req, res) => {
    const view = await copilotView(req.copilot.interview, { since: req.query.since });
    if (!view.scorecard) {
      await ensureScorecard(req.copilot.interview);
      view.scorecard = { status: "generating" };
    }
    res.set("Cache-Control", "no-store").json({
      success: true,
      transcriptionConfigured: transcriptionConfigured(),
      ...view,
    });
  }),
);

router.post(
  "/:interviewId/scorecard",
  recruiterOnly,
  handle(async (req, res) => {
    const status = await ensureScorecard(req.copilot.interview, { force: req.query.force === "1" });
    res.status(202).json({ success: true, status });
  }),
);

router.post(
  "/:interviewId/refresh",
  recruiterOnly,
  handle(async (req, res) => {
    const queued = await scheduleRefresh(req.copilot.interview._id, { immediate: true });
    if (!queued) throw new CopilotError(409, "NOT_READY", "The scorecard isn't ready yet");
    res.status(202).json({ success: true });
  }),
);

router.post(
  "/:interviewId/draft",
  recruiterOnly,
  handle(async (req, res) => {
    if (!(await requestDraft(req.copilot.interview._id))) {
      throw new CopilotError(409, "NOT_READY", "The scorecard isn't ready yet");
    }
    res.status(202).json({ success: true, status: "queued" });
  }),
);

router.put(
  "/:interviewId/competencies/:competencyId/rating",
  recruiterOnly,
  handle(async (req, res) => {
    await rateCompetency(req.copilot.interview, req.params.competencyId, req.body ?? {}, req.id);
    res.json({ success: true });
  }),
);

router.put(
  "/:interviewId/overall",
  recruiterOnly,
  handle(async (req, res) => {
    await setOverall(req.copilot.interview, req.body ?? {}, req.id);
    res.json({ success: true });
  }),
);

export default router;
