import mongoose from "mongoose";

/**
 * Audit Log Schema
 * Records admin and critical user actions for compliance and debugging
 */
const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["student", "recruiter", "ceo", "admin"],
      required: true,
    },

    // What action was performed
    action: {
      type: String,
      required: true,
      enum: [
        // Auth actions
        "LOGIN",
        "LOGOUT",
        "LOGIN_FAILED",
        "PASSWORD_CHANGE",
        "PASSWORD_RESET",
        "2FA_ENABLED",
        "2FA_DISABLED",

        // User actions
        "USER_CREATE",
        "USER_UPDATE",
        "USER_DELETE",
        "USER_SUSPEND",
        "USER_ACTIVATE",
        "PROFILE_UPDATE",
        "ROLE_CHANGE",

        // Job actions
        "JOB_CREATE",
        "JOB_UPDATE",
        "JOB_DELETE",
        "JOB_ARCHIVE",

        // Application actions
        "APPLICATION_SUBMIT",
        "APPLICATION_WITHDRAW",
        "APPLICATION_APPROVE",
        "APPLICATION_REJECT",

        // Interview actions
        "INTERVIEW_SCHEDULE",
        "INTERVIEW_COMPLETE",
        "INTERVIEW_CANCEL",
        "OFFER_SEND",
        "OFFER_ACCEPT",
        "OFFER_REJECT",

        // Admin actions
        "SETTINGS_UPDATE",
        "SUBSCRIPTION_CHANGE",
        "PLAN_CHANGE",
        "EXPORT_DATA",
        "BULK_DELETE",
        "SYSTEM_CONFIG_CHANGE",

        // AI actions
        "AI_ANALYSIS",
        "AI_REPORT_GENERATE",

        // Other
        "OTHER",
      ],
      index: true,
    },

    // What was affected
    targetType: {
      type: String,
      enum: [
        "User",
        "Job",
        "Application",
        "Interview",
        "Company",
        "Subscription",
        "System",
        "Other",
      ],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    targetName: {
      type: String, // Human readable identifier
    },

    // Details
    details: {
      type: mongoose.Schema.Types.Mixed, // Flexible JSON for action-specific data
      default: {},
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed, // For tracking changes
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed, // For tracking changes
    },

    // Request context
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    requestPath: {
      type: String,
    },
    requestMethod: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },

    // Result
    status: {
      type: String,
      enum: ["success", "failure", "pending"],
      default: "success",
    },
    errorMessage: {
      type: String,
    },

    // Metadata
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We use our own timestamp
    collection: "audit_logs",
  },
);

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });

// TTL index - auto-delete logs older than 1 year
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
);

// Static method to get recent logs for a user
auditLogSchema.statics.getForUser = async function (userId, limit = 50) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit).lean();
};

// Static method to get logs for a target
auditLogSchema.statics.getForTarget = async function (
  targetType,
  targetId,
  limit = 50,
) {
  return this.find({ targetType, targetId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Static method to get login history
auditLogSchema.statics.getLoginHistory = async function (userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    userId,
    action: { $in: ["LOGIN", "LOGIN_FAILED", "LOGOUT"] },
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .lean();
};

// Static method to get security alerts (failed logins, etc.)
auditLogSchema.statics.getSecurityAlerts = async function (limit = 100) {
  return this.find({
    action: {
      $in: ["LOGIN_FAILED", "PASSWORD_RESET", "2FA_DISABLED", "BULK_DELETE"],
    },
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("userId", "fullname email")
    .lean();
};

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
