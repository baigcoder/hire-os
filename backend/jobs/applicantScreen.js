import { Application } from "../models/application.model.js";
import { ApplicantScreening } from "../models/applicantScreening.model.js";
import { runResumePipeline } from "../modules/resume-intel/pipeline.js";
import {
  extractResume,
  ExtractionError,
} from "../modules/resume-intel/extract.js";
import { jobToText } from "../modules/resume-intel/requirements.js";
import { redactForBlindReview } from "../modules/screening/redact.js";
import { summarizeForRecruiter } from "../modules/screening/summary.js";
import {
  fetchResumeFile,
  ResumeSourceError,
} from "../modules/screening/resumeSource.js";
import { AiGatewayError } from "../platform/ai-gateway/gateway.js";
import { resumeObjectPath } from "../utils/resumeFiles.js";

export { APPLICANT_SCREEN_JOB } from "../modules/screening/enqueue.js";

export const SCREENING_VERSION = "screening-1.0";

const recruiterAdviser = {
  stage: "summary",
  run: async (ai, context, items) => {
    const s = await summarizeForRecruiter(ai, context, items);
    return { output: s.summary, grounding: s.grounding, meta: s.meta };
  },
};

const errorFor = (error) => {
  if (error instanceof ResumeSourceError || error instanceof ExtractionError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof AiGatewayError) {
    return {
      code: "AI_UNAVAILABLE",
      message: "The AI service was unavailable.",
    };
  }
  return {
    code: "SCREENING_FAILED",
    message: "Screening failed unexpectedly.",
  };
};

/**
 * Background handler: blind-screen one application against its job.
 * Idempotent — re-running overwrites the screening document.
 *
 * @param {{ ai: {run: Function}, fetchResume?: Function }} deps
 */
export const createApplicantScreenHandler =
  ({ ai, fetchResume = fetchResumeFile }) =>
  async ({ applicationId }, ctx) => {
    const application = await Application.findById(applicationId)
      .populate("job", "title description requirements skills experienceLevel")
      .populate("applicant", "fullname profile.resume profile.resumePath");
    if (!application?.job || !application.applicant) {
      await ApplicantScreening.deleteOne({ applicationId });
      return { skipped: "application, job or applicant no longer exists" };
    }

    // Private-bucket path first; legacy records only have a URL
    const storedPath = resumeObjectPath(application.applicant.profile);
    const resumeRef = storedPath
      ? { path: storedPath }
      : application.resumeUrl || application.applicant.profile?.resume;
    if (!resumeRef) {
      await ApplicantScreening.updateOne(
        { applicationId },
        {
          $set: {
            status: "no_resume",
            error: {
              code: "NO_RESUME",
              message: "The applicant has no resume on file.",
            },
            completedAt: new Date(),
          },
        },
      );
      return { skipped: "no resume" };
    }

    await ApplicantScreening.updateOne(
      { applicationId },
      { $set: { status: "running", error: null } },
    );

    try {
      const file = await fetchResume(resumeRef);
      const extracted = await extractResume(file);
      // Identity details are removed before any model sees the text
      const blind = redactForBlindReview(extracted.text, {
        names: [application.applicant.fullname],
      });

      const job = application.job;
      const result = await runResumePipeline({
        ai,
        text: blind.text,
        textHash: extracted.hash,
        job: {
          text: jobToText(job),
          title: job.title,
          minYears: job.experienceLevel,
        },
        adviser: recruiterAdviser,
        onStage: (stage, status) => ctx.setProgress({ stage, status }),
      });

      await ApplicantScreening.updateOne(
        { applicationId },
        {
          $set: {
            status: "completed",
            pipelineVersion: SCREENING_VERSION,
            resumeHash: extracted.hash,
            redactions: blind.counts,
            profile: result.profile,
            signals: result.signals,
            job: result.job,
            matches: result.matches || [],
            score: result.score,
            summary: result.critique,
            flags: [
              ...extracted.warnings.map((detail) => ({
                type: "warning",
                severity: "low",
                detail,
              })),
              ...result.flags,
            ],
            grounding: result.grounding,
            models: result.models,
            degraded: result.degraded,
            completedAt: new Date(),
          },
        },
      );
      // Feeds the existing "AI Match" column on the applicants page
      await Application.updateOne(
        { _id: applicationId },
        { $set: { resumeScore: result.score.overall } },
      );
      return { score: result.score.overall };
    } catch (error) {
      const permanent =
        error instanceof ResumeSourceError || error instanceof ExtractionError;
      const final = permanent || ctx.attempt >= ctx.job.maxAttempts;
      await ApplicantScreening.updateOne(
        { applicationId },
        {
          $set: { status: final ? "failed" : "queued", error: errorFor(error) },
        },
      );
      // Bad files won't get better on retry
      if (permanent) return { failed: error.code };
      throw error;
    }
  };
