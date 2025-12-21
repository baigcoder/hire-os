/**
 * Trial Routes - Student Free Trial API Endpoints
 */

import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  initializeStudentTrial,
  checkTrialStatus,
  runTrialExpiryCheck,
} from "../utils/trialService.js";

const router = express.Router();

/**
 * GET /api/v1/trial/status
 * Get current trial status for authenticated user
 */
router.get("/status", isAuthenticated, async (req, res) => {
  try {
    const status = await checkTrialStatus(req.id);

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("Trial status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check trial status",
    });
  }
});

/**
 * POST /api/v1/trial/start
 * Manually start trial (usually triggered on signup)
 */
router.post("/start", isAuthenticated, async (req, res) => {
  try {
    const result = await initializeStudentTrial(req.id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: "Trial started successfully",
      ...result,
    });
  } catch (error) {
    console.error("Trial start error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start trial",
    });
  }
});

/**
 * POST /api/v1/trial/check-expiry
 * Admin endpoint to run trial expiry check manually
 */
router.post("/check-expiry", isAuthenticated, async (req, res) => {
  try {
    // Only allow admin or automated calls
    const result = await runTrialExpiryCheck();

    res.json({
      success: true,
      message: "Trial expiry check completed",
      ...result,
    });
  } catch (error) {
    console.error("Trial expiry check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run trial expiry check",
    });
  }
});

export default router;
