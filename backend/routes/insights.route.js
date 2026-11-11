/**
 * Insights Routes - AI-Generated Hiring Insights
 */

import { aiLimiter } from "../middlewares/rateLimiters.js";
import express from "express";
import isAuthenticated, { isRecruiter } from "../middlewares/isAuthenticated.js";
import {
  getHiringInsights,
  refreshInsights,
} from "../controllers/insights.controller.js";

const router = express.Router();

// Get AI hiring insights for CEO dashboard
router.route("/hiring").get(isAuthenticated, isRecruiter, getHiringInsights);

// Force refresh insights
router.route("/refresh").post(isAuthenticated, isRecruiter, aiLimiter, refreshInsights);

export default router;
