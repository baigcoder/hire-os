import express from "express";
import isAuthenticated, {
  isCompanyAdmin,
  checkUsageLimit,
} from "../middlewares/isAuthenticated.js";
import {
  getCompany,
  getCompanyById,
  registerCompany,
  updateCompany,
  inviteRecruiter,
  acceptRecruiterInvitation,
  getRecruiters,
  updateRecruiter,
  removeRecruiter,
  getCompanyDashboard,
  resendInvitation,
  getPendingApprovals,
  approveCandidateHire,
  updateCompanyProfile,
  getRecruiterPerformance,
  getFeaturedCompanies,
} from "../controllers/company.controller.js";
import { singleUpload } from "../middlewares/mutler.js";

const router = express.Router();

// Public routes
router.route("/accept-invite").post(acceptRecruiterInvitation);
router.route("/featured").get(getFeaturedCompanies);

// Company registration (creates both company and admin user)
router.route("/register").post(registerCompany);

// Protected routes
router.route("/get").get(isAuthenticated, getCompany);
router.route("/get/:id").get(isAuthenticated, getCompanyById);
router.route("/update/:id").put(isAuthenticated, singleUpload, updateCompany);

// Company Admin Dashboard
router.route("/dashboard").get(isAuthenticated, getCompanyDashboard);

// Company Profile Update (CEO can change name, recruiter cannot)
router
  .route("/profile")
  .put(isAuthenticated, singleUpload, updateCompanyProfile);

// Recruiter Management (Company Admin only)
router.route("/recruiters").get(isAuthenticated, isCompanyAdmin, getRecruiters);
router
  .route("/recruiters/invite")
  .post(
    isAuthenticated,
    isCompanyAdmin,
    checkUsageLimit("recruiter"),
    inviteRecruiter,
  );
router
  .route("/recruiters/:recruiterId")
  .put(isAuthenticated, isCompanyAdmin, updateRecruiter);
router
  .route("/recruiters/:recruiterId")
  .delete(isAuthenticated, isCompanyAdmin, removeRecruiter);
router
  .route("/recruiters/:recruiterId/resend-invite")
  .post(isAuthenticated, isCompanyAdmin, resendInvitation);

// CEO Exclusive Routes
router
  .route("/pending-approvals")
  .get(isAuthenticated, isCompanyAdmin, getPendingApprovals);
router
  .route("/candidates/:applicationId/approve")
  .post(isAuthenticated, isCompanyAdmin, approveCandidateHire);
router
  .route("/recruiter-performance")
  .get(isAuthenticated, isCompanyAdmin, getRecruiterPerformance);

export default router;
