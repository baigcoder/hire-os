import mongoose from "mongoose";

const careerCoachSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // Session messages
        messages: [{
            role: {
                type: String,
                enum: ["user", "assistant", "system"],
                required: true,
            },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
            metadata: mongoose.Schema.Types.Mixed,
        }],
        // Session topic/category
        topic: {
            type: String,
            enum: ["resume", "interview", "career_path", "salary", "skills", "job_search", "general"],
            default: "general",
        },
        title: String,
        // Context for AI
        context: {
            userProfile: mongoose.Schema.Types.Mixed,
            currentJob: String,
            targetJob: String,
            skills: [String],
        },
        // Generated recommendations
        recommendations: [{
            type: {
                type: String,
                enum: ["skill", "job", "course", "action", "resource"],
            },
            title: String,
            description: String,
            priority: { type: String, enum: ["low", "medium", "high"] },
            completed: { type: Boolean, default: false },
            completedAt: Date,
            url: String,
        }],
        // Career goals
        careerGoals: [{
            goal: String,
            timeline: String,
            status: { type: String, enum: ["active", "completed", "paused"] },
            progress: { type: Number, min: 0, max: 100, default: 0 },
        }],
        // Session status
        status: {
            type: String,
            enum: ["active", "completed", "archived"],
            default: "active",
        },
        // Feedback
        rating: { type: Number, min: 1, max: 5 },
        feedback: String,
    },
    { timestamps: true }
);

// Indexes
careerCoachSessionSchema.index({ user: 1, status: 1 });
careerCoachSessionSchema.index({ createdAt: -1 });

// Virtual for message count
careerCoachSessionSchema.virtual("messageCount").get(function () {
    return this.messages?.length || 0;
});

// Method to add message
careerCoachSessionSchema.methods.addMessage = function (role, content, metadata) {
    this.messages.push({ role, content, metadata, timestamp: new Date() });
    return this.save();
};

careerCoachSessionSchema.set("toJSON", { virtuals: true });
careerCoachSessionSchema.set("toObject", { virtuals: true });

export const CareerCoachSession = mongoose.model("CareerCoachSession", careerCoachSessionSchema);
