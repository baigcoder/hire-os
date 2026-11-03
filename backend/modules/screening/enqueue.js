import { ApplicantScreening } from "../../models/applicantScreening.model.js";
import queue from "../../platform/queue/index.js";
import logger from "../../utils/logger.js";

export const APPLICANT_SCREEN_JOB = "applicant.screen";

/**
 * Queue a blind screening for one application. Safe to call repeatedly:
 * the queue dedupes active jobs per application, and a completed screening
 * is only redone with { force: true }.
 *
 * @returns {Promise<"queued"|"skipped">}
 */
export const enqueueScreening = async (
  application,
  { force = false, requestedBy = null } = {},
) => {
  const existing = await ApplicantScreening.findOne({
    applicationId: application._id,
  })
    .select("status")
    .lean();
  if (existing && !force && existing.status !== "failed") return "skipped";

  await ApplicantScreening.updateOne(
    { applicationId: application._id },
    {
      $set: {
        jobId: application.job,
        applicantId: application.applicant,
        status: "queued",
        error: null,
        requestedBy,
      },
    },
    { upsert: true },
  );
  await queue.enqueue(
    APPLICANT_SCREEN_JOB,
    { applicationId: String(application._id) },
    // Below candidates' own analyses (priority 0) in the shared queue
    { dedupeKey: `screen:${application._id}`, maxAttempts: 2, priority: -1 },
  );
  return "queued";
};

/** Fire-and-forget variant for request paths that must not fail on it. */
export const enqueueScreeningSafely = (application, options) =>
  enqueueScreening(application, options).catch((error) =>
    logger.warn("Could not queue applicant screening", {
      applicationId: String(application._id),
      error: error.message,
    }),
  );
