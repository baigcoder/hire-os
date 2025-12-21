/**
 * Trial Service - Student Free Trial Management
 * Handles trial initialization, status checking, and expiration
 */

import { User } from "../models/user.model.js";
import { sendEmail } from "./emailService.js";

const TRIAL_DURATION_DAYS = 30;

/**
 * Initialize a 30-day free trial for new students
 * @param {string} userId - The user ID
 * @returns {Object} Trial details
 */
export const initializeStudentTrial = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "student") {
      return { success: false, message: "Trials only available for students" };
    }

    if (user.hasUsedTrial) {
      return {
        success: false,
        message: "User has already used their free trial",
      };
    }

    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS);

    user.trialStartDate = trialStartDate;
    user.trialEndDate = trialEndDate;
    user.hasUsedTrial = true;
    user.trialExpired = false;
    user.subscriptionStatus = "trial";

    // Log the trial start event
    user.subscriptionEvents.push({
      event: "trial_started",
      date: new Date(),
      details: `30-day free trial started. Ends on ${trialEndDate.toDateString()}`,
    });

    await user.save();

    // Send welcome email with trial info
    await sendWelcomeTrialEmail(user);

    console.log(
      `✅ Trial started for ${user.email} - Expires: ${trialEndDate.toDateString()}`,
    );

    return {
      success: true,
      trialStartDate,
      trialEndDate,
      daysRemaining: TRIAL_DURATION_DAYS,
    };
  } catch (error) {
    console.error("Trial initialization error:", error);
    throw error;
  }
};

/**
 * Check current trial status for a user
 * @param {string} userId - The user ID
 * @returns {Object} Trial status details
 */
export const checkTrialStatus = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return { isActive: false, message: "User not found" };
    }

    // Non-students don't use trial system
    if (user.role !== "student") {
      return {
        isActive: true,
        isPremium: user.subscriptionStatus === "active",
        message: "Non-student account",
      };
    }

    // Active subscription (paid)
    if (user.subscriptionStatus === "active") {
      return {
        isActive: true,
        isPremium: true,
        subscription: "premium",
        message: "Active premium subscription",
      };
    }

    // Check trial status
    if (user.trialExpired || user.subscriptionStatus === "expired") {
      return {
        isActive: false,
        isTrialExpired: true,
        message: "Trial period has ended",
      };
    }

    if (!user.trialStartDate || !user.trialEndDate) {
      // No trial started - this shouldn't happen for new students
      return {
        isActive: false,
        needsTrial: true,
        message: "No trial started",
      };
    }

    const now = new Date();
    const trialEnd = new Date(user.trialEndDate);
    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

    if (now >= trialEnd) {
      // Trial has expired - update user
      await expireTrial(userId);
      return {
        isActive: false,
        isTrialExpired: true,
        daysRemaining: 0,
        message: "Trial has expired",
      };
    }

    // Trial is active
    return {
      isActive: true,
      isTrial: true,
      subscription: "trial",
      trialEndDate: user.trialEndDate,
      daysRemaining,
      isWarning: daysRemaining <= 7,
      message: `Trial active - ${daysRemaining} days remaining`,
    };
  } catch (error) {
    console.error("Trial status check error:", error);
    return { isActive: false, error: error.message };
  }
};

/**
 * Expire a user's trial and restrict access
 * @param {string} userId - The user ID
 */
export const expireTrial = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) return;

    user.trialExpired = true;
    user.subscriptionStatus = "expired";
    user.subscriptionEvents.push({
      event: "trial_expired",
      date: new Date(),
      details: "Free trial period has ended",
    });

    await user.save();

    // Send trial expired email
    await sendTrialExpiredEmail(user);

    console.log(`⏰ Trial expired for ${user.email}`);
  } catch (error) {
    console.error("Trial expiration error:", error);
  }
};

/**
 * Cron job to check and expire trials
 * Should run daily
 */
export const runTrialExpiryCheck = async () => {
  console.log("🔍 Running trial expiry check...");

  try {
    const now = new Date();

    // Find users with expired trials
    const expiredTrials = await User.find({
      role: "student",
      subscriptionStatus: "trial",
      trialEndDate: { $lte: now },
      trialExpired: { $ne: true },
    });

    for (const user of expiredTrials) {
      await expireTrial(user._id);
    }

    // Find users with trials ending in 3 days (warning)
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 3);

    const warningTrials = await User.find({
      role: "student",
      subscriptionStatus: "trial",
      trialEndDate: { $lte: warningDate, $gt: now },
      "emailsSent.trialWarningEmail": { $ne: true },
    });

    for (const user of warningTrials) {
      await sendTrialWarningEmail(user);
      user.emailsSent = user.emailsSent || {};
      user.emailsSent.trialWarningEmail = true;
      await user.save();
    }

    console.log(
      `✅ Trial check complete: ${expiredTrials.length} expired, ${warningTrials.length} warnings sent`,
    );

    return {
      expired: expiredTrials.length,
      warnings: warningTrials.length,
    };
  } catch (error) {
    console.error("Trial expiry check failed:", error);
  }
};

/**
 * Send welcome email with trial information
 */
const sendWelcomeTrialEmail = async (user) => {
  try {
    const trialEndDate = new Date(user.trialEndDate).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    const emailData = {
      to: user.email,
      subject: "🎉 Welcome to Hire.iOS - Your 30-Day Free Trial Has Started!",
      html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #FFD700; margin: 0;">HIRE.iOS</h1>
                        <p style="color: #ccc; margin-top: 5px;">AI-Powered Job Platform</p>
                    </div>
                    
                    <h2 style="color: #fff; margin-bottom: 20px;">Welcome, ${user.fullname}! 🚀</h2>
                    
                    <p style="color: #ccc; line-height: 1.8;">
                        Your <strong style="color: #FFD700;">30-day free trial</strong> has started! You now have full access to all premium features:
                    </p>
                    
                    <ul style="color: #ccc; line-height: 2;">
                        <li>✨ AI Resume Analyzer with GPT-5</li>
                        <li>🎯 Smart Job Matching & Recommendations</li>
                        <li>🎙️ Mock Interview Practice with AI Feedback</li>
                        <li>📊 Application Tracking Dashboard</li>
                        <li>🔔 Real-time Job Alerts</li>
                    </ul>
                    
                    <div style="background: #111; border: 1px solid #FFD700; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                        <p style="color: #FFD700; margin: 0; font-size: 18px;">
                            ⏰ Trial ends on: <strong>${trialEndDate}</strong>
                        </p>
                    </div>
                    
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/student/dashboard" 
                       style="display: inline-block; background: #FFD700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">
                        Go to Dashboard
                    </a>
                    
                    <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
                    
                    <p style="color: #888; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Hire.iOS. All rights reserved.
                    </p>
                </div>
            `,
    };

    await sendEmail(emailData);

    // Mark email as sent
    user.emailsSent = user.emailsSent || {};
    user.emailsSent.welcomeEmail = true;
    await user.save();

    console.log(`📧 Welcome email sent to ${user.email}`);
  } catch (error) {
    console.error("Welcome email failed:", error);
  }
};

/**
 * Send trial warning email (3 days before expiry)
 */
const sendTrialWarningEmail = async (user) => {
  try {
    const daysRemaining = Math.ceil(
      (new Date(user.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24),
    );

    const emailData = {
      to: user.email,
      subject: `⚠️ Your Hire.iOS Trial Ends in ${daysRemaining} Days`,
      html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #FFD700; margin: 0;">HIRE.iOS</h1>
                    </div>
                    
                    <h2 style="color: #F59E0B;">⚠️ Your Trial is Almost Over</h2>
                    
                    <p style="color: #ccc; line-height: 1.8;">
                        Hi ${user.fullname}, your free trial ends in <strong style="color: #FFD700;">${daysRemaining} days</strong>.
                    </p>
                    
                    <p style="color: #ccc;">
                        Don't lose access to premium features! Upgrade now to continue your job search journey.
                    </p>
                    
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/pricing" 
                       style="display: inline-block; background: #FFD700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">
                        Upgrade to Premium
                    </a>
                    
                    <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
                    
                    <p style="color: #888; font-size: 12px;">
                        If you have questions, reply to this email.
                    </p>
                </div>
            `,
    };

    await sendEmail(emailData);
    console.log(`📧 Trial warning sent to ${user.email}`);
  } catch (error) {
    console.error("Trial warning email failed:", error);
  }
};

/**
 * Send trial expired email
 */
const sendTrialExpiredEmail = async (user) => {
  try {
    const emailData = {
      to: user.email,
      subject: "⏰ Your Hire.iOS Trial Has Ended - Upgrade to Continue",
      html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #FFD700; margin: 0;">HIRE.iOS</h1>
                    </div>
                    
                    <h2 style="color: #EF4444;">Your Free Trial Has Ended</h2>
                    
                    <p style="color: #ccc; line-height: 1.8;">
                        Hi ${user.fullname}, your 30-day free trial has come to an end.
                    </p>
                    
                    <p style="color: #ccc;">
                        You'll no longer have access to premium features like AI Resume Analysis, Mock Interviews, and Smart Matching.
                    </p>
                    
                    <div style="background: #111; border: 1px solid #EF4444; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <p style="color: #fff; margin: 0;">
                            🔒 <strong>Want to keep your access?</strong> Upgrade now and continue your job search.
                        </p>
                    </div>
                    
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/pricing" 
                       style="display: inline-block; background: #FFD700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        View Pricing Plans
                    </a>
                    
                    <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
                    
                    <p style="color: #888; font-size: 12px;">
                        © ${new Date().getFullYear()} Hire.iOS
                    </p>
                </div>
            `,
    };

    await sendEmail(emailData);

    user.emailsSent = user.emailsSent || {};
    user.emailsSent.trialExpiredEmail = true;
    await user.save();

    console.log(`📧 Trial expired email sent to ${user.email}`);
  } catch (error) {
    console.error("Trial expired email failed:", error);
  }
};

export default {
  initializeStudentTrial,
  checkTrialStatus,
  expireTrial,
  runTrialExpiryCheck,
  TRIAL_DURATION_DAYS,
};
