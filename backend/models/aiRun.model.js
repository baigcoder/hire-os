import mongoose from "mongoose";

/**
 * One document per AI gateway call: which task ran, which model answered,
 * whether it was cached or degraded, latency and token usage.
 * Expires after 30 days.
 */
const attemptSchema = new mongoose.Schema(
  {
    provider: String,
    model: String,
    ok: Boolean,
    error: String,
    latencyMs: Number,
  },
  { _id: false },
);

const aiRunSchema = new mongoose.Schema(
  {
    task: { type: String, required: true },
    status: {
      type: String,
      enum: ["success", "error"],
      required: true,
    },
    provider: String,
    model: String,
    cached: { type: Boolean, default: false },
    degraded: { type: Boolean, default: false },
    latencyMs: Number,
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    attempts: [attemptSchema],
    error: String,
    requestId: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

aiRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
aiRunSchema.index({ task: 1, createdAt: -1 });

export const AiRun = mongoose.model("AiRun", aiRunSchema);
