import mongoose from "mongoose";

const talentPoolSchema = new mongoose.Schema(
    {
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            maxlength: 500,
        },
        color: {
            type: String,
            default: "#6366f1",
        },
        // Candidates in this pool
        candidates: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            addedAt: { type: Date, default: Date.now },
            addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            tags: [String],
            notes: String,
            source: {
                type: String,
                enum: ["application", "sourced", "referral", "import", "other"],
                default: "application",
            },
            originalApplication: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
            rating: { type: Number, min: 1, max: 5 },
            status: {
                type: String,
                enum: ["active", "contacted", "in_process", "not_interested", "hired", "archived"],
                default: "active",
            },
            lastContacted: Date,
            nextFollowUp: Date,
            contactHistory: [{
                type: { type: String, enum: ["email", "call", "message", "interview", "note"] },
                content: String,
                createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                createdAt: { type: Date, default: Date.now },
            }],
        }],
        // Automation rules
        automations: [{
            name: String,
            trigger: {
                type: String,
                enum: ["added", "status_change", "idle_7_days", "idle_30_days", "tag_added"],
            },
            condition: mongoose.Schema.Types.Mixed,
            action: {
                type: String,
                enum: ["send_email", "notify_recruiter", "add_tag", "change_status", "schedule_followup"],
            },
            actionConfig: mongoose.Schema.Types.Mixed,
            isActive: { type: Boolean, default: true },
        }],
        // Settings
        isArchived: { type: Boolean, default: false },
        visibility: {
            type: String,
            enum: ["private", "team", "company"],
            default: "team",
        },
        sharedWith: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
    },
    { timestamps: true }
);

// Indexes
talentPoolSchema.index({ company: 1, isArchived: 1 });
talentPoolSchema.index({ "candidates.user": 1 });
talentPoolSchema.index({ "candidates.status": 1 });

// Virtual for candidate count
talentPoolSchema.virtual("candidateCount").get(function () {
    return this.candidates?.length || 0;
});

// Method to add candidate
talentPoolSchema.methods.addCandidate = function (userId, addedBy, options = {}) {
    const exists = this.candidates.find((c) => c.user.toString() === userId.toString());
    if (exists) return false;

    this.candidates.push({
        user: userId,
        addedBy,
        ...options,
    });
    return this.save();
};

// Method to update candidate status
talentPoolSchema.methods.updateCandidateStatus = function (userId, status, notes) {
    const candidate = this.candidates.find((c) => c.user.toString() === userId.toString());
    if (!candidate) return false;

    candidate.status = status;
    if (notes) candidate.notes = notes;
    return this.save();
};

talentPoolSchema.set("toJSON", { virtuals: true });
talentPoolSchema.set("toObject", { virtuals: true });

export const TalentPool = mongoose.model("TalentPool", talentPoolSchema);
