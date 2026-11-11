import express from "express";
import rateLimit from "express-rate-limit";
import { sharedStore } from "../middlewares/rateLimiters.js";
import {
  sendOTP,
  verifySignupOTP,
  verifyLoginOTP,
  resendOTP,
} from "../controllers/otp.controller.js";

const router = express.Router();

// Per-email throttle on every code route: stops mail-bombing a victim and
// repeated send/guess cycles. Skipped in tests.
const otpLimiter = rateLimit({
  store: sharedStore("otp"),
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || "").toLowerCase().trim() || req.ip,
  message: { success: false, message: "Too many attempts. Please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});
// And a per-IP cap on codes requested, so one machine can't mail many different addresses.
const otpIpLimiter = rateLimit({
  store: sharedStore("otp-ip"),
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many verification requests. Please try again later." },
});
router.use(otpIpLimiter);
router.use(otpLimiter);

// Send OTP to email
router.post("/send", sendOTP);

// Verify OTP and complete signup
router.post("/verify-signup", verifySignupOTP);

// Verify OTP for login
router.post("/verify-login", verifyLoginOTP);

// Resend OTP
router.post("/resend", resendOTP);

export default router;
