import os from "os";
import crypto from "crypto";
import { BackgroundJob } from "../../models/backgroundJob.model.js";
import { WorkerHeartbeat } from "../../models/workerHeartbeat.model.js";

const DUPLICATE_KEY = 11000;

/**
 * MongoDB-backed job queue. No extra infrastructure: jobs live in the
 * `background_jobs` collection and workers claim them with an atomic
 * findOneAndUpdate, so several worker processes can share one queue.
 *
 * Semantics: at-least-once. A job whose worker dies is re-claimed after
 * lockTimeoutMs, so handlers must be idempotent.
 */
export const createQueue = ({
  model = BackgroundJob,
  heartbeatModel = WorkerHeartbeat,
  heartbeatIntervalMs = 30_000,
  workerId = `${os.hostname()}:${process.pid}:${crypto.randomUUID().slice(0, 8)}`,
  logger = null,
  now = () => new Date(),
  pollIntervalMs = 1000,
  lockTimeoutMs = 5 * 60 * 1000,
  backoffBaseMs = 5000,
  backoffMaxMs = 10 * 60 * 1000,
} = {}) => {
  const handlers = new Map(); // name -> { fn, concurrency, running }
  const inFlight = new Set();
  let timer = null;
  let heartbeatTimer = null;
  let running = false;

  const beat = () =>
    heartbeatModel
      .updateOne(
        { workerId },
        { $set: { handlers: [...handlers.keys()], seenAt: now() } },
        { upsert: true },
      )
      .catch((error) =>
        logger?.warn("Queue heartbeat failed", { error: error.message }),
      );

  /**
   * Register a handler. It receives (data, ctx) where ctx has
   * { job, attempt, setProgress(progress) } and its return value is stored
   * as the job result. Throwing schedules a retry with exponential backoff.
   */
  const register = (name, fn, { concurrency = 1 } = {}) => {
    handlers.set(name, { fn, concurrency, running: 0 });
  };

  /**
   * Add a job. With a dedupeKey, returns the existing queued/running job
   * instead of creating a duplicate.
   */
  const enqueue = async (
    name,
    data = {},
    { delayMs = 0, maxAttempts = 3, priority = 0, dedupeKey } = {},
  ) => {
    try {
      return await model.create({
        name,
        data,
        priority,
        maxAttempts,
        runAt: new Date(now().getTime() + delayMs),
        ...(dedupeKey && { dedupeKey }),
      });
    } catch (error) {
      if (error?.code === DUPLICATE_KEY && dedupeKey) {
        const existing = await model.findOne({
          dedupeKey,
          status: { $in: ["queued", "running"] },
        });
        if (existing) return existing;
      }
      throw error;
    }
  };

  const get = (id) => model.findById(id).lean();

  const claim = async () => {
    const names = [...handlers.entries()]
      .filter(([, h]) => h.running < h.concurrency)
      .map(([name]) => name);
    if (names.length === 0) return null;

    const current = now();
    return model.findOneAndUpdate(
      {
        name: { $in: names },
        $or: [
          { status: "queued", runAt: { $lte: current } },
          // Stalled: the worker holding it stopped heartbeating
          {
            status: "running",
            lockedAt: { $lte: new Date(current.getTime() - lockTimeoutMs) },
          },
        ],
      },
      {
        $set: {
          status: "running",
          lockedAt: current,
          lockedBy: workerId,
          startedAt: current,
        },
        $inc: { attempts: 1 },
      },
      { sort: { priority: -1, runAt: 1 }, new: true },
    );
  };

  const backoffFor = (attempt) =>
    Math.min(backoffBaseMs * 2 ** (attempt - 1), backoffMaxMs);

  const execute = async (job) => {
    const handler = handlers.get(job.name);
    handler.running++;
    const owned = { _id: job._id, lockedBy: workerId };
    const log = logger?.child?.({ jobId: String(job._id), job: job.name });

    try {
      if (job.attempts > job.maxAttempts) {
        throw Object.assign(new Error("Exceeded max attempts after stall"), {
          permanent: true,
        });
      }

      const result = await handler.fn(job.data, {
        job,
        attempt: job.attempts,
        // Also refreshes the lock so long jobs aren't treated as stalled
        setProgress: (progress) =>
          model.updateOne(owned, { $set: { progress, lockedAt: now() } }),
      });

      await model.updateOne(owned, {
        $set: {
          status: "succeeded",
          result: result ?? null,
          finishedAt: now(),
          lastError: null,
        },
        $unset: { lockedAt: 1, lockedBy: 1, dedupeKey: 1 },
      });
      log?.info("Job succeeded", { attempt: job.attempts });
    } catch (error) {
      const message = String(error?.message || error).slice(0, 1000);
      const final = error?.permanent || job.attempts >= job.maxAttempts;
      if (final) {
        await model.updateOne(owned, {
          $set: { status: "failed", lastError: message, finishedAt: now() },
          $unset: { lockedAt: 1, lockedBy: 1, dedupeKey: 1 },
        });
        log?.error("Job failed permanently", error);
      } else {
        await model.updateOne(owned, {
          $set: {
            status: "queued",
            lastError: message,
            runAt: new Date(now().getTime() + backoffFor(job.attempts)),
          },
          $unset: { lockedAt: 1, lockedBy: 1 },
        });
        log?.warn("Job failed, will retry", {
          attempt: job.attempts,
          error: message,
        });
      }
    } finally {
      handler.running--;
    }
  };

  /** Claim and start as many jobs as capacity allows. Returns count started. */
  const tick = async () => {
    let started = 0;
    for (;;) {
      const job = await claim();
      if (!job) break;
      const promise = execute(job).finally(() => inFlight.delete(promise));
      inFlight.add(promise);
      started++;
    }
    return started;
  };

  const loop = async () => {
    if (!running) return;
    try {
      await tick();
    } catch (error) {
      logger?.error("Queue poll failed", error);
    }
    if (running) timer = setTimeout(loop, pollIntervalMs);
  };

  const start = () => {
    if (running) return;
    running = true;
    logger?.info("Queue worker started", {
      workerId,
      handlers: [...handlers.keys()],
    });
    beat();
    heartbeatTimer = setInterval(beat, heartbeatIntervalMs);
    heartbeatTimer.unref?.();
    loop();
  };

  /** Stop polling and wait (up to timeoutMs) for in-flight jobs. */
  const stop = async ({ timeoutMs = 10_000 } = {}) => {
    running = false;
    clearTimeout(timer);
    clearInterval(heartbeatTimer);
    await heartbeatModel.deleteOne({ workerId }).catch(() => {});
    await Promise.race([
      Promise.allSettled([...inFlight]),
      new Promise((resolve) => setTimeout(resolve, timeoutMs).unref?.()),
    ]);
  };

  /** Process until nothing is runnable now (for tests and scripts). */
  const drain = async () => {
    for (;;) {
      const started = await tick();
      if (started === 0 && inFlight.size === 0) return;
      await Promise.allSettled([...inFlight]);
    }
  };

  /**
   * True if some worker (in any process) handling `name` has heartbeated
   * recently — i.e. an enqueued job will actually be processed.
   */
  const hasActiveWorker = async (name, { withinMs = 90_000 } = {}) => {
    const recent = await heartbeatModel.exists({
      handlers: name,
      seenAt: { $gte: new Date(now().getTime() - withinMs) },
    });
    return Boolean(recent);
  };

  return {
    register,
    enqueue,
    get,
    start,
    stop,
    tick,
    drain,
    hasActiveWorker,
    workerId,
  };
};
