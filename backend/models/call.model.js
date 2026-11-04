import mongoose from "mongoose";

export const CALL_RING_MS = 45_000;

/** A one-to-one audio or video call between two people allowed to contact each other. */
const callSchema = new mongoose.Schema(
  {
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    calleeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["audio", "video"], default: "video" },
    status: { type: String, enum: ["ringing", "accepted", "declined", "missed", "ended"], default: "ringing" },
    answeredAt: Date,
    endedAt: Date,
  },
  { timestamps: true },
);

// Call records are signalling state, not history: kept a week
callSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

export const Call = mongoose.model("Call", callSchema);
