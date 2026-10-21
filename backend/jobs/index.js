/**
 * Background job registry. Each feature module registers its handlers here.
 *
 * Handlers must be idempotent: the queue is at-least-once, and a job whose
 * worker dies is retried. Long handlers should call ctx.setProgress() at
 * least every few minutes so the job isn't treated as stalled.
 */
import ai from "../platform/ai-gateway/index.js";
import {
  RESUME_ANALYZE_JOB,
  createResumeAnalyzeHandler,
} from "./resumeAnalyze.js";
import {
  APPLICANT_SCREEN_JOB,
  createApplicantScreenHandler,
} from "./applicantScreen.js";
import {
  INTEGRITY_REPORT_JOB,
  INTEGRITY_EVIDENCE_PURGE_JOB,
  createIntegrityReportHandler,
  createEvidencePurgeHandler,
} from "./integrity.js";
import {
  EMBED_JOB,
  createEmbedJobHandler,
} from "../modules/discover/indexing.js";

export const registerJobs = (queue) => {
  // Two at a time: each analysis makes ~4 LLM calls against Groq's free limits
  queue.register(RESUME_ANALYZE_JOB, createResumeAnalyzeHandler({ ai }), {
    concurrency: 2,
  });
  // One at a time: bulk screening a job's applicants shouldn't starve
  // candidates' own analyses of the shared Groq budget
  queue.register(APPLICANT_SCREEN_JOB, createApplicantScreenHandler({ ai }), {
    concurrency: 1,
  });
  // Semantic search: (re)embed a job posting after create/update
  queue.register(EMBED_JOB, createEmbedJobHandler(), { concurrency: 2 });
  // Live-interview integrity: one report per ended call, and evidence
  // frames deleted when their 30-day retention ends
  queue.register(INTEGRITY_REPORT_JOB, createIntegrityReportHandler({ ai }), {
    concurrency: 1,
  });
  queue.register(INTEGRITY_EVIDENCE_PURGE_JOB, createEvidencePurgeHandler(), {
    concurrency: 2,
  });
  return queue;
};
