import mongoose from "mongoose";

export const EVENT_RETENTION_DAYS = 90;

/** One detector observation, kept 90 days (TTL) for the report and disputes. */
const integrityEventSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "IntegritySession", required: true },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    kind: { type: String, enum: ["behavior", "tamper"], required: true },
    type: { type: String, required: true },
    source: { type: String, enum: ["candidate", "recruiter", "server"], required: true },
    at: { type: Date, required: true },
    durationMs: { type: Number, default: 0 },
    confidence: Number,
    counted: { type: Boolean, default: false },
    reason: String,
    points: { type: Number, default: 0 },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: "IntegrityEvidence" },
    detail: String,
    // Recruiter-side sightings: compared with the candidate's detector yet?
    crossChecked: Boolean,
    mismatch: Boolean,
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

integrityEventSchema.index({ sessionId: 1, at: 1 });
integrityEventSchema.index(
  { sessionId: 1, source: 1, crossChecked: 1 },
  { partialFilterExpression: { crossChecked: false } },
);
integrityEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: EVENT_RETENTION_DAYS * 24 * 3600 },
);

export const IntegrityEvent = mongoose.model("IntegrityEvent", integrityEventSchema);
