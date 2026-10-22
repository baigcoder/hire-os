import mongoose from "mongoose";

/**
 * A unit of background work for platform/queue. Finished jobs expire after
 * 7 days; queued/running jobs never expire.
 */
const backgroundJobSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["queued", "running", "succeeded", "failed"],
      default: "queued",
    },
    priority: { type: Number, default: 0 },
    runAt: { type: Date, default: Date.now },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    // Only one queued/running job may hold a given dedupeKey
    dedupeKey: String,
    lockedAt: Date,
    lockedBy: String,
    startedAt: Date,
    finishedAt: Date,
    progress: { type: mongoose.Schema.Types.Mixed },
    result: { type: mongoose.Schema.Types.Mixed },
    lastError: String,
  },
  { timestamps: true, collection: "background_jobs" },
);

backgroundJobSchema.index({ status: 1, name: 1, priority: -1, runAt: 1 });
backgroundJobSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      dedupeKey: { $exists: true },
      status: { $in: ["queued", "running"] },
    },
  },
);
backgroundJobSchema.index(
  { finishedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 3600 },
);

export const BackgroundJob = mongoose.model(
  "BackgroundJob",
  backgroundJobSchema,
);
