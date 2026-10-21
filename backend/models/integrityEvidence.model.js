import mongoose from "mongoose";

export const EVIDENCE_RETENTION_DAYS = 30;

/**
 * A small still frame captured at a high-severity moment, stored in a
 * private bucket. The storage object is deleted by a delayed queue job at
 * expiresAt; the TTL index removes this record as a backstop.
 */
const integrityEvidenceSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "IntegritySession", required: true, index: true },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    source: { type: String, enum: ["candidate", "recruiter"], required: true },
    signal: String,
    at: Date,
    bucket: { type: String, required: true },
    path: { type: String, required: true },
    bytes: Number,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

// Backstop: an hour after the purge job should have run
integrityEvidenceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const IntegrityEvidence = mongoose.model("IntegrityEvidence", integrityEvidenceSchema);
