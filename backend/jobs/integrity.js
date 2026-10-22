import { IntegritySession } from "../models/integritySession.model.js";
import { IntegrityEvent } from "../models/integrityEvent.model.js";
import { IntegrityEvidence } from "../models/integrityEvidence.model.js";
import { Notification } from "../models/notification.model.js";
import { generateIntegrityReport } from "../modules/integrity/report.js";
import { publish } from "../modules/integrity/live.js";
import { deletePrivateFile } from "../utils/supabase.js";
import logger from "../utils/logger.js";

export {
  INTEGRITY_REPORT_JOB,
  INTEGRITY_EVIDENCE_PURGE_JOB,
} from "../modules/integrity/service.js";

const MAX_EVENTS_FOR_REPORT = 5000;

/**
 * Background handler: build the post-interview integrity report. Always
 * produces one — report.js falls back to rule-based text without the AI.
 */
export const createIntegrityReportHandler =
  ({ ai }) =>
  async ({ sessionId }) => {
    const session = await IntegritySession.findById(sessionId).lean();
    if (!session) return { skipped: "session no longer exists" };

    const events = await IntegrityEvent.find({ sessionId })
      .sort({ at: 1 })
      .limit(MAX_EVENTS_FOR_REPORT)
      .lean();
    try {
      const report = await generateIntegrityReport(ai, session, events);
      await IntegritySession.updateOne(
        { _id: sessionId },
        {
          $set: {
            "report.status": "ready",
            "report.generatedAt": new Date(),
            "report.model": report.model,
            "report.degraded": report.narrativeSource !== "model",
            "report.data": report,
          },
          $unset: { "report.error": "" },
        },
      );
      if (session.recruiterId) {
        await Notification.createNotification({
          userId: session.recruiterId,
          type: "integrity_report",
          title: "Interview integrity report ready",
          message: `Review priority: ${report.reviewPriority.replace("_", " ")}`,
          relatedEntities: { interviewId: session.interviewId },
          actionUrl: `/interview/${session.interviewId}/integrity`,
        }).catch((error) =>
          logger.warn("Integrity report notification failed", { error: error.message }),
        );
      }
      publish(String(session.interviewId), { kind: "report", status: "ready" });
      return { reviewPriority: report.reviewPriority, source: report.narrativeSource };
    } catch (error) {
      await IntegritySession.updateOne(
        { _id: sessionId },
        { $set: { "report.status": "failed", "report.error": error.message.slice(0, 300) } },
      );
      throw error;
    }
  };

/** Delayed handler: delete an evidence frame once its retention ends. */
export const createEvidencePurgeHandler =
  ({ removeFile = deletePrivateFile } = {}) =>
  async ({ evidenceId }) => {
    const evidence = await IntegrityEvidence.findById(evidenceId).lean();
    if (!evidence) return { skipped: "already removed" };
    await removeFile(evidence.bucket, evidence.path);
    await IntegrityEvidence.deleteOne({ _id: evidenceId });
    return { removed: evidence.path };
  };
