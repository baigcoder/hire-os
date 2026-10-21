import mongoose from "mongoose";

export const OVERALL_FIT_VALUES = ["Poor", "Fair", "Good", "Excellent"];

// AI engines return a wider vocabulary ("Strong Match", "Needs Improvement",
// "Not Recommended", ...). Map everything onto the stored scale.
export const normalizeOverallFit = (value) => {
  if (value === undefined || value === null) return value;
  const v = String(value).toLowerCase();
  if (v.includes("excellent")) return "Excellent";
  if (v.includes("strong") || v.includes("good")) return "Good";
  if (v.includes("fair") || v.includes("partial")) return "Fair";
  if (
    v.includes("poor") ||
    v.includes("needs improvement") ||
    v.includes("not recommended")
  ) {
    return "Poor";
  }
  return "Fair";
};

const ResumeAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // "application": tied to a job application (visible to that job's recruiter)
    // "practice": the candidate's own analyzer runs, never linked to a job
    type: {
      type: String,
      enum: ["application", "practice"],
      default: "application",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: function () {
        return this.type === "application";
      },
    },
    resumePath: String,
    resumeText: String,
    analysisScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    atsScore: { type: Number, min: 0, max: 100 },
    keySkillsMatch: [String],
    missingSkills: [String],
    experienceMatch: {
      type: Number,
      default: 0,
    },
    educationMatch: {
      type: Number,
      default: 0,
    },
    overallFit: {
      type: String,
      enum: OVERALL_FIT_VALUES,
      default: "Fair",
      set: normalizeOverallFit,
    },
    analysisMethod: String,
    source: String,
    enginesUsed: [String],
    engineResults: [
      {
        _id: false,
        engine: String,
        score: Number,
        success: Boolean,
        latency: Number,
      },
    ],
    confidence: Number,
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
    // Legacy field kept for documents written before analyzedAt existed
    analysisDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

ResumeAnalysisSchema.index({ userId: 1, type: 1, analyzedAt: -1 });
ResumeAnalysisSchema.index({ jobId: 1, userId: 1 });

export const ResumeAnalysis = mongoose.model(
  "ResumeAnalysis",
  ResumeAnalysisSchema,
);
