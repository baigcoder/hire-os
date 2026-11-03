import mongoose from "mongoose";

/**
 * Liveness record for queue workers, refreshed every 30s. Lets the API tell
 * whether anything will actually process a job before it enqueues one.
 */
const workerHeartbeatSchema = new mongoose.Schema(
  {
    workerId: { type: String, required: true, unique: true },
    handlers: [String],
    seenAt: { type: Date, required: true },
  },
  { versionKey: false, collection: "worker_heartbeats" },
);

workerHeartbeatSchema.index({ seenAt: 1 }, { expireAfterSeconds: 24 * 3600 });

export const WorkerHeartbeat = mongoose.model(
  "WorkerHeartbeat",
  workerHeartbeatSchema,
);
