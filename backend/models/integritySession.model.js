import mongoose from "mongoose";

/**
 * One live-interview integrity session per interview: consent, detector
 * health, the decayed risk score, cumulative per-signal totals, tamper
 * flags, recruiter annotations and the post-interview report. Raw events
 * live in IntegrityEvent (90-day TTL); evidence frames in IntegrityEvidence.
 */
const tamperFlagSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    source: { type: String, enum: ["candidate", "recruiter", "server"] },
    firstAt: Date,
    lastAt: Date,
    count: { type: Number, default: 1 },
    detail: String,
  },
  { _id: false },
);

const integritySessionSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true, unique: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    status: {
      type: String,
      enum: ["awaiting_consent", "declined", "active", "ended"],
      default: "awaiting_consent",
    },
    consent: {
      givenAt: Date,
      declinedAt: Date,
      policyVersion: String,
      userAgent: String,
    },
    // Signs candidate batches; never returned except once, at consent
    ingestKey: { type: String, select: false },
    device: {
      cameraLabel: String,
      extendedDisplay: Boolean,
      screenShareSurface: String,
    },
    heartbeat: {
      lastSeq: { type: Number, default: 0 },
      firstAt: Date,
      lastAt: Date,
      batches: { type: Number, default: 0 },
      gapCount: { type: Number, default: 0 },
      gapMs: { type: Number, default: 0 },
      modelLoaded: Boolean,
      fps: Number,
      lastFrameHash: String,
      frozenStreak: { type: Number, default: 0 },
    },
    // Recruiter-side detector health
    verifier: {
      firstAt: Date,
      lastAt: Date,
      batches: { type: Number, default: 0 },
    },
    // Last counted time per "source:type" (debounce state)
    lastCounted: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Recent counted occurrences for the decayed score (capped)
    scored: [
      {
        _id: false,
        at: Date,
        points: Number,
        type: { type: String },
        source: String,
      },
    ],
    risk: {
      score: { type: Number, default: 0 },
      band: { type: String, default: "low" },
      peak: { type: Number, default: 0 },
      peakAt: Date,
      updatedAt: Date,
    },
    // { [signalType]: { occurrences, counted, totalMs, points, maxConfidence, lastAt, bySource: {candidate, recruiter} } }
    aggregates: { type: mongoose.Schema.Types.Mixed, default: {} },
    tamperFlags: [tamperFlagSchema],
    mismatches: { type: Number, default: 0 },
    expectedSignals: [String],
    annotations: [
      {
        _id: false,
        signal: String,
        note: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: Date,
      },
    ],
    evidenceCount: { type: Number, default: 0 },
    report: {
      status: { type: String, enum: ["none", "queued", "ready", "failed"], default: "none" },
      requestedAt: Date,
      generatedAt: Date,
      model: String,
      degraded: Boolean,
      data: mongoose.Schema.Types.Mixed,
      error: String,
    },
    disputes: [{ _id: false, text: String, at: Date }],
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true, minimize: false },
);

export const IntegritySession = mongoose.model("IntegritySession", integritySessionSchema);
