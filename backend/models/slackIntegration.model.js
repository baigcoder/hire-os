import mongoose from "mongoose";

const slackIntegrationSchema = new mongoose.Schema(
    {
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
            unique: true,
        },
        installedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        platform: {
            type: String,
            enum: ["slack", "teams"],
            required: true,
        },
        // OAuth data
        accessToken: { type: String, required: true },
        botToken: String,
        teamId: String,
        teamName: String,
        // Channel configuration
        channels: [{
            channelId: { type: String, required: true },
            channelName: String,
            isDefault: { type: Boolean, default: false },
            notifications: {
                newApplication: { type: Boolean, default: true },
                interviewScheduled: { type: Boolean, default: true },
                offerSent: { type: Boolean, default: true },
                candidateHired: { type: Boolean, default: true },
                applicationStatusChange: { type: Boolean, default: false },
            },
        }],
        // Webhook URL (for Teams)
        webhookUrl: String,
        // Status
        status: {
            type: String,
            enum: ["active", "error", "disconnected"],
            default: "active",
        },
        lastError: String,
        // Stats
        messagesSent: { type: Number, default: 0 },
        lastMessageAt: Date,
    },
    { timestamps: true }
);

// Method to record message sent
slackIntegrationSchema.methods.recordMessage = function () {
    this.messagesSent += 1;
    this.lastMessageAt = new Date();
    return this.save();
};

export const SlackIntegration = mongoose.model("SlackIntegration", slackIntegrationSchema);
