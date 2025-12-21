import express from "express";
import {
  sendOTP,
  verifySignupOTP,
  verifyLoginOTP,
  resendOTP,
} from "../controllers/otp.controller.js";

const router = express.Router();

// Send OTP to email
router.post("/send", sendOTP);

// Verify OTP and complete signup
router.post("/verify-signup", verifySignupOTP);

// Verify OTP for login
router.post("/verify-login", verifyLoginOTP);

// Resend OTP
router.post("/resend", resendOTP);

export default router;
