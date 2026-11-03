import mongoose from "mongoose";

/**
 * Output of the resume intelligence pipeline (modules/resume-intel).
 * One document per analysis request; the API streams `stages` while the
 * background job runs. Resume text is stored for re-runs but never returned
 * by default (select: false), and owners can delete their reports.
 */
const stageSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    status: {
      type: String,
      enum: ["pending", "running", "done", "skipped", "failed"],
      default: "pending",
    },
    ms: Number,
  },
  { _id: false },
);

const resumeReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
    },
    pipelineVersion: { type: String, required: true },
    jobQueueId: { type: mongoose.Schema.Types.ObjectId },
    // Identity of (user, resume content, target job, pipeline version)
    dedupeKey: { type: String, index: true },

    input: {
      source: { type: String, enum: ["pdf", "docx", "text"] },
      fileName: String,
      pages: Number,
      chars: Number,
      truncated: Boolean,
      textHash: String,
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
      jobTitle: String,
      minYears: Number,
      jobDescription: { type: String, select: false },
    },
    resumeText: { type: String, select: false },

    stages: [stageSchema],
    warnings: [String],
    flags: [mongoose.Schema.Types.Mixed],

    profile: mongoose.Schema.Types.Mixed,
    signals: mongoose.Schema.Types.Mixed,
    job: mongoose.Schema.Types.Mixed,
    matches: [mongoose.Schema.Types.Mixed],
    score: mongoose.Schema.Types.Mixed,
    critique: mongoose.Schema.Types.Mixed,
    grounding: mongoose.Schema.Types.Mixed,
    models: mongoose.Schema.Types.Mixed,
    degraded: Boolean,

    error: { code: String, message: String },
    completedAt: Date,
  },
  { timestamps: true },
);

resumeReportSchema.index({ userId: 1, createdAt: -1 });

export const ResumeReport = mongoose.model("ResumeReport", resumeReportSchema);
