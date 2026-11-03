/**
 * Standalone background worker: `npm run worker`.
 * Use it when the API runs somewhere that can't keep a worker loop alive
 * (Vercel), or to scale job processing separately (set RUN_WORKER=false on
 * the API process in that case).
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./utils/db.js";
import logger from "./utils/logger.js";
import queue from "./platform/queue/index.js";
import { registerJobs } from "./jobs/index.js";

dotenv.config();

const main = async () => {
  await connectDB();
  registerJobs(queue);
  queue.start();

  const shutdown = async (signal) => {
    logger.info("Worker shutting down", { signal });
    await queue.stop();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

main().catch((error) => {
  logger.error("Worker failed to start", error);
  process.exit(1);
});
