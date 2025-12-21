import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import crypto from "crypto";
import { uploadFileToSupabase } from "../utils/supabase.js";
import { initializeStudentTrial } from "../utils/trialService.js";
import logger from "../utils/logger.js";
import { blacklistToken, isTokenBlacklisted } from "../utils/tokenBlacklist.js";

// =============== TOKEN GENERATION SYSTEM ===============
// Access token: Short-lived (15 minutes) - used for API requests
// Refresh token: Long-lived (7 days) - used to get new access tokens

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes in ms
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Generate access token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, type: "access" },
    process.env.SECRET_KEY,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

// Generate refresh token (long-lived)  
const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    { userId, sessionId, type: "refresh" },
    process.env.SECRET_KEY,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

// Generate unique session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Legacy token generation (kept for backwards compatibility)
const generateToken = (userId, expiresIn = "7d") => {
  return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn });
};

// Cookie options for access token
const getAccessCookieOptions = () => ({
  maxAge: ACCESS_TOKEN_MAX_AGE,
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
});

// Cookie options for refresh token
const getRefreshCookieOptions = () => ({
  maxAge: REFRESH_TOKEN_MAX_AGE,
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/api/v1/user/refresh-token", // Only sent to refresh endpoint
});

// Legacy cookie options (kept for backwards compatibility)
const getCookieOptions = (maxAge = 7 * 24 * 60 * 60 * 1000) => ({
  maxAge,
  httpOnly: true,
  secure: true,
  sameSite: "none",
});

// Extract device info from request
const getDeviceInfo = (req) => {
  const ua = req.headers["user-agent"] || "Unknown";
  // Simple device detection
  if (ua.includes("Mobile")) return "Mobile Device";
  if (ua.includes("Tablet")) return "Tablet";
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown Device";
};

// Get client IP address
const getClientIp = (req) => {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.connection?.remoteAddress
    || req.ip
    || "Unknown";
};

export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, role } = req.body;

    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists.",
        success: false,
      });
    }

    // Check phone number uniqueness
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({
        message: "An account with this phone number already exists.",
        success: false,
      });
    }

    let profilePhotoUrl = "";

    // Only process file if it exists
    if (req.file) {
      const file = req.file;
      const fileUri = getDataUri(file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
        folder: "jobportal/profiles",
        transformation: [{ width: 400, height: 400, crop: "fill" }],
      });
      profilePhotoUrl = cloudResponse.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      phoneNumber,
      password: hashedPassword,
      role,
      profile: {
        profilePhoto: profilePhotoUrl,
      },
      isEmailVerified: false,
      lastLogin: new Date(),
    });

    // Generate token and auto-login after registration
    const token = generateToken(newUser._id);

    // Initialize 30-day free trial for students
    let trialInfo = null;
    if (role === "student") {
      try {
        trialInfo = await initializeStudentTrial(newUser._id);
        logger.info(`🎉 Trial started for new student: ${email}`);
      } catch (trialError) {
        logger.error("Trial initialization failed:", trialError);
        // Don't fail registration if trial init fails
      }
    }

    const userResponse = {
      _id: newUser._id,
      fullname: newUser.fullname,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      profile: newUser.profile,
      createdAt: newUser.createdAt,
      trialInfo, // Include trial info in response
    };

    return res
      .status(201)
      .cookie("token", token, getCookieOptions())
      .json({
        message:
          role === "student"
            ? "Account created! Your 30-day free trial has started."
            : "Account created successfully! Welcome to Hire.iOS.",
        user: userResponse,
        token,
        success: true,
      });
  } catch (error) {
    logger.error("Registration error:", error);
    return res.status(500).json({
      message: "Server error occurred during registration",
      success: false,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    logger.debug("🔐 Login attempt:", { email, role, hasPassword: !!password });

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Please fill in all fields",
        success: false,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    logger.debug(
      "👤 User found:",
      user
        ? {
          id: user._id,
          email: user.email,
          role: user.role,
          hasPassword: !!user.password,
          passwordLength: user.password?.length,
          passwordHash: user.password?.substring(0, 20) + "...",
        }
        : "NOT FOUND",
    );

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    logger.debug("🔑 Comparing passwords:", {
      inputPassword: "***", // Don't log actual password
      inputLength: password?.length,
      storedHashLength: user.password?.length,
      hashStartsWith: user.password?.substring(0, 7),
    });

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    logger.debug("🔑 Password match result:", isPasswordMatch);

    if (!isPasswordMatch) {
      // Track failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastFailedLogin = new Date();
      await user.save();

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        return res.status(423).json({
          message:
            "Account temporarily locked due to multiple failed login attempts. Please try again later or reset your password.",
          success: false,
          code: "ACCOUNT_LOCKED",
        });
      }

      return res.status(401).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    // Check if account is locked
    if (user.failedLoginAttempts >= 5 && user.lastFailedLogin) {
      const lockDuration = 15 * 60 * 1000; // 15 minutes
      if (Date.now() - user.lastFailedLogin.getTime() < lockDuration) {
        return res.status(423).json({
          message: "Account temporarily locked. Please try again later.",
          success: false,
          code: "ACCOUNT_LOCKED",
        });
      }
    }

    // Check role
    if (role !== user.role) {
      return res.status(400).json({
        message: `No ${role} account found with these credentials. Please select the correct role.`,
        success: false,
      });
    }

    // =============== SUBSCRIPTION/TRIAL CHECK ===============
    // Check for expired student trial
    if (user.role === "student" && user.trialExpired) {
      return res.status(403).json({
        message: "Your free trial has expired. Access has been restricted.",
        success: false,
        code: "TRIAL_EXPIRED",
        trialExpired: true,
      });
    }

    // Check subscription status (for all roles)
    if (user.subscriptionStatus === "expired") {
      return res.status(403).json({
        message: "Your subscription has expired. Please renew to continue.",
        success: false,
        code: "SUBSCRIPTION_EXPIRED",
        subscriptionExpired: true,
      });
    }

    // For recruiters/company_admin, check company subscription
    if (
      (user.role === "recruiter" || user.role === "company_admin") &&
      user.companyId
    ) {
      const { Company } = await import("../models/company.model.js");
      const company = await Company.findById(user.companyId);

      if (company && company.subscription.status === "expired") {
        return res.status(403).json({
          message:
            "Your company's subscription has expired. Please contact your administrator.",
          success: false,
          code: "COMPANY_SUBSCRIPTION_EXPIRED",
          subscriptionExpired: true,
        });
      }
    }
    // =============== END SUBSCRIPTION CHECK ===============

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    const userResponse = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      companyId: user.companyId || null, // Include companyId for registration status check
      profile: user.profile,
      lastLogin: user.lastLogin,
      mustChangePassword: user.mustChangePassword || false,
      // Include subscription info
      subscriptionStatus: user.subscriptionStatus,
      trialEndDate: user.trialEndDate,
      trialExpired: user.trialExpired,
    };

    return res
      .status(200)
      .cookie("token", token, getCookieOptions())
      .json({
        message: user.mustChangePassword
          ? `Welcome ${user.fullname}! Please change your password to continue.`
          : `Welcome back, ${user.fullname}!`,
        user: userResponse,
        token,
        success: true,
        requirePasswordChange: user.mustChangePassword || false,
      });
  } catch (error) {
    logger.error("Login error:", error);
    return res.status(500).json({
      message: "Server error occurred during login",
      success: false,
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Get token from cookie or header
    const token = req.cookies.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.substring(7)
        : null);

    // Blacklist the current token
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.exp) {
          blacklistToken(token, decoded.exp);
          logger.info(`🔒 Token blacklisted for logout`);
        }
      } catch (e) {
        // Token might be invalid, but we still clear cookies
      }
    }

    // Clear all auth cookies
    return res
      .status(200)
      .cookie("token", "", { maxAge: 0, path: "/" })
      .cookie("refreshToken", "", { maxAge: 0, path: "/" })
      .json({
        message: "Logged out successfully.",
        success: true,
      });
  } catch (error) {
    logger.error("Logout error:", error);
    return res.status(500).json({
      message: "Error during logout",
      success: false,
    });
  }
};

// =============== REFRESH TOKEN ENDPOINT ===============
export const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshTokenValue = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshTokenValue) {
      return res.status(401).json({
        message: "Refresh token required",
        success: false,
        code: "NO_REFRESH_TOKEN",
      });
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(refreshTokenValue)) {
      return res.status(401).json({
        message: "Token has been revoked. Please login again.",
        success: false,
        code: "TOKEN_REVOKED",
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshTokenValue, process.env.SECRET_KEY);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Refresh token expired. Please login again.",
          success: false,
          code: "REFRESH_TOKEN_EXPIRED",
        });
      }
      throw jwtError;
    }

    // Verify it's a refresh token
    if (decoded.type !== "refresh") {
      return res.status(401).json({
        message: "Invalid token type",
        success: false,
        code: "INVALID_TOKEN_TYPE",
      });
    }

    // Find user and verify session exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        success: false,
        code: "USER_NOT_FOUND",
      });
    }

    // Find and update the session
    const sessionIndex = user.activeSessions?.findIndex(
      s => s.sessionId === decoded.sessionId
    );

    if (sessionIndex === -1 || sessionIndex === undefined) {
      // Session not found - might have been revoked
      return res.status(401).json({
        message: "Session has been revoked. Please login again.",
        success: false,
        code: "SESSION_REVOKED",
      });
    }

    // Check if session is expired
    const session = user.activeSessions[sessionIndex];
    if (new Date(session.expiresAt) < new Date()) {
      // Remove expired session
      user.activeSessions.splice(sessionIndex, 1);
      await user.save();
      return res.status(401).json({
        message: "Session expired. Please login again.",
        success: false,
        code: "SESSION_EXPIRED",
      });
    }

    // Generate new tokens (rotate both for security)
    const newAccessToken = generateAccessToken(user._id);
    const newSessionId = generateSessionId();
    const newRefreshToken = generateRefreshToken(user._id, newSessionId);

    // Update session with new refresh token
    user.activeSessions[sessionIndex].refreshToken = newRefreshToken;
    user.activeSessions[sessionIndex].sessionId = newSessionId;
    user.activeSessions[sessionIndex].lastUsed = new Date();
    user.activeSessions[sessionIndex].expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
    await user.save();

    // Blacklist old refresh token
    blacklistToken(refreshTokenValue, decoded.exp);

    logger.info(`🔄 Token refreshed for user: ${user.email}`);

    return res
      .status(200)
      .cookie("token", newAccessToken, getAccessCookieOptions())
      .cookie("refreshToken", newRefreshToken, getRefreshCookieOptions())
      .json({
        message: "Token refreshed successfully",
        token: newAccessToken,
        success: true,
      });
  } catch (error) {
    logger.error("Token refresh error:", error);
    return res.status(500).json({
      message: "Error refreshing token",
      success: false,
    });
  }
};

// =============== SESSION MANAGEMENT ===============
// Get all active sessions for current user
export const getActiveSessions = async (req, res) => {
  try {
    const user = await User.findById(req.id).select("activeSessions");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Map sessions to safe response (without refresh tokens)
    const sessions = (user.activeSessions || []).map((session, index) => ({
      id: session.sessionId,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress?.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, "$1.$2.***.**"),
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
      isCurrent: false, // Will be set by frontend comparing session IDs
    }));

    return res.status(200).json({
      sessions,
      count: sessions.length,
      success: true,
    });
  } catch (error) {
    logger.error("Get sessions error:", error);
    return res.status(500).json({
      message: "Error fetching sessions",
      success: false,
    });
  }
};

// Revoke a specific session
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const sessionIndex = user.activeSessions?.findIndex(
      s => s.sessionId === sessionId
    );

    if (sessionIndex === -1 || sessionIndex === undefined) {
      return res.status(404).json({
        message: "Session not found",
        success: false,
      });
    }

    // Blacklist the session's refresh token
    const session = user.activeSessions[sessionIndex];
    try {
      const decoded = jwt.decode(session.refreshToken);
      if (decoded?.exp) {
        blacklistToken(session.refreshToken, decoded.exp);
      }
    } catch (e) { }

    // Remove session
    user.activeSessions.splice(sessionIndex, 1);
    await user.save();

    logger.info(`🔒 Session revoked: ${sessionId.substring(0, 8)}...`);

    return res.status(200).json({
      message: "Session revoked successfully",
      success: true,
    });
  } catch (error) {
    logger.error("Revoke session error:", error);
    return res.status(500).json({
      message: "Error revoking session",
      success: false,
    });
  }
};

// Revoke all sessions except current
export const revokeAllSessions = async (req, res) => {
  try {
    const currentSessionId = req.body.currentSessionId;
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Blacklist all refresh tokens except current
    let revokedCount = 0;
    for (const session of user.activeSessions || []) {
      if (session.sessionId !== currentSessionId) {
        try {
          const decoded = jwt.decode(session.refreshToken);
          if (decoded?.exp) {
            blacklistToken(session.refreshToken, decoded.exp);
            revokedCount++;
          }
        } catch (e) { }
      }
    }

    // Keep only current session
    user.activeSessions = (user.activeSessions || []).filter(
      s => s.sessionId === currentSessionId
    );
    await user.save();

    logger.info(`🔒 All sessions revoked for user: ${user.email} (${revokedCount} sessions)`);

    return res.status(200).json({
      message: `${revokedCount} session(s) revoked successfully`,
      revokedCount,
      success: true,
    });
  } catch (error) {
    logger.error("Revoke all sessions error:", error);
    return res.status(500).json({
      message: "Error revoking sessions",
      success: false,
    });
  }
};

// Change initial password for recruiters on first login
export const changeInitialPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    logger.info("🔐 Change initial password request:", { email });

    // Validate input
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Email, new password, and confirmation are required.",
        success: false,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
        success: false,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
        success: false,
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    // Check if user must change password
    if (!user.mustChangePassword) {
      return res.status(400).json({
        message: "Password change not required for this account.",
        success: false,
      });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    logger.info("✅ Password changed successfully for:", email);

    // Generate new token and log user in
    const token = generateToken(user._id);

    const userResponse = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
      lastLogin: new Date(),
      mustChangePassword: false,
    };

    return res.status(200).cookie("token", token, getCookieOptions()).json({
      message: "Password changed successfully! Welcome to JobPortal.",
      user: userResponse,
      token,
      success: true,
    });
  } catch (error) {
    logger.error("Change password error:", error);
    return res.status(500).json({
      message: "Server error occurred while changing password.",
      success: false,
    });
  }
};

// Unlock account (reset failed login attempts)
export const unlockAccount = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
        success: false,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    // Reset lockout
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;
    await user.save();

    logger.info("🔓 Account unlocked:", email);

    return res.status(200).json({
      message: "Account unlocked successfully. You can now try logging in.",
      success: true,
    });
  } catch (error) {
    logger.error("Unlock account error:", error);
    return res.status(500).json({
      message: "Server error occurred.",
      success: false,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phoneNumber,
      bio,
      skills,
      location,
      experience,
      education,
      socialLinks,
    } = req.body;

    let cloudResponse = null;
    if (req.file) {
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({
          message: "Only PDF resumes are allowed",
          success: false,
        });
      }

      const userId = req.id;
      try {
        const { publicUrl } = await uploadFileToSupabase(
          req.file,
          "resumes",
          userId,
        );
        cloudResponse = { secure_url: publicUrl };
      } catch (uploadError) {
        logger.error("Supabase upload error:", uploadError);
        return res.status(500).json({
          message: "Failed to upload resume to storage",
          success: false,
        });
      }
    }

    let skillsArray;
    if (skills !== undefined && skills !== null) {
      if (Array.isArray(skills)) {
        skillsArray = skills.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof skills === "string") {
        const trimmedSkills = skills.trim();
        if (trimmedSkills.startsWith("[") && trimmedSkills.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmedSkills);
            if (Array.isArray(parsed)) {
              skillsArray = parsed.map((s) => String(s).trim()).filter(Boolean);
            }
          } catch (e) {
            skillsArray = trimmedSkills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean);
          }
        } else {
          skillsArray = trimmedSkills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean);
        }
      }
    }

    const userId = req.id;
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    if (!user.profile) {
      user.profile = {};
    }

    // Check email uniqueness if changing email
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          message: "This email is already in use.",
          success: false,
        });
      }
    }

    // Check phone uniqueness if changing phone
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingPhone = await User.findOne({ phoneNumber });
      if (existingPhone) {
        return res.status(400).json({
          message: "This phone number is already in use.",
          success: false,
        });
      }
    }

    // Update fields
    if (fullname) user.fullname = fullname.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio) user.profile.bio = bio.trim();
    if (skillsArray) user.profile.skills = skillsArray;

    // Handle location - convert string to object format
    if (location) {
      const locationStr = location.trim();
      if (typeof locationStr === "string") {
        // Parse "city, country" format
        const parts = locationStr.split(",").map((p) => p.trim());
        user.profile.location = {
          city: parts[0] || "",
          country: parts[1] || parts[0] || "Pakistan",
        };
      } else if (typeof locationStr === "object") {
        user.profile.location = locationStr;
      }
    }

    if (socialLinks !== undefined) {
      const currentLinks = user.profile.socialLinks || {};
      let incoming = socialLinks || {};
      if (typeof incoming === "string") {
        try {
          incoming = JSON.parse(incoming);
        } catch {
          incoming = {};
        }
      }
      user.profile.socialLinks = {
        linkedin: incoming.linkedin ?? currentLinks.linkedin,
        github: incoming.github ?? currentLinks.github,
        twitter: incoming.twitter ?? currentLinks.twitter,
        portfolio:
          incoming.website ?? incoming.portfolio ?? currentLinks.portfolio,
      };
    }

    // Update resume if file was uploaded
    if (cloudResponse) {
      user.profile.resume = cloudResponse.secure_url;
      user.profile.resumeOriginalName = req.file.originalname;
    }

    user.updatedAt = new Date();
    await user.save();

    const userResponse = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: userResponse,
      success: true,
    });
  } catch (error) {
    logger.error("Profile update error:", error);
    return res.status(500).json({
      message: "Server error occurred while updating profile",
      success: false,
    });
  }
};

// Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.id).select(
      "-password -failedLoginAttempts -lastFailedLogin",
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    return res.status(200).json({
      user,
      success: true,
    });
  } catch (error) {
    logger.error("Get user error:", error);
    return res.status(500).json({
      message: "Error fetching user profile",
      success: false,
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
        success: false,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
        success: false,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: "Current password is incorrect",
        success: false,
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
        success: false,
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "Password changed successfully",
      success: true,
    });
  } catch (error) {
    logger.error("Change password error:", error);
    return res.status(500).json({
      message: "Error changing password",
      success: false,
    });
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.id;

    if (!password) {
      return res.status(400).json({
        message: "Password is required to delete account",
        success: false,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Password is incorrect",
        success: false,
      });
    }

    // Delete user profile photo from cloudinary if exists
    if (user.profile.profilePhoto) {
      // Extract public_id from URL and delete
      try {
        const publicId = user.profile.profilePhoto
          .split("/")
          .pop()
          .split(".")[0];
        await cloudinary.uploader.destroy(`jobportal/profiles/${publicId}`);
      } catch (e) {
        logger.warn("Error deleting profile photo:", e);
      }
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Account deleted successfully",
      success: true,
    });
  } catch (error) {
    logger.error("Delete account error:", error);
    return res.status(500).json({
      message: "Error deleting account",
      success: false,
    });
  }
};

// Note: refreshToken function moved to line ~410 with enhanced security features

// Update profile photo
export const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an image",
        success: false,
      });
    }

    const userId = req.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Delete old photo if exists
    if (user.profile.profilePhoto) {
      try {
        const publicId = user.profile.profilePhoto
          .split("/")
          .pop()
          .split(".")[0];
        await cloudinary.uploader.destroy(`jobportal/profiles/${publicId}`);
      } catch (e) {
        logger.warn("Error deleting old photo:", e);
      }
    }

    const fileUri = getDataUri(req.file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
      folder: "jobportal/profiles",
      transformation: [{ width: 400, height: 400, crop: "fill" }],
    });

    user.profile.profilePhoto = cloudResponse.secure_url;
    await user.save();

    return res.status(200).json({
      message: "Profile photo updated successfully",
      profilePhoto: cloudResponse.secure_url,
      success: true,
    });
  } catch (error) {
    logger.error("Update photo error:", error);
    return res.status(500).json({
      message: "Error updating profile photo",
      success: false,
    });
  }
};

// Sync Supabase user with MongoDB
export const supabaseSync = async (req, res) => {
  try {
    const { supabaseId, email, fullname, profilePhoto, provider, pendingRole } =
      req.body;

    // DEBUG: Log incoming data
    console.log("🔐 supabaseSync called with:", {
      email,
      pendingRole,
      provider,
      hasSupabaseId: !!supabaseId
    });

    if (!supabaseId || !email) {
      return res.status(400).json({
        message: "Supabase ID and email are required",
        success: false,
      });
    }

    // Check if user exists by supabaseId or email
    let user = await User.findOne({
      $or: [{ supabaseId }, { email: email.toLowerCase() }],
    });

    let isNewUser = false;
    let trialEndDate = null;

    // DEBUG: Log existing user state
    console.log("🔐 Existing user check:", {
      exists: !!user,
      currentRole: user?.role,
      hasCompanyId: !!user?.companyId,
      pendingRole
    });

    if (user) {
      // SECURITY: Recruiters must login with email/password only
      // They receive credentials via email from company admin
      if (user.role === "recruiter" && provider && provider !== "email") {
        return res.status(403).json({
          message:
            "Recruiters must login with email and password. Please use the credentials sent to your email by your company admin.",
          success: false,
          code: "GOOGLE_LOGIN_RESTRICTED",
        });
      }

      // Update existing user
      user.supabaseId = supabaseId;
      user.lastLogin = new Date();

      if (profilePhoto && !user.profile.profilePhoto) {
        user.profile.profilePhoto = profilePhoto;
      }

      if (fullname && !user.fullname) {
        user.fullname = fullname;
      }

      user.isEmailVerified = true;
      user.authProvider = provider || user.authProvider || "email";

      // Allow role upgrade from student to company_admin during signup
      // Only if user has no company association and is currently a student
      if (
        pendingRole === "company_admin" &&
        user.role === "student" &&
        !user.companyId
      ) {
        console.log(`📦 Upgrading user ${email} from student to company_admin`);
        user.role = "company_admin";
        user.subscriptionStatus = "none"; // Reset subscription for owner flow
        isNewUser = true; // Treat as new user to trigger pricing flow
      }

      await user.save();

      // Get existing trial end date for returning user
      trialEndDate = user.trialEndDate;
    } else {
      // Create new user with pending role (student, company_admin)
      // Note: 'recruiter' role is only assigned by company admin invitation
      const validRoles = ["student", "company_admin"];
      const userRole = validRoles.includes(pendingRole)
        ? pendingRole
        : "student";

      isNewUser = true;

      // Set trial period for students (30 days)
      if (userRole === "student") {
        trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      user = await User.create({
        supabaseId,
        email: email.toLowerCase(),
        fullname: fullname || email.split("@")[0],
        role: userRole,
        authProvider: provider || "email",
        profile: {
          profilePhoto: profilePhoto || "",
        },
        isEmailVerified: true,
        lastLogin: new Date(),
        lastLoginIp: getClientIp(req),
        lastLoginDevice: getDeviceInfo(req),
        // Trial fields for students
        trialEndDate: trialEndDate,
        subscriptionStatus: userRole === "student" ? "trial" : "none",
        // Generate random password for Supabase users (won't be used)
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
      });

      console.log(`🎉 New ${userRole} user created: ${email}`);

      // Send welcome email with trial info for new students
      if (userRole === "student" && trialEndDate) {
        try {
          const emailModule = await import("../utils/email.js");
          if (emailModule.sendTrialWelcomeEmail) {
            emailModule
              .sendTrialWelcomeEmail(
                email,
                fullname || email.split("@")[0],
                trialEndDate,
              )
              .then(() => console.log("✅ Trial welcome email sent to:", email))
              .catch((err) =>
                console.log("⚠️ Email send failed:", err.message),
              );
          }
        } catch (emailErr) {
          console.log("⚠️ Email module not available:", emailErr.message);
        }
      }
    }

    // Generate JWT token for backend authentication
    const token = generateToken(user._id);

    // =============== DETERMINE REDIRECT DESTINATION ===============
    // This helps frontend know exactly where to send the user
    let redirectTo = null;
    let requiresRegistration = false;
    let trialInfo = null;

    if (user.role === "student") {
      // Students always go to dashboard
      // If new user, they have a 30-day trial
      const nameSlug = user.fullname?.replace(/\s+/g, "-").toLowerCase() || "dashboard";
      redirectTo = `/student/${nameSlug}`;

      // Calculate trial days remaining
      if (user.trialEndDate) {
        const daysRemaining = Math.ceil((new Date(user.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24));
        trialInfo = {
          isActive: daysRemaining > 0,
          daysRemaining: Math.max(0, daysRemaining),
          endDate: user.trialEndDate,
          isNewUser: isNewUser,
        };
      }
    } else if (user.role === "company_admin") {
      // CEOs/Owners:
      // - If new user OR no company -> go to pricing/registration
      // - If has company -> go to dashboard
      if (isNewUser || !user.companyId) {
        redirectTo = "/company/pricing";
        requiresRegistration = true;
        console.log(`📦 CEO redirect to pricing: isNewUser=${isNewUser}, hasCompanyId=${!!user.companyId}`);
      } else {
        redirectTo = "/company/admin/dashboard";
      }
    } else if (user.role === "recruiter") {
      const nameSlug = user.fullname?.replace(/\s+/g, "-").toLowerCase() || "dashboard";
      redirectTo = `/recruiter/${nameSlug}`;
    }

    const userResponse = {
      _id: user._id,
      supabaseId: user.supabaseId,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      companyId: user.companyId || null,
      profile: user.profile,
      createdAt: user.createdAt,
      // Include subscription/trial info
      trialEndDate: user.trialEndDate,
      subscriptionStatus: user.subscriptionStatus,
    };

    console.log(`✅ Supabase sync complete: ${email}, role=${user.role}, redirectTo=${redirectTo}`);

    return res
      .status(200)
      .cookie("token", token, getCookieOptions())
      .json({
        message: isNewUser
          ? "Account created successfully"
          : "User synced successfully",
        user: userResponse,
        token,
        isNewUser,
        // ========== ENHANCED REDIRECT INFO ==========
        redirectTo,              // Clear redirect destination
        requiresRegistration,    // True if CEO needs to complete registration
        trialInfo,               // Trial details for students
        // Legacy fields for backwards compatibility
        trialEndDate: trialEndDate ? trialEndDate.toISOString() : null,
        success: true,
      });
  } catch (error) {
    console.error("Supabase sync error:", error);
    return res.status(500).json({
      message: "Error syncing user with database",
      success: false,
    });
  }
};
