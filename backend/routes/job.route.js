import express from "express";
import isAuthenticated, {
  isRecruiter,
  isStudent,
  isCompanyAdmin,
} from "../middlewares/isAuthenticated.js";
import { validateJobPosting } from "../middlewares/validation.js";
// Performance & Security middleware
import {
  cacheJobs,
  cacheJobDetails,
  invalidateJobsCache,
} from "../middlewares/cacheMiddleware.js";
import {
  aiLimiter,
  jobPostLimiter,
  searchLimiter,
} from "../middlewares/rateLimiters.js";
import { auditMiddleware } from "../utils/auditLogger.js";
import {
  postJob,
  getAllJobs,
  getJobById,
  getAdminJobs,
  getCompanyJobs,
  updateJob,
  deleteJob,
  toggleJobStatus,
  toggleSaveJob,
  getSavedJobs,
  getRecommendedJobs,
  getJobStats,
  getJobReportStats,
  getAIMatchedJobs,
  getJobMatchScore,
  getSimilarJobs,
  getPublicJobsByCompanyId,
} from "../controllers/job.controller.js";

const router = express.Router();

// Apply audit middleware to all routes
router.use(auditMiddleware);

// Public routes - WITH CACHING for performance ⚡
router.route("/get").get(searchLimiter, cacheJobs, getAllJobs);
router.route("/get/:id").get(cacheJobDetails, getJobById);
router.route("/:id/similar").get(cacheJobDetails, getSimilarJobs);
router.route("/company/:companyId").get(getPublicJobsByCompanyId); // Public company jobs

// Protected routes - Students
router.route("/save/:id").post(isAuthenticated, toggleSaveJob);
router.route("/saved").get(isAuthenticated, getSavedJobs);
router
  .route("/recommended")
  .get(isAuthenticated, aiLimiter, getRecommendedJobs);
router.route("/ai-matched").get(isAuthenticated, aiLimiter, getAIMatchedJobs);
router
  .route("/:id/match-score")
  .get(isAuthenticated, aiLimiter, getJobMatchScore);

// Protected routes - Recruiters (view company jobs)
router.route("/company-jobs").get(isAuthenticated, getCompanyJobs);
router.route("/getadminjobs").get(isAuthenticated, getAdminJobs);

// Protected routes - Company Admin only (create/update/delete jobs)
// Note: invalidateJobsCache runs AFTER successful response to clear cache
router
  .route("/post")
  .post(
    isAuthenticated,
    isCompanyAdmin,
    jobPostLimiter,
    validateJobPosting,
    invalidateJobsCache,
    postJob,
  );
router
  .route("/update/:id")
  .put(isAuthenticated, isCompanyAdmin, invalidateJobsCache, updateJob);
router
  .route("/delete/:id")
  .delete(isAuthenticated, isCompanyAdmin, invalidateJobsCache, deleteJob);
router
  .route("/toggle-status/:id")
  .patch(isAuthenticated, isCompanyAdmin, invalidateJobsCache, toggleJobStatus);
router.route("/stats").get(isAuthenticated, getJobStats);
router.route("/:id/report/stats").get(isAuthenticated, getJobReportStats);

export default router;
