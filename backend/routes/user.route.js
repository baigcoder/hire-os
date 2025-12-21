import express from "express";
import {
  login,
  logout,
  register,
  updateProfile,
  getCurrentUser,
  changePassword,
  changeInitialPassword,
  unlockAccount,
  deleteAccount,
  refreshToken,
  updateProfilePhoto,
  supabaseSync,
} from "../controllers/user.controller.js";
// TODO: Uncomment after npm install
// import {
//     forgotPassword,
//     verifyResetToken,
//     resetPassword
// } from "../controllers/passwordReset.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleUpload } from "../middlewares/mutler.js";
import {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
} from "../middlewares/validation.js";
// Performance & Security middleware
import {
  authLimiter,
  uploadLimiter,
  passwordResetLimiter,
  syncLimiter,
} from "../middlewares/rateLimiters.js";
import { auditMiddleware, auditActions } from "../utils/auditLogger.js";
// TODO: Uncomment after npm install
// import {
//     validate,
//     forgotPasswordSchema,
//     resetPasswordSchema,
//     changePasswordSchema
// } from "../middlewares/validation.schemas.js";

const router = express.Router();

// Apply audit middleware to all routes
router.use(auditMiddleware);

// Public routes - WITH RATE LIMITING for security 🔒
router
  .route("/register")
  .post(authLimiter, singleUpload, validateRegistration, register);
router.route("/login").post(authLimiter, validateLogin, login);
router.route("/logout").get(logout);
router
  .route("/change-initial-password")
  .post(authLimiter, changeInitialPassword); // For first-time recruiter login
router.route("/unlock-account").post(authLimiter, unlockAccount); // Reset failed login attempts

// Password reset routes (public) - TODO: Uncomment after npm install
// router.route("/forgot-password").post(passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
// router.route("/verify-reset-token/:token").get(verifyResetToken);
// router.route("/reset-password").post(passwordResetLimiter, validate(resetPasswordSchema), resetPassword);

// Supabase authentication sync (public - called after Supabase auth)
router.route("/supabase-sync").post(syncLimiter, supabaseSync);

// Protected routes
router.route("/me").get(isAuthenticated, getCurrentUser);
router
  .route("/profile/update")
  .post(
    isAuthenticated,
    uploadLimiter,
    singleUpload,
    validateProfileUpdate,
    updateProfile,
  );
router
  .route("/profile/photo")
  .post(isAuthenticated, uploadLimiter, singleUpload, updateProfilePhoto);
router.route("/change-password").post(isAuthenticated, changePassword);
router.route("/delete-account").post(isAuthenticated, deleteAccount);
router.route("/refresh-token").get(isAuthenticated, refreshToken);

export default router;
