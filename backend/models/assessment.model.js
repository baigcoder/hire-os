import mongoose from "mongoose";

// Question Schema for assessments
const assessmentQuestionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["mcq", "code", "text", "sql"],
            required: true,
        },
        question: {
            type: String,
            required: true,
        },
        // For MCQ questions
        options: [{
            type: String,
        }],
        correctAnswer: {
            type: mongoose.Schema.Types.Mixed,
        },
        // For coding questions
        codeTemplate: {
            type: String,
        },
        testCases: [{
            input: String,
            expected: String,
            hidden: { type: Boolean, default: false },
        }],
        language: {
            type: String,
            enum: ["javascript", "python", "java", "typescript", "sql", "any"],
        },
        // Scoring
        points: {
            type: Number,
            default: 10,
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },
        // Hints (optional)
        hints: [{
            type: String,
        }],
        // Explanation shown after submission
        explanation: String,
        // Time limit for this question (seconds)
        timeLimit: Number,
    },
    { _id: true }
);

// Main Assessment Schema
const assessmentSchema = new mongoose.Schema(
    {
        // Owner
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
        // Assessment details
        title: {
            type: String,
            required: [true, "Assessment title is required"],
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            maxlength: 2000,
        },
        type: {
            type: String,
            enum: ["mcq", "coding", "written", "mixed", "sql"],
            default: "mixed",
        },
        category: {
            type: String,
            enum: [
                "javascript",
                "python",
                "java",
                "react",
                "nodejs",
                "sql",
                "data_structures",
                "algorithms",
                "system_design",
                "aptitude",
                "communication",
                "general",
                "other",
            ],
            default: "general",
            index: true,
        },
        // Questions
        questions: [assessmentQuestionSchema],
        // Settings
        duration: {
            type: Number, // minutes
            required: true,
            min: 5,
            max: 480,
        },
        passingScore: {
            type: Number,
            default: 60,
            min: 0,
            max: 100,
        },
        shuffleQuestions: {
            type: Boolean,
            default: true,
        },
        shuffleOptions: {
            type: Boolean,
            default: true,
        },
        showResults: {
            type: Boolean,
            default: false,
        },
        allowReview: {
            type: Boolean,
            default: false,
        },
        // Proctoring settings
        proctoring: {
            enabled: { type: Boolean, default: false },
            webcamRequired: { type: Boolean, default: false },
            tabSwitchLimit: { type: Number, default: 3 },
            fullscreenRequired: { type: Boolean, default: false },
        },
        // Access control
        isPublic: {
            type: Boolean,
            default: false,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Usage tracking
        usageCount: {
            type: Number,
            default: 0,
        },
        lastUsedAt: Date,
        // Tags for search
        tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
        // Difficulty distribution
        difficulty: {
            type: String,
            enum: ["beginner", "intermediate", "advanced", "expert"],
            default: "intermediate",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
assessmentSchema.index({ company: 1, category: 1 });
assessmentSchema.index({ isPublic: 1, category: 1 });
assessmentSchema.index({ title: "text", description: "text", tags: "text" });

// Virtual for total points
assessmentSchema.virtual("totalPoints").get(function () {
    return this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
});

// Virtual for question count
assessmentSchema.virtual("questionCount").get(function () {
    return this.questions.length;
});

// Method to record usage
assessmentSchema.methods.recordUsage = function () {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    return this.save();
};

// Static to get popular assessments
assessmentSchema.statics.getPopular = function (category, limit = 10) {
    const query = { isPublic: true, isActive: true };
    if (category) query.category = category;
    return this.find(query)
        .sort({ usageCount: -1 })
        .limit(limit)
        .populate("company", "name logo");
};

// Ensure virtuals are included
assessmentSchema.set("toJSON", { virtuals: true });
assessmentSchema.set("toObject", { virtuals: true });

export const Assessment = mongoose.model("Assessment", assessmentSchema);
