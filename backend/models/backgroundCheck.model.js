import mongoose from "mongoose";

const backgroundCheckSchema = new mongoose.Schema(
    {
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application",
            required: true,
            index: true,
        },
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        // Provider
        provider: {
            type: String,
            enum: ["checkr", "goodhire", "sterling", "manual"],
            default: "manual",
        },
        providerReportId: String,
        // Check types
        checks: [{
            type: {
                type: String,
                enum: ["identity", "criminal", "education", "employment", "credit", "drug", "reference"],
                required: true,
            },
            status: {
                type: String,
                enum: ["pending", "processing", "completed", "error"],
                default: "pending",
            },
            result: {
                type: String,
                enum: ["clear", "consider", "alert", "pending"],
            },
            details: mongoose.Schema.Types.Mixed,
            completedAt: Date,
        }],
        // Overall status
        status: {
            type: String,
            enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
            default: "pending",
            index: true,
        },
        overallResult: {
            type: String,
            enum: ["clear", "consider", "alert"],
        },
        // Requestor info
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        requestedAt: { type: Date, default: Date.now },
        // Completion
        completedAt: Date,
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reviewedAt: Date,
        reviewNotes: String,
        // Report
        reportUrl: String,
        // Cost tracking
        cost: {
            amount: Number,
            currency: { type: String, default: "USD" },
        },
        // Candidate consent
        consentGiven: { type: Boolean, default: false },
        consentDate: Date,
        consentDocument: String,
    },
    { timestamps: true }
);

// Indexes
backgroundCheckSchema.index({ company: 1, status: 1 });
backgroundCheckSchema.index({ candidate: 1 });

// Virtual for completion percentage
backgroundCheckSchema.virtual("completionPercent").get(function () {
    if (!this.checks?.length) return 0;
    const completed = this.checks.filter((c) => c.status === "completed").length;
    return Math.round((completed / this.checks.length) * 100);
});

backgroundCheckSchema.set("toJSON", { virtuals: true });
backgroundCheckSchema.set("toObject", { virtuals: true });

export const BackgroundCheck = mongoose.model("BackgroundCheck", backgroundCheckSchema);
