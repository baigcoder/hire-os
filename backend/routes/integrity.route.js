/**
 * Live-interview integrity API.
 *
 * Roles are per interview, not per account: the interview's candidate may
 * only consent, send signed batches, upload evidence frames and see their
 * own report afterwards; recruiters who can manage the interview see the
 * live state, run the verifier, annotate and read reports. Everyone else
 * gets 404.
 */
import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import logger from "../utils/logger.js";
import { IntegritySession } from "../models/integritySession.model.js";
import { MONITORING_POLICY } from "../modules/integrity/signals.js";
import { subscribe } from "../modules/integrity/live.js";
import {
  resolveAccess,
  recordConsent,
  ingestCandidateBatch,
  ingestRecruiterBatch,
  storeEvidence,
  evidenceLink,
  annotateSignal,
  recruiterSnapshot,
  candidateView,
  addDispute,
  requestReport,
  IntegrityError,
  eventId,
} from "../modules/integrity/service.js";

const router = express.Router();

const SSE_KEEPALIVE_MS = 20_000;

// Batches arrive every ~5 s; allow bursts after a reconnect
const ingestLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `integrity:${req.id}`,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, code: "RATE_LIMITED", message: "Too many monitoring requests" },
});

router.get("/policy", (req, res) => res.json({ success: true, policy: MONITORING_POLICY }));

router.use(isAuthenticated);

router.param("interviewId", async (req, res, next, interviewId) => {
  try {
    if (!mongoose.isValidObjectId(interviewId)) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }
    const access = await resolveAccess(interviewId, req.id);
    if (!access.role) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }
    req.integrity = access;
    next();
  } catch (error) {
    next(error);
  }
});

const only = (role) => (req, res, next) =>
  req.integrity.role === role
    ? next()
    : res.status(403).json({ success: false, message: `Only the interview's ${role} can do this` });

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof IntegrityError) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    next(error);
  }
};

router.get(
  "/:interviewId",
  handle(async (req, res) => {
    const { interview, role } = req.integrity;
    const data = role === "recruiter" ? await recruiterSnapshot(interview) : await candidateView(interview);
    res.set("Cache-Control", "no-store").json({ success: true, role, ...data });
  }),
);

router.post(
  "/:interviewId/consent",
  only("candidate"),
  handle(async (req, res) => {
    if (typeof req.body?.accept !== "boolean") {
      return res.status(400).json({ success: false, message: "accept must be true or false" });
    }
    const result = await recordConsent(req.integrity.interview, {
      accept: req.body.accept,
      userAgent: req.get("user-agent"),
    });
    res.set("Cache-Control", "no-store").json({ success: true, ...result });
  }),
);

router.post(
  "/:interviewId/events",
  ingestLimiter,
  only("candidate"),
  handle(async (req, res) => {
    const result = await ingestCandidateBatch(req.integrity.interview, req.body);
    res.json({ success: true, ...result });
  }),
);

router.post(
  "/:interviewId/observations",
  ingestLimiter,
  only("recruiter"),
  handle(async (req, res) => {
    const result = await ingestRecruiterBatch(req.integrity.interview, req.body);
    res.json({ success: true, ...result });
  }),
);

router.post(
  "/:interviewId/evidence",
  ingestLimiter,
  handle(async (req, res) => {
    const { image, signal, at } = req.body ?? {};
    const result = await storeEvidence(req.integrity.interview, req.integrity.role, { image, signal, at });
    res.status(201).json({ success: true, ...result });
  }),
);

router.get(
  "/:interviewId/evidence/:evidenceId",
  only("recruiter"),
  handle(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.evidenceId)) {
      return res.status(404).json({ success: false, message: "Evidence not found" });
    }
    const url = await evidenceLink(req.integrity.interview, req.params.evidenceId);
    res.set("Cache-Control", "no-store").set("Referrer-Policy", "no-referrer");
    // ?format=json for browser clients that send a Bearer token and then
    // open the short-lived URL themselves
    if (req.query.format === "json") return res.json({ success: true, url, expiresIn: 60 });
    res.redirect(302, url);
  }),
);

// Server-sent events: risk updates, alerts and tamper flags as they happen
router.get("/:interviewId/live", only("recruiter"), async (req, res) => {
  const interviewId = String(req.integrity.interview._id);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event, data) => res.write(`id: ${eventId()}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    send("snapshot", await recruiterSnapshot(req.integrity.interview));
  } catch (error) {
    logger.warn("Integrity snapshot failed", { interviewId, error: error.message });
  }
  const unsubscribe = subscribe(interviewId, (payload) => send(payload.kind, payload));
  const keepAlive = setInterval(() => res.write(": keep-alive\n\n"), SSE_KEEPALIVE_MS);
  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

router.post(
  "/:interviewId/annotations",
  only("recruiter"),
  handle(async (req, res) => {
    const { signal, expected, note } = req.body ?? {};
    if (typeof expected !== "boolean") {
      return res.status(400).json({ success: false, message: "expected must be true or false" });
    }
    const risk = await annotateSignal(req.integrity.interview, { signal, expected, note }, req.id);
    res.json({ success: true, risk });
  }),
);

router.get(
  "/:interviewId/report",
  handle(async (req, res) => {
    const { interview, role } = req.integrity;
    const session = await IntegritySession.findOne({ interviewId: interview._id }).select("status report disputes").lean();
    const report = session?.report;
    // Candidates see their report only after the call (B4: nothing live)
    if (role === "candidate" && session?.status !== "ended") {
      return res.status(404).json({ success: false, message: "No report yet" });
    }
    res.set("Cache-Control", "no-store").json({
      success: true,
      status: report?.status ?? "none",
      generatedAt: report?.generatedAt,
      report: report?.status === "ready" ? report.data : null,
      disputes: session?.disputes ?? [],
    });
  }),
);

router.post(
  "/:interviewId/report",
  only("recruiter"),
  handle(async (req, res) => {
    const session = await IntegritySession.findOne({ interviewId: req.integrity.interview._id });
    if (!session || session.status !== "ended") {
      return res.status(409).json({ success: false, code: "NOT_ENDED", message: "Reports are generated after the interview ends" });
    }
    await requestReport(session);
    res.status(202).json({ success: true, status: "queued" });
  }),
);

router.post(
  "/:interviewId/disputes",
  only("candidate"),
  handle(async (req, res) => {
    const result = await addDispute(req.integrity.interview, req.body?.text);
    res.status(201).json({ success: true, ...result });
  }),
);

export default router;
