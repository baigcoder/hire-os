import mongoose from "mongoose";

/**
 * Blind AI screening of one application against its job (modules/screening).
 * One document per application; re-screening overwrites it. Visible only to
 * recruiters who can manage the job (utils/jobAccess.js).
 */
const applicantScreeningSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "no_resume"],
      default: "queued",
    },
    pipelineVersion: String,
    resumeHash: String,
    // How much identity information was removed before the LLM saw it
    redactions: mongoose.Schema.Types.Mixed,

    profile: mongoose.Schema.Types.Mixed,
    signals: mongoose.Schema.Types.Mixed,
    job: mongoose.Schema.Types.Mixed,
    matches: [mongoose.Schema.Types.Mixed],
    score: mongoose.Schema.Types.Mixed,
    summary: mongoose.Schema.Types.Mixed,
    flags: [mongoose.Schema.Types.Mixed],
    grounding: mongoose.Schema.Types.Mixed,
    models: mongoose.Schema.Types.Mixed,
    degraded: Boolean,

    error: { code: String, message: String },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: Date,
  },
  { timestamps: true },
);

applicantScreeningSchema.index({ jobId: 1, "score.overall": -1 });

export const ApplicantScreening = mongoose.model(
  "ApplicantScreening",
  applicantScreeningSchema,
);
