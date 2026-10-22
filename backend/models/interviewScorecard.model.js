import mongoose from "mongoose";

/**
 * Structured interview scorecard for one interview, built from the job's
 * requirements: competencies with probe questions and a 1–4 rubric, live
 * coverage from the transcript, copilot follow-up suggestions, an AI draft
 * rating per competency (with quoted evidence), and the recruiter's own
 * ratings — which are the only ones that count.
 */
const evidenceSchema = new mongoose.Schema(
  { segmentId: { type: mongoose.Schema.Types.ObjectId, ref: "TranscriptSegment" }, quote: String },
  { _id: false },
);

const competencySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    requirementId: String,
    title: { type: String, required: true },
    description: String,
    kind: { type: String, enum: ["must", "nice"], default: "must" },
    probes: [String],
    rubric: { 1: String, 2: String, 3: String, 4: String },
    coverage: {
      status: { type: String, enum: ["not_covered", "partial", "covered"], default: "not_covered" },
      evidence: [evidenceSchema],
      updatedAt: Date,
    },
    aiDraft: {
      rating: { type: Number, min: 1, max: 4 },
      rationale: String,
      evidence: [evidenceSchema],
    },
    rating: {
      value: { type: Number, min: 1, max: 4 },
      notes: String,
      ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      ratedAt: Date,
    },
  },
  { _id: false },
);

const interviewScorecardSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true, unique: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    status: { type: String, enum: ["generating", "ready", "failed"], default: "generating" },
    source: { type: String, enum: ["model", "rules"] },
    error: String,
    competencies: [competencySchema],
    suggestions: [
      {
        _id: false,
        id: String,
        question: String,
        competencyId: String,
        reason: String,
        createdAt: Date,
      },
    ],
    copilot: {
      lastRunAt: Date,
      lastSegmentAt: Date, // newest transcript text the last run saw
      runs: { type: Number, default: 0 },
      degraded: Boolean,
    },
    draft: {
      status: { type: String, enum: ["none", "queued", "ready", "failed"], default: "none" },
      generatedAt: Date,
      model: String,
      note: String,
    },
    overall: {
      recommendation: { type: String, enum: ["strong_no", "no", "yes", "strong_yes"] },
      notes: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: Date,
    },
  },
  { timestamps: true },
);

export const InterviewScorecard = mongoose.model("InterviewScorecard", interviewScorecardSchema);
