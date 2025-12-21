import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Notification Type
    type: {
      type: String,
      enum: [
        // Application Related
        "application_received", // Recruiter: New application received
        "application_viewed", // Student: Your application was viewed
        "application_status_update", // Student: Application status changed
        "application_shortlisted", // Student: You've been shortlisted
        "application_rejected", // Student: Application rejected

        // Interview Related
        "interview_scheduled", // Student: Interview scheduled
        "interview_reminder", // Both: Interview reminder (15min, 1hr, 1day)
        "interview_started", // Both: Interview has started
        "interview_cancelled", // Both: Interview cancelled
        "mcq_available", // Student: MCQ test is now available
        "mcq_passed", // Student: You passed the MCQ
        "mcq_failed", // Student: MCQ score below threshold
        "video_interview_ready", // Student: Video interview can start
        "fraud_alert", // Recruiter: Fraud detected during interview

        // Offer Related
        "offer_received", // Student: You received an offer
        "offer_accepted", // Recruiter: Candidate accepted offer
        "offer_rejected", // Recruiter: Candidate rejected offer
        "offer_expiring", // Student: Offer expires soon

        // Company Related
        "recruiter_invited", // Recruiter: You've been invited to join
        "recruiter_joined", // Company Admin: Recruiter accepted invite
        "recruiter_removed", // Recruiter: You've been removed
        "subscription_expiring", // Company Admin: Subscription expires soon
        "subscription_expired", // Company Admin: Subscription expired
        "payment_success", // Company Admin: Payment successful
        "payment_failed", // Company Admin: Payment failed
        "usage_limit_warning", // Company Admin: Approaching usage limit

        // Job Related
        "job_posted", // System: New job posted (for saved searches)
        "job_expiring", // Recruiter: Job posting expires soon
        "job_expired", // Recruiter: Job posting expired

        // Message Related
        "message", // Direct message
        "announcement", // Broadcast/Announcement

        // System
        "welcome", // New user welcome
        "profile_incomplete", // Reminder to complete profile
        "new_feature", // New feature announcement
        "system_maintenance", // System maintenance notice
        "security_alert", // Security related notification
      ],
      required: true,
      index: true,
    },

    // Priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Content
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    shortMessage: {
      type: String,
      maxlength: 100,
    },

    // Icon/Visual
    icon: {
      type: String,
      default: "bell",
    },
    color: {
      type: String,
      default: "blue",
    },

    // Action
    actionUrl: {
      type: String,
    },
    actionText: {
      type: String,
      default: "View Details",
    },
    actions: [
      {
        label: String,
        url: String,
        type: {
          type: String,
          enum: ["primary", "secondary", "danger"],
          default: "primary",
        },
      },
    ],

    // Related Entities
    relatedEntities: {
      jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
      applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Application",
      },
      interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
      },
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Additional Data
    data: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: {
      type: Date,
    },

    // Email Notification
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    emailError: {
      type: String,
    },

    // Push Notification (for future mobile app)
    pushSent: {
      type: Boolean,
      default: false,
    },
    pushSentAt: {
      type: Date,
    },

    // Scheduling
    scheduledFor: {
      type: Date,
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },

    // Expiry
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, isScheduled: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create notification with defaults based on type
notificationSchema.statics.createNotification = async function (params) {
  const {
    userId,
    type,
    title,
    message,
    relatedEntities,
    data,
    priority,
    actionUrl,
  } = params;

  // Default configurations based on type
  const typeConfig = {
    interview_scheduled: {
      icon: "calendar",
      color: "green",
      priority: "high",
      sendEmail: true,
    },
    interview_reminder: {
      icon: "clock",
      color: "yellow",
      priority: "urgent",
      sendEmail: true,
    },
    application_received: {
      icon: "inbox",
      color: "blue",
      priority: "normal",
      sendEmail: true,
    },
    offer_received: {
      icon: "gift",
      color: "gold",
      priority: "urgent",
      sendEmail: true,
    },
    fraud_alert: {
      icon: "alert-triangle",
      color: "red",
      priority: "urgent",
      sendEmail: true,
    },
    mcq_available: {
      icon: "file-text",
      color: "purple",
      priority: "high",
      sendEmail: true,
    },
    subscription_expiring: {
      icon: "credit-card",
      color: "orange",
      priority: "high",
      sendEmail: true,
    },
  };

  const config = typeConfig[type] || {};

  const notification = new this({
    userId,
    type,
    title,
    message,
    relatedEntities,
    data,
    priority: priority || config.priority || "normal",
    icon: config.icon || "bell",
    color: config.color || "blue",
    actionUrl,
  });

  await notification.save();

  // TODO: Send email if config.sendEmail is true
  // TODO: Send push notification if user has push enabled

  return notification;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ userId, read: false, dismissed: false });
};

// Static method to mark multiple as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() },
  );
};

// Static method to get notifications for user
notificationSchema.statics.getForUser = async function (userId, options = {}) {
  const { limit = 20, skip = 0, unreadOnly = false, types = null } = options;

  const query = { userId, dismissed: false };

  if (unreadOnly) {
    query.read = false;
  }

  if (types && types.length > 0) {
    query.type = { $in: types };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("relatedEntities.jobId", "title company")
    .populate("relatedEntities.companyId", "name logo")
    .populate("relatedEntities.senderId", "fullname profile.profilePhoto");
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to dismiss
notificationSchema.methods.dismiss = async function () {
  this.dismissed = true;
  this.dismissedAt = new Date();
  return this.save();
};

export const Notification = mongoose.model("Notification", notificationSchema);
