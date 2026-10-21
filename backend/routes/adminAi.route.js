import express from "express";
import isAuthenticated, {
  isSuperAdmin,
} from "../middlewares/isAuthenticated.js";
import { AiRun } from "../models/aiRun.model.js";
import ai from "../platform/ai-gateway/index.js";

const router = express.Router();

router.use(isAuthenticated, isSuperAdmin);

/**
 * GET /api/v1/admin/ai/stats?hours=24
 * Per task + model: calls, errors, cache hits, fallbacks, latency, tokens.
 */
router.get("/stats", async (req, res, next) => {
  try {
    const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 720);
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const rows = await AiRun.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { task: "$task", model: "$model" },
          calls: { $sum: 1 },
          errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
          cached: { $sum: { $cond: ["$cached", 1, 0] } },
          degraded: { $sum: { $cond: ["$degraded", 1, 0] } },
          avgLatencyMs: { $avg: "$latencyMs" },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
        },
      },
      { $sort: { calls: -1 } },
    ]);

    res.json({
      success: true,
      since,
      stats: rows.map(({ _id, avgLatencyMs, ...rest }) => ({
        task: _id.task,
        model: _id.model ?? null,
        ...rest,
        avgLatencyMs: Math.round(avgLatencyMs ?? 0),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/v1/admin/ai/limits — last known Groq budget per model. */
router.get("/limits", (req, res) => {
  res.json({ success: true, limits: ai.limiterSnapshot() });
});

export default router;
