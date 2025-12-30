import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
    {
        // User who created the referral
        referrer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Referred user (populated after signup)
        referee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        // Email of invited person (before signup)
        refereeEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },

        // Optional: Job-specific referral
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
        },

        // Unique referral code (e.g., "JOHN-ABC123")
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            index: true,
        },

        // Referral status tracking
        status: {
            type: String,
            enum: ["pending", "signed_up", "applied", "hired", "rewarded", "expired"],
            default: "pending",
            index: true,
        },

        // Reward information
        reward: {
            type: {
                type: String,
                enum: ["cash", "credits", "premium_days"],
                default: "credits",
            },
            amount: {
                type: Number,
                default: 0,
            },
            currency: {
                type: String,
                default: "PKR",
            },
            paidAt: Date,
            transactionId: String,
        },

        // Tracking metadata
        metadata: {
            source: {
                type: String,
                enum: ["email", "link", "social", "direct"],
                default: "link",
            },
            campaign: String,
            medium: String,
            clickCount: {
                type: Number,
                default: 0,
            },
            lastClickedAt: Date,
        },

        // Email invitation details
        invitation: {
            sentAt: Date,
            message: String,
            reminderSentAt: Date,
        },

        // Expiry (optional, for time-limited referrals)
        expiresAt: {
            type: Date,
            index: true,
        },

        // Notes
        notes: String,
    },
    {
        timestamps: true,
    }
);

// Indexes for common queries
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ refereeEmail: 1 });
referralSchema.index({ createdAt: -1 });

// Virtual for checking if expired
referralSchema.virtual("isExpired").get(function () {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
});

// Method to generate referral code
referralSchema.statics.generateCode = async function (userName) {
    const prefix = userName
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 4)
        .toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${prefix}-${suffix}`;

    // Check uniqueness
    const exists = await this.findOne({ code });
    if (exists) {
        return this.generateCode(userName); // Retry
    }
    return code;
};

// Method to record a click
referralSchema.methods.recordClick = function () {
    this.metadata.clickCount = (this.metadata.clickCount || 0) + 1;
    this.metadata.lastClickedAt = new Date();
    return this.save();
};

// Method to mark as signed up
referralSchema.methods.markSignedUp = function (refereeId) {
    this.referee = refereeId;
    this.status = "signed_up";
    return this.save();
};

// Method to mark as rewarded
referralSchema.methods.markRewarded = function (amount, type = "credits") {
    this.reward.amount = amount;
    this.reward.type = type;
    this.reward.paidAt = new Date();
    this.status = "rewarded";
    return this.save();
};

// Ensure virtuals are included in JSON
referralSchema.set("toJSON", { virtuals: true });
referralSchema.set("toObject", { virtuals: true });

export const Referral = mongoose.model("Referral", referralSchema);
