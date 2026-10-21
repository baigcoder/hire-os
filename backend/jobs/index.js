/**
 * Background job registry. Each feature module registers its handlers here,
 * e.g. (Phase 2):
 *
 *   queue.register("resume.analyze", analyzeResumeJob, { concurrency: 2 });
 *
 * Handlers must be idempotent: the queue is at-least-once, and a job whose
 * worker dies is retried. Long handlers should call ctx.setProgress() at
 * least every few minutes so the job isn't treated as stalled.
 */
export const registerJobs = (queue) => {
  // No handlers yet — the resume intelligence pipeline lands in Phase 2.
  return queue;
};
