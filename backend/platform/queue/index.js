/**
 * Shared background job queue.
 *
 *   import queue from "../platform/queue/index.js";
 *   const job = await queue.enqueue("resume.analyze", { resumeId }, { dedupeKey });
 *   // later: await queue.get(job._id) -> { status, progress, result, lastError }
 *
 * Handlers are registered in jobs/index.js. Jobs are processed by:
 *   - the API process itself (default on long-running hosts), or
 *   - a dedicated worker: `npm run worker` (set RUN_WORKER=false on the API).
 * Vercel serverless functions never run the worker, so on Vercel jobs wait
 * until a worker process is running somewhere.
 */
import logger from "../../utils/logger.js";
import { createQueue } from "./queue.js";

const queue = createQueue({ logger });

export const shouldRunWorkerInApi = () =>
  !process.env.VERCEL &&
  process.env.NODE_ENV !== "test" &&
  process.env.RUN_WORKER !== "false";

export default queue;
