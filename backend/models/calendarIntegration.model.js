import mongoose from "mongoose";

const calendarIntegrationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        provider: {
            type: String,
            enum: ["google", "outlook", "apple"],
            required: true,
        },
        // OAuth tokens
        accessToken: { type: String, required: true },
        refreshToken: { type: String, required: true },
        tokenExpiry: Date,
        // Calendar settings
        calendarId: String,
        calendarName: String,
        // Sync settings
        syncEnabled: { type: Boolean, default: true },
        syncDirection: {
            type: String,
            enum: ["one_way", "two_way"],
            default: "two_way",
        },
        autoCreateEvents: { type: Boolean, default: true },
        // Availability settings
        workingHours: {
            timezone: { type: String, default: "Asia/Karachi" },
            days: [{
                day: { type: Number, min: 0, max: 6 }, // 0=Sunday
                start: String, // "09:00"
                end: String,   // "17:00"
                enabled: { type: Boolean, default: true },
            }],
        },
        bufferTime: { type: Number, default: 15 }, // minutes between meetings
        // Status
        status: {
            type: String,
            enum: ["connected", "expired", "error", "disconnected"],
            default: "connected",
        },
        lastSyncAt: Date,
        lastError: String,
    },
    { timestamps: true }
);

// Index for unique user-provider combo
calendarIntegrationSchema.index({ user: 1, provider: 1 }, { unique: true });

// Method to refresh token
calendarIntegrationSchema.methods.isTokenExpired = function () {
    if (!this.tokenExpiry) return true;
    return new Date() >= this.tokenExpiry;
};

export const CalendarIntegration = mongoose.model("CalendarIntegration", calendarIntegrationSchema);
