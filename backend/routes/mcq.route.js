import express from "express";
import isAuthenticated, {
  isRecruiter,
} from "../middlewares/isAuthenticated.js";
import {
  generateMCQTest,
  getMCQTest,
  submitAnswer,
  submitMCQTest,
  reportSuspiciousActivity,
  getMCQTestResults,
} from "../controllers/mcq.controller.js";

const router = express.Router();

// Recruiter routes - generate and view tests
router
  .route("/generate/:applicationId")
  .post(isAuthenticated, isRecruiter, generateMCQTest);
router
  .route("/results/:testId")
  .get(isAuthenticated, isRecruiter, getMCQTestResults);

// Candidate routes - take tests
router.route("/:testId").get(isAuthenticated, getMCQTest);
router.route("/:testId/answer").post(isAuthenticated, submitAnswer);
router.route("/:testId/submit").post(isAuthenticated, submitMCQTest);
router
  .route("/:testId/suspicious")
  .post(isAuthenticated, reportSuspiciousActivity);

export default router;
