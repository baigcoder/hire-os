import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    // Supabase integration fields
    supabaseId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["email", "google", "github", "facebook"],
      default: "email",
    },
    role: {
      type: String,
      enum: {
        values: ["student", "recruiter", "company_admin", "super_admin"],
        message:
          "Role must be student, recruiter, company_admin, or super_admin",
      },
      required: [true, "Role is required"],
    },

    // Company Association (for recruiters and company admins)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

    // Invitation System (for recruited team members)
    invitation: {
      token: {
        type: String,
        index: true,
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "expired", "rejected"],
        default: "pending",
      },
      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      invitedAt: Date,
      acceptedAt: Date,
      expiresAt: Date,
    },

    // Role Permissions (for feature-gated access)
    permissions: {
      type: [String],
      default: [],
    },

    // Recruiter-specific fields
    recruiterProfile: {
      department: String,
      position: String,
      canPostJobs: {
        type: Boolean,
        default: true,
      },
      canManageApplications: {
        type: Boolean,
        default: true,
      },
      canScheduleInterviews: {
        type: Boolean,
        default: true,
      },
      canSendOffers: {
        type: Boolean,
        default: false,
      },
      canViewAnalytics: {
        type: Boolean,
        default: false,
      },
      jobsPosted: {
        type: Number,
        default: 0,
      },
      interviewsConducted: {
        type: Number,
        default: 0,
      },
      hiresMade: {
        type: Number,
        default: 0,
      },
    },

    profile: {
      bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
      },
      skills: [
        {
          type: String,
          trim: true,
        },
      ],
      resume: {
        type: String, // URL to resume file
      },
      resumeOriginalName: {
        type: String,
      },
      company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
      profilePhoto: {
        type: String,
        default: "",
      },
      experience: [
        {
          title: String,
          company: String,
          location: String,
          from: Date,
          to: Date,
          current: Boolean,
          description: String,
        },
      ],
      education: [
        {
          school: String,
          degree: String,
          fieldOfStudy: String,
          from: Date,
          to: Date,
          description: String,
        },
      ],
      socialLinks: {
        linkedin: String,
        github: String,
        portfolio: String,
        twitter: String,
      },
      // User's primary location for job matching
      location: {
        city: String,
        country: {
          type: String,
          default: "Pakistan",
        },
      },
    },
    // Security fields
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLogin: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    // Flag for recruiters who need to change their initial password
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    // Password reset fields
    passwordResetToken: {
      type: String,
      index: true,
    },
    passwordResetExpires: {
      type: Date,
    },
    // Notification preferences
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      jobAlerts: {
        type: Boolean,
        default: true,
      },
      applicationUpdates: {
        type: Boolean,
        default: true,
      },
      interviewReminders: {
        type: Boolean,
        default: true,
      },
    },
    // Saved jobs for students
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    // Job preferences for recommendations
    jobPreferences: {
      locations: [String],
      jobTypes: [String], // full-time, part-time, remote, etc.
      salaryMin: Number,
      salaryMax: Number,
      industries: [String],
    },

    // =============== SUBSCRIPTION & TRIAL SYSTEM ===============
    // For Students - Free Trial
    trialStartDate: {
      type: Date,
    },
    trialEndDate: {
      type: Date,
    },
    trialExpired: {
      type: Boolean,
      default: false,
    },
    hasUsedTrial: {
      type: Boolean,
      default: false,
    },

    // Email Notification Tracking
    emailsSent: {
      welcomeEmail: { type: Boolean, default: false },
      trialWarningEmail: { type: Boolean, default: false },
      trialExpiredEmail: { type: Boolean, default: false },
      packageRenewalEmail: { type: Boolean, default: false },
    },

    // Subscription Status (applies to all user types)
    subscriptionStatus: {
      type: String,
      enum: ["active", "trial", "expired", "cancelled", "pending"],
      default: "active",
    },

    // For tracking subscription-related events
    subscriptionEvents: [
      {
        event: {
          type: String,
          enum: [
            "trial_started",
            "trial_expired",
            "subscription_started",
            "subscription_expired",
            "subscription_renewed",
            "subscription_cancelled",
          ],
        },
        date: {
          type: Date,
          default: Date.now,
        },
        details: String,
      },
    ],

    // Last subscription check (for cron job efficiency)
    lastSubscriptionCheck: {
      type: Date,
    },

    // =============== ADVANCED SESSION MANAGEMENT ===============
    // Active Sessions (for multi-device login tracking)
    activeSessions: [{
      sessionId: {
        type: String,
        required: true,
        index: true,
      },
      refreshToken: {
        type: String,
        required: true,
      },
      deviceInfo: {
        type: String,
        default: "Unknown Device",
      },
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      lastUsed: {
        type: Date,
        default: Date.now,
      },
      expiresAt: {
        type: Date,
        required: true,
      },
    }],

    // Security Settings
    securitySettings: {
      loginNotifications: {
        type: Boolean,
        default: true,
      },
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      twoFactorSecret: {
        type: String,
        select: false, // Don't include in queries by default
      },
      trustedDevices: [{
        deviceId: String,
        name: String,
        addedAt: Date,
      }],
      lastSecurityReview: {
        type: Date,
      },
    },

    // Last login tracking for security
    lastLoginIp: {
      type: String,
    },
    lastLoginDevice: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better search performance
// // userSchema.index({ email: 1 }); // Removed to prevent duplicate index warning (already handled by unique: true)
userSchema.index({ role: 1 });
userSchema.index({ "profile.skills": 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full profile completeness
userSchema.virtual("profileComplete").get(function () {
  let score = 0;
  if (this.fullname) score += 20;
  if (this.email) score += 10;
  if (this.profile?.bio) score += 15;
  if (this.profile?.skills?.length > 0) score += 20;
  if (this.profile?.resume) score += 20;
  if (this.profile?.profilePhoto) score += 15;
  return score;
});

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Pre-save hook to update timestamps
userSchema.pre("save", function (next) {
  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = new Date();
  }
  next();
});

export const User = mongoose.model("User", userSchema);
