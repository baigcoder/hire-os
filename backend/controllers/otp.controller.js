import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { sendOTPEmail, sendWelcomeEmail } from "../utils/email.js";
import { issueCode, checkCode } from "../utils/emailCode.js";
import { startSession, recruiterAccessProblem, endAllSessions } from "../utils/session.js";
import { validatePassword } from "../middlewares/validation.js";
import crypto from "crypto";

const PURPOSES = ["signup", "login"];
const isEmail = (v) => typeof v === "string" && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

// Send OTP for signup/login
export const sendOTP = async (req, res) => {
  try {
    const { email, purpose = "signup" } = req.body;

    if (!isEmail(email) || !PURPOSES.includes(purpose)) {
      return res.status(400).json({
        message: "A valid email is required",
        success: false,
      });
    }

    // Check if email exists for login, or doesn't exist for signup
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (purpose === "signup" && existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists. Sign in instead.",
        code: "EMAIL_EXISTS",
        success: false,
      });
    }

    // Sign-in codes: the answer is the same whether or not the account exists
    if (purpose === "login" && !existingUser) {
      return res.status(200).json({ message: "If this email has an account, a code is on its way.", success: true, expiresInSeconds: 600 });
    }

    // Generate and save OTP
    const otp = await issueCode(email);

    // Send OTP email
    await sendOTPEmail(email, otp, purpose);

    // Codes last 10 minutes (utils/emailCode.js)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return res.status(200).json({
      message: "Verification code sent to your email",
      success: true,
      expiresAt: otpExpiresAt,
      expiresInSeconds: 600
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      message: "Failed to send verification code",
      success: false,
    });
  }
};

// Verify OTP and complete signup
export const verifySignupOTP = async (req, res) => {
  try {
    const {
      email,
      otp,
      fullname,
      password,
      phone,
      role = "student",
    } = req.body;

    if (!isEmail(email) || !otp || typeof fullname !== "string" || typeof password !== "string" || !fullname.trim()) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }
    // Same password rules as every other way of setting one (bcrypt only reads 72 bytes)
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length || Buffer.byteLength(password) > 72) {
      return res.status(400).json({
        message: passwordErrors[0] || "Password is too long (max 72 bytes)",
        success: false,
      });
    }

    // Recruiter accounts come only from a company owner's invitation
    if (!["student", "company_admin"].includes(role)) {
      return res.status(400).json({
        message: "Recruiters join through their company's invitation.",
        success: false,
      });
    }

    // Verify OTP
    const otpResult = await checkCode(email, otp);
    if (!otpResult.valid) {
      return res.status(400).json({
        message: otpResult.message,
        success: false,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists",
        success: false,
      });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 12);

    // Build user data
    const userData = {
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      ...(phone ? { phoneNumber: phone } : {}),
      password: hashedPassword,
      role,
      authProvider: "email",
      isEmailVerified: true,
      lastLogin: new Date(),
    };

    userData.subscriptionStatus = "active"; // free platform

    const newUser = await User.create(userData);

    const token = await startSession(res, newUser._id, req);

    sendWelcomeEmail(email, fullname).catch(console.error);

    const userResponse = {
      _id: newUser._id,
      fullname: newUser.fullname,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      profile: newUser.profile,
      createdAt: newUser.createdAt,
    };

    return res
      .status(201)
      .json({
        message: "Account created successfully! Welcome to JobPortal.",
        user: userResponse,
        token,
        success: true,
      });
  } catch (error) {
    console.error("Verify signup OTP error:", error);
    return res.status(500).json({
      message: "Failed to create account",
      success: false,
    });
  }
};

// Verify OTP for login
export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
        success: false,
      });
    }

    // Verify OTP
    const otpResult = await checkCode(email, otp);
    if (!otpResult.valid) {
      return res.status(400).json({
        message: otpResult.message,
        success: false,
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }

    // An account whose email was never proven may have been pre-created by someone else with
    // their own password: the real owner just proved the address, so those credentials end.
    if (!user.isEmailVerified) {
      user.password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
      await endAllSessions(user._id);
    }

    // Update last login
    user.lastLogin = new Date();
    user.isEmailVerified = true;
    await user.save();

    const blocked = await recruiterAccessProblem(user);
    if (blocked) return res.status(403).json({ ...blocked, success: false });

    const token = await startSession(res, user._id, req);

    const userResponse = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
    };

    return res
      .status(200)
      .json({
        message: `Welcome back, ${user.fullname}!`,
        user: userResponse,
        token,
        success: true,
      });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    return res.status(500).json({
      message: "Failed to verify OTP",
      success: false,
    });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { email, purpose = "signup" } = req.body;

    if (!isEmail(email) || !PURPOSES.includes(purpose)) {
      return res.status(400).json({
        message: "A valid email is required",
        success: false,
      });
    }
    // A sign-in code only goes to an address that has an account (the reply is identical
    // either way), so this endpoint can't be used to mail arbitrary addresses.
    if (purpose === "login" && !(await User.exists({ email: email.toLowerCase() }))) {
      return res.status(200).json({ message: "If this email has an account, a code is on its way.", success: true, expiresInSeconds: 600 });
    }

    // Generate new OTP
    const otp = await issueCode(email);

    // Send OTP email
    await sendOTPEmail(email, otp, purpose);

    // Codes last 10 minutes (utils/emailCode.js)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return res.status(200).json({
      message: "New verification code sent to your email",
      success: true,
      expiresAt: otpExpiresAt,
      expiresInSeconds: 600
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      message: "Failed to resend verification code",
      success: false,
    });
  }
};
