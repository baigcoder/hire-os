import mongoose from "mongoose";

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  basic: {
    name: "Basic",
    description: "Perfect for small businesses",
    prices: {
      monthly: 5000,
      quarterly: 13500, // 10% discount
      yearly: 48000, // 20% discount
    },
    features: {
      maxJobPostings: 5,
      maxRecruiters: 1,
      advancedAnalytics: false,
      prioritySupport: false,
      customBranding: false,
      bulkActions: false,
      aiRecommendations: false,
      videoInterviews: false,
      mcqTests: false,
    },
  },
  professional: {
    name: "Professional",
    description: "Best for growing companies",
    popular: true,
    prices: {
      monthly: 15000,
      quarterly: 40500,
      yearly: 144000,
    },
    features: {
      maxJobPostings: 20,
      maxRecruiters: 5,
      advancedAnalytics: true,
      prioritySupport: true,
      customBranding: true,
      bulkActions: true,
      aiRecommendations: true,
      videoInterviews: true,
      mcqTests: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations",
    prices: {
      monthly: 40000,
      quarterly: 108000,
      yearly: 384000,
    },
    features: {
      maxJobPostings: -1, // Unlimited
      maxRecruiters: -1, // Unlimited
      advancedAnalytics: true,
      prioritySupport: true,
      customBranding: true,
      bulkActions: true,
      aiRecommendations: true,
      videoInterviews: true,
      mcqTests: true,
      apiAccess: true,
      dedicatedSupport: true,
    },
  },
};

const paymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "PKR",
    },
    plan: {
      type: String,
      enum: ["basic", "professional", "enterprise"],
      required: true,
    },
    duration: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      default: "safepay",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    safepayReference: String,
    invoiceUrl: String,
  },
  { _id: true },
);

const recruiterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      default: "recruiter",
    },
    status: {
      type: String,
      enum: ["invited", "active", "inactive", "removed"],
      default: "invited",
    },
    invitationToken: String,
    invitationExpiresAt: Date,
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    joinedAt: Date,
    lastActiveAt: Date,
    permissions: {
      type: [String],
      default: ["post_jobs", "view_applications", "schedule_interviews"],
    },
  },
  { _id: true },
);

const companySchema = new mongoose.Schema(
  {
    // Basic Company Info
    name: {
      type: String,
      required: [true, "Company name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Company email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    website: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    logo: {
      type: String, // URL to company logo
    },
    coverImage: {
      type: String, // URL to cover image
    },
    industry: {
      type: String,
      trim: true,
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },
    foundedYear: Number,

    // Social Links
    socialLinks: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
    },

    // Company Culture Values
    culture: [
      {
        type: String,
        trim: true,
      },
    ],

    // Employee Benefits
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],

    // Gallery Images (Cloudinary URLs)
    gallery: [
      {
        url: { type: String, required: true },
        caption: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Tagline / Mission Statement
    tagline: {
      type: String,
      maxlength: [200, "Tagline cannot exceed 200 characters"],
      trim: true,
    },

    // Company Admin (Owner)
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Legacy field for backward compatibility
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Subscription Details
    subscription: {
      plan: {
        type: String,
        enum: ["basic", "professional", "enterprise"],
        default: "basic",
      },
      type: {
        type: String,
        enum: ["monthly", "quarterly", "yearly"],
        default: "monthly",
      },
      status: {
        type: String,
        enum: ["active", "expired", "cancelled", "pending", "trial"],
        default: "pending",
      },
      startDate: Date,
      endDate: Date,
      nextPaymentDate: Date,
      autoRenew: {
        type: Boolean,
        default: true,
      },
      trialEndsAt: Date,
    },

    // Feature Access (computed from plan)
    features: {
      maxJobPostings: {
        type: Number,
        default: 5,
      },
      maxRecruiters: {
        type: Number,
        default: 1,
      },
      advancedAnalytics: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      customBranding: {
        type: Boolean,
        default: false,
      },
      bulkActions: {
        type: Boolean,
        default: false,
      },
      aiRecommendations: {
        type: Boolean,
        default: false,
      },
      videoInterviews: {
        type: Boolean,
        default: false,
      },
      mcqTests: {
        type: Boolean,
        default: false,
      },
      apiAccess: {
        type: Boolean,
        default: false,
      },
      dedicatedSupport: {
        type: Boolean,
        default: false,
      },
    },

    // Usage Tracking
    usage: {
      jobsPosted: {
        type: Number,
        default: 0,
      },
      activeJobs: {
        type: Number,
        default: 0,
      },
      totalApplications: {
        type: Number,
        default: 0,
      },
      interviewsConducted: {
        type: Number,
        default: 0,
      },
      hiresThisMonth: {
        type: Number,
        default: 0,
      },
    },

    // Payment History
    payments: [paymentSchema],

    // Assigned Recruiters
    recruiters: [recruiterSchema],

    // Offer Letter Templates
    offerTemplates: [
      {
        name: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true },
        content: { type: String, required: true }, // HTML content
        isDefault: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Company Settings
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      applicationAlerts: {
        type: Boolean,
        default: true,
      },
      weeklyReports: {
        type: Boolean,
        default: true,
      },
      timezone: {
        type: String,
        default: "Asia/Karachi",
      },
      language: {
        type: String,
        default: "en",
      },
    },

    // Verification Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
companySchema.index({ name: "text", description: "text" });
companySchema.index({ adminUser: 1 });
companySchema.index({ "subscription.status": 1 });
companySchema.index({ "subscription.endDate": 1 });
companySchema.index({ industry: 1 });
companySchema.index({ location: 1 });

// Virtual for checking if subscription is active
companySchema.virtual("isSubscriptionActive").get(function () {
  if (this.subscription.status !== "active") return false;
  if (!this.subscription.endDate) return false;
  return new Date() < this.subscription.endDate;
});

// Virtual for days until subscription expires
companySchema.virtual("daysUntilExpiry").get(function () {
  if (!this.subscription.endDate) return 0;
  const diff = this.subscription.endDate - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for active recruiters count
companySchema.virtual("activeRecruitersCount").get(function () {
  return this.recruiters.filter((r) => r.status === "active").length;
});

// Method to check if can post more jobs
companySchema.methods.canPostJob = function () {
  if (this.features.maxJobPostings === -1) return true; // Unlimited
  return this.usage.activeJobs < this.features.maxJobPostings;
};

// Method to check if can add more recruiters
companySchema.methods.canAddRecruiter = function () {
  if (this.features.maxRecruiters === -1) return true; // Unlimited
  const activeCount = this.recruiters.filter(
    (r) => r.status === "active" || r.status === "invited",
  ).length;
  return activeCount < this.features.maxRecruiters;
};

// Method to check feature access
companySchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] === true;
};

// Method to update features based on plan
companySchema.methods.updateFeaturesFromPlan = function (planName) {
  const plan = SUBSCRIPTION_PLANS[planName];
  if (plan) {
    this.features = { ...this.features, ...plan.features };
  }
};

// Pre-save hook to sync userId with adminUser for backward compatibility
companySchema.pre("save", function (next) {
  if (this.adminUser && !this.userId) {
    this.userId = this.adminUser;
  }
  next();
});

// Ensure virtuals are included in JSON
companySchema.set("toJSON", { virtuals: true });
companySchema.set("toObject", { virtuals: true });

export const Company = mongoose.model("Company", companySchema);
