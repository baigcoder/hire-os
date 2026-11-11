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
  // Session management
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
} from "../controllers/user.controller.js";
import { forgotPassword, verifyResetToken, resetPassword } from "../controllers/passwordReset.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleUpload } from "../middlewares/mutler.js";
import rateLimit from "express-rate-limit";
import { sharedStore } from "../middlewares/rateLimiters.js";

// Guessing the current password with a stolen session: 5 wrong tries per 15 minutes per user
const passwordAttemptLimiter = rateLimit({
  store: sharedStore("pw-attempt"),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.id || req.ip),
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many attempts. Please try again later." },
});
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
import { validate, forgotPasswordSchema, resetPasswordSchema } from "../middlewares/validation.schemas.js";

const router = express.Router();

// Apply audit middleware to all routes
router.use(auditMiddleware);

// Public routes - WITH RATE LIMITING for security 🔒
router
  .route("/register")
  .post(singleUpload, authLimiter, validateRegistration, register);
router.route("/login").post(authLimiter, validateLogin, login);
// POST: a cross-site GET (image tag, link) must not be able to sign someone out
router.route("/logout").post(logout);
router
  .route("/change-initial-password")
  // Requires the session from logging in with the temporary password (S14)
  .post(authLimiter, isAuthenticated, changeInitialPassword); // For first-time recruiter login
router.route("/unlock-account").post(authLimiter, unlockAccount); // Reset failed login attempts

// Token refresh - public (uses refresh token cookie)
router.route("/refresh-token").post(refreshToken);

// Password reset (public): a one-hour link by email
router.route("/forgot-password").post(passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.route("/verify-reset-token/:token").get(verifyResetToken);
router.route("/reset-password").post(passwordResetLimiter, validate(resetPasswordSchema), resetPassword);

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
router.route("/change-password").post(isAuthenticated, passwordAttemptLimiter, changePassword);
router.route("/delete-account").post(isAuthenticated, passwordAttemptLimiter, deleteAccount);

// =============== SESSION MANAGEMENT ROUTES ===============
router.route("/sessions").get(isAuthenticated, getActiveSessions);
router.route("/sessions/:sessionId").delete(isAuthenticated, revokeSession);
router.route("/sessions/revoke-all").post(isAuthenticated, revokeAllSessions);

export default router;

