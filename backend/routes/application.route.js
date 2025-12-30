import express from "express";
import isAuthenticated, {
  isRecruiter,
} from "../middlewares/isAuthenticated.js";
// Performance & Security middleware
import { applicationLimiter, aiLimiter } from "../middlewares/rateLimiters.js";
import { auditMiddleware } from "../utils/auditLogger.js";
import {
  applyJob,
  getApplicants,
  getAppliedJobs,
  updateStatus,
  completeInterview,
  getInterviewNotifications,
  markInterviewAsViewed,
  passToCEO,
  getRecruiterNotifications,
  getRankedApplicants,
  bulkUpdateStatus,
  getCompanyApplications,
} from "../controllers/application.controller.js";

const router = express.Router();

// Apply audit middleware to all routes
router.use(auditMiddleware);

// Student application routes - WITH RATE LIMITING 🔒
router.route("/apply/:id").post(isAuthenticated, applicationLimiter, applyJob);
router.route("/get").get(isAuthenticated, getAppliedJobs);

// Recruiter routes - viewing applicants (requires recruiter role)
router
  .route("/:id/applicants")
  .get(isAuthenticated, isRecruiter, getApplicants);
router
  .route("/:id/ranked-applicants")
  .get(isAuthenticated, isRecruiter, aiLimiter, getRankedApplicants);
router
  .route("/status/:id/update")
  .post(isAuthenticated, isRecruiter, updateStatus);
router
  .route("/bulk-update")
  .post(isAuthenticated, isRecruiter, bulkUpdateStatus);

// Interview routes (requires recruiter role)
router
  .route("/interview/:id/complete")
  .post(isAuthenticated, isRecruiter, completeInterview);
router.route("/interviews").get(isAuthenticated, getInterviewNotifications);
router
  .route("/interview/:id/view")
  .post(isAuthenticated, markInterviewAsViewed);

// Recruiter routes - passing to CEO
router.route("/:id/pass-to-ceo").post(isAuthenticated, isRecruiter, passToCEO);
router
  .route("/recruiter/notifications")
router
  .route("/recruiter/notifications")
  .get(isAuthenticated, isRecruiter, getRecruiterNotifications);

// Get all applications for the logged in user's company (for pipeline and admin view)
router
  .route("/company")
  .get(isAuthenticated, isRecruiter, getCompanyApplications);

export default router;
