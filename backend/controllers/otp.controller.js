import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  generateOTP,
  saveOTP,
  verifyOTP,
  sendOTPEmail,
  sendWelcomeEmail,
} from "../utils/email.js";

// Token generation helper
const generateToken = (userId, expiresIn = "7d") => {
  return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn });
};

// Cookie options
const getCookieOptions = (maxAge = 7 * 24 * 60 * 60 * 1000) => ({
  maxAge,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
});

// Send OTP for signup/login
export const sendOTP = async (req, res) => {
  try {
    console.log(
      `📨 Received OTP request for email: ${req.body.email}, purpose: ${req.body.purpose}`,
    );
    const { email, purpose = "signup" } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    // Check if email exists for login, or doesn't exist for signup
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (purpose === "signup" && existingUser) {
      // Provide specific role-based message
      const roleMessages = {
        company_admin:
          "This email is registered as a Company Owner/CEO account. Please login with your CEO credentials or use a different email.",
        recruiter:
          "This email is registered as a Recruiter account. Please login with your Recruiter credentials or use a different email.",
        student:
          "This email is already registered as a Student account. Please login with your existing credentials or use a different email.",
      };

      return res.status(400).json({
        message:
          roleMessages[existingUser.role] ||
          "An account with this email already exists. Please login instead.",
        existingRole: existingUser.role,
        code: "EMAIL_ROLE_CONFLICT",
        success: false,
      });
    }

    if (purpose === "login" && !existingUser) {
      return res.status(400).json({
        message: "No account found with this email. Please signup first.",
        success: false,
      });
    }

    // Generate and save OTP
    const otp = generateOTP();
    saveOTP(email, otp);

    // Send OTP email
    await sendOTPEmail(email, otp, purpose);

    return res.status(200).json({
      message: "Verification code sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      message: error.message || "Failed to send verification code",
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

    if (!email || !otp || !fullname || !password) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    // Verify OTP
    const otpResult = verifyOTP(email, otp);
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

    // Calculate trial dates for students
    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Build user data
    const userData = {
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      phoneNumber: phone || null,
      password: hashedPassword,
      role,
      authProvider: "email",
      isEmailVerified: true,
      lastLogin: new Date(),
    };

    // Add trial fields for students
    if (role === "student") {
      userData.trialStartDate = trialStartDate;
      userData.trialEndDate = trialEndDate;
      userData.subscriptionStatus = "trial";
      userData.hasUsedTrial = true;
      userData.trialExpired = false;
      userData.subscriptionEvents = [
        {
          event: "trial_started",
          date: trialStartDate,
          details: "30-day free trial activated on signup",
        },
      ];
    }

    const newUser = await User.create(userData);

    // Generate token
    const token = generateToken(newUser._id);

    // Send appropriate welcome email
    if (role === "student") {
      // Import and send trial welcome email
      import("../utils/email.js")
        .then((emailModule) => {
          emailModule
            .sendTrialWelcomeEmail(email, fullname, trialEndDate)
            .catch(console.error);
        })
        .catch(console.error);
    } else {
      // Send regular welcome email
      sendWelcomeEmail(email, fullname).catch(console.error);
    }

    const userResponse = {
      _id: newUser._id,
      fullname: newUser.fullname,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      profile: newUser.profile,
      createdAt: newUser.createdAt,
      // Include trial info for students
      ...(role === "student" && {
        subscriptionStatus: newUser.subscriptionStatus,
        trialStartDate: newUser.trialStartDate,
        trialEndDate: newUser.trialEndDate,
        isTrialActive: true,
      }),
    };

    return res
      .status(201)
      .cookie("token", token, getCookieOptions())
      .json({
        message:
          role === "student"
            ? `Welcome ${fullname}! Your 30-day free trial has started.`
            : "Account created successfully! Welcome to JobPortal.",
        user: userResponse,
        token,
        success: true,
        // Flag for frontend to show trial welcome modal
        showTrialWelcome: role === "student",
        trialEndDate: role === "student" ? trialEndDate : undefined,
      });
  } catch (error) {
    console.error("Verify signup OTP error:", error);
    return res.status(500).json({
      message: error.message || "Failed to create account",
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
    const otpResult = verifyOTP(email, otp);
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

    // Update last login
    user.lastLogin = new Date();
    user.isEmailVerified = true;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

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
      .cookie("token", token, getCookieOptions())
      .json({
        message: `Welcome back, ${user.fullname}!`,
        user: userResponse,
        token,
        success: true,
      });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    return res.status(500).json({
      message: error.message || "Failed to verify OTP",
      success: false,
    });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { email, purpose = "signup" } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    saveOTP(email, otp);

    // Send OTP email
    await sendOTPEmail(email, otp, purpose);

    return res.status(200).json({
      message: "New verification code sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      message: error.message || "Failed to resend verification code",
      success: false,
    });
  }
};
