import express from "express";
import PracticeHistory from "../models/practiceHistory.model.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

/**
 * Get user's practice history with pagination and filters
 * GET /api/v1/practice-history
 */
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const userId = req.id;

    const query = { user: userId };
    if (type && type !== "all") {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      PracticeHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PracticeHistory.countDocuments(query),
    ]);

    res.json({
      success: true,
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[PracticeHistory] Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch practice history",
      error: error.message,
    });
  }
});

/**
 * Get user's practice stats
 * GET /api/v1/practice-history/stats
 */
router.get("/stats", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const stats = await PracticeHistory.getUserStats(userId);

    // Get recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentActivity = await PracticeHistory.countDocuments({
      user: userId,
      createdAt: { $gte: weekAgo },
    });

    res.json({
      success: true,
      stats,
      recentActivity,
    });
  } catch (error) {
    console.error("[PracticeHistory] Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch practice stats",
      error: error.message,
    });
  }
});

/**
 * Get specific practice session details
 * GET /api/v1/practice-history/:id
 */
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const session = await PracticeHistory.findOne({
      _id: id,
      user: userId,
    }).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Practice session not found",
      });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("[PracticeHistory] Get session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch practice session",
      error: error.message,
    });
  }
});

/**
 * Save a practice session (internal use by mock test/interview)
 * POST /api/v1/practice-history
 */
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const { type, score, grade, duration, testData, interviewData, sessionId } =
      req.body;

    const newSession = new PracticeHistory({
      user: userId,
      type,
      score,
      grade,
      duration,
      testData,
      interviewData,
      sessionId,
      completedAt: new Date(),
    });

    await newSession.save();

    console.log(
      `✅ [PracticeHistory] Saved ${type} session for user ${userId}`,
    );

    res.status(201).json({
      success: true,
      message: "Practice session saved",
      session: newSession,
    });
  } catch (error) {
    console.error("[PracticeHistory] Save session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save practice session",
      error: error.message,
    });
  }
});

/**
 * Delete a practice session
 * DELETE /api/v1/practice-history/:id
 */
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const result = await PracticeHistory.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Practice session not found",
      });
    }

    res.json({
      success: true,
      message: "Practice session deleted",
    });
  } catch (error) {
    console.error("[PracticeHistory] Delete session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete practice session",
      error: error.message,
    });
  }
});

export default router;
