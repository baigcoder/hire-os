import cron from "node-cron";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import {
  sendTrialExpiryEmail,
  sendSubscriptionExpiryEmail,
  sendTrialExpiredEmail,
} from "./email.js";

/**
 * HIRE.OS Subscription Monitor
 * Background service to monitor and manage subscription/trial expiry
 */

class SubscriptionMonitor {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the subscription monitoring cron jobs
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️  Subscription Monitor already running");
      return;
    }

    console.log("🔄 Starting Subscription Monitor...");

    // Run every hour to check for expired trials and subscriptions
    cron.schedule("0 * * * *", () => {
      this.checkStudentTrials();
      this.checkCompanySubscriptions();
    });

    // Run daily at midnight to send reminder emails
    cron.schedule("0 0 * * *", () => {
      this.sendExpiryReminders();
    });

    // Run every 5 minutes in development for testing
    if (process.env.NODE_ENV === "development") {
      cron.schedule("*/5 * * * *", () => {
        console.log("🔍 [DEV] Quick subscription check...");
        this.checkStudentTrials();
        this.checkCompanySubscriptions();
      });
    }

    this.isRunning = true;
    console.log("✅ Subscription Monitor started");
  }

  /**
   * Check and expire student free trials
   */
  async checkStudentTrials() {
    try {
      const now = new Date();

      // Find students with expired trials that haven't been marked as expired
      const expiredStudents = await User.find({
        role: "student",
        subscriptionStatus: "trial",
        trialEndDate: { $lte: now },
        trialExpired: false,
      });

      if (expiredStudents.length === 0) {
        return;
      }

      console.log(`📋 Found ${expiredStudents.length} expired student trials`);

      for (const student of expiredStudents) {
        try {
          // Mark trial as expired
          student.trialExpired = true;
          student.subscriptionStatus = "expired";
          student.isActive = false;
          student.subscriptionEvents.push({
            event: "trial_expired",
            date: now,
            details: `Trial period ended after 30 days`,
          });
          student.lastSubscriptionCheck = now;

          await student.save();

          // Send expiry notification email
          try {
            await sendTrialExpiredEmail(student.email, student.fullname);
          } catch (emailError) {
            console.error(
              `Failed to send trial expired email to ${student.email}:`,
              emailError,
            );
          }

          console.log(`⏰ Trial expired for student: ${student.email}`);
        } catch (error) {
          console.error(`Error processing student ${student.email}:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking student trials:", error);
    }
  }

  /**
   * Check and expire company subscriptions
   */
  async checkCompanySubscriptions() {
    try {
      const now = new Date();

      // Find companies with expired subscriptions
      const expiredCompanies = await Company.find({
        "subscription.status": "active",
        "subscription.endDate": { $lte: now },
      }).populate("adminUser");

      if (expiredCompanies.length === 0) {
        return;
      }

      console.log(
        `📋 Found ${expiredCompanies.length} expired company subscriptions`,
      );

      for (const company of expiredCompanies) {
        try {
          // Mark subscription as expired
          company.subscription.status = "expired";
          company.isActive = false;
          await company.save();

          // Mark CEO/Admin as expired
          if (company.adminUser) {
            await User.findByIdAndUpdate(company.adminUser._id, {
              subscriptionStatus: "expired",
              isActive: false,
              $push: {
                subscriptionEvents: {
                  event: "subscription_expired",
                  date: now,
                  details: `Company subscription expired for plan: ${company.subscription.plan}`,
                },
              },
            });
          }

          // Mark all company recruiters as expired
          const recruiterIds = company.recruiters
            .filter((r) => r.userId && r.status === "active")
            .map((r) => r.userId);

          if (recruiterIds.length > 0) {
            await User.updateMany(
              { _id: { $in: recruiterIds } },
              {
                subscriptionStatus: "expired",
                isActive: false,
                $push: {
                  subscriptionEvents: {
                    event: "subscription_expired",
                    date: now,
                    details: `Company subscription expired`,
                  },
                },
              },
            );
          }

          // Send expiry notification to CEO
          if (company.adminUser?.email) {
            try {
              await sendSubscriptionExpiryEmail(
                company.adminUser.email,
                company.adminUser.fullname,
                company.name,
              );
            } catch (emailError) {
              console.error(
                `Failed to send expiry email to ${company.adminUser.email}:`,
                emailError,
              );
            }
          }

          console.log(`⏰ Subscription expired for company: ${company.name}`);
        } catch (error) {
          console.error(`Error processing company ${company.name}:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking company subscriptions:", error);
    }
  }

  /**
   * Send reminder emails before expiry
   */
  async sendExpiryReminders() {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000,
      );
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      // Send 7-day reminder to students
      const studentsNearing7Days = await User.find({
        role: "student",
        subscriptionStatus: "trial",
        trialEndDate: { $gte: now, $lte: sevenDaysFromNow },
        trialExpired: false,
      });

      for (const student of studentsNearing7Days) {
        const daysLeft = Math.ceil(
          (student.trialEndDate - now) / (1000 * 60 * 60 * 24),
        );
        try {
          await sendTrialExpiryEmail(student.email, student.fullname, daysLeft);
        } catch (error) {
          console.error(`Failed to send reminder to ${student.email}:`, error);
        }
      }

      // Send 7-day reminder to companies
      const companiesNearing7Days = await Company.find({
        "subscription.status": "active",
        "subscription.endDate": { $gte: now, $lte: sevenDaysFromNow },
      }).populate("adminUser");

      for (const company of companiesNearing7Days) {
        if (company.adminUser?.email) {
          const daysLeft = Math.ceil(
            (company.subscription.endDate - now) / (1000 * 60 * 60 * 24),
          );
          try {
            await sendTrialExpiryEmail(
              company.adminUser.email,
              company.adminUser.fullname,
              daysLeft,
              company.name,
            );
          } catch (error) {
            console.error(
              `Failed to send reminder to ${company.adminUser.email}:`,
              error,
            );
          }
        }
      }

      console.log(
        `📧 Sent expiry reminders: ${studentsNearing7Days.length} students, ${companiesNearing7Days.length} companies`,
      );
    } catch (error) {
      console.error("Error sending expiry reminders:", error);
    }
  }

  /**
   * Manually check a specific user's subscription status
   */
  async checkUserSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return { valid: false, reason: "User not found" };

      // Check for expired trial (students)
      if (user.role === "student") {
        if (user.trialExpired) {
          return { valid: false, reason: "Trial period has expired" };
        }
        if (user.subscriptionStatus === "expired") {
          return { valid: false, reason: "Subscription has expired" };
        }
      }

      // Check company subscription (recruiters and company_admin)
      if (user.role === "recruiter" || user.role === "company_admin") {
        if (user.companyId) {
          const company = await Company.findById(user.companyId);
          if (!company) {
            return { valid: false, reason: "Company not found" };
          }
          if (company.subscription.status === "expired") {
            return { valid: false, reason: "Company subscription has expired" };
          }
          if (
            company.subscription.endDate &&
            new Date() > company.subscription.endDate
          ) {
            return { valid: false, reason: "Company subscription has expired" };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      console.error("Error checking user subscription:", error);
      return { valid: false, reason: "Error checking subscription" };
    }
  }
}

// Export singleton instance
export const subscriptionMonitor = new SubscriptionMonitor();

// Export function to check subscription in middleware
export const isSubscriptionValid = async (userId) => {
  return await subscriptionMonitor.checkUserSubscription(userId);
};
