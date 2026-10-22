/**
 * The company owner's ("CEO") final hiring decision — one queue, one
 * decision, whichever way a candidate reached it:
 *
 *   interview report   recruiter generated the evidence-based report and
 *                      sent it (interview.finalReport.status "submitted")
 *   passed directly    recruiter used "Pass to CEO" on an application that
 *                      had no structured interview (recruiterReview only)
 *
 * Both put the application in "pending_ceo_approval". Before this module the
 * two paths had separate screens and endpoints that disagreed: approving a
 * passed application marked it hired while its interview report stayed
 * stuck in the queue, and the passed path's notifications failed
 * validation half-way through.
 */
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { InterviewScorecard } from "../../models/interviewScorecard.model.js";
import { Company } from "../../models/company.model.js";
import { Job } from "../../models/job.model.js";
import { Notification } from "../../models/notification.model.js";
import logger from "../../utils/logger.js";

export const DECISIONS = ["approved", "rejected", "on_hold"];

export class DecisionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const notify = (payload) =>
  Notification.createNotification(payload).catch((error) =>
    logger.warn("Hiring decision notification failed", { type: payload.type, error: error.message }),
  );

/** The company this user owns, or null. */
export const ownedCompany = (userId) => Company.findOne({ adminUser: userId }).select("_id name adminUser usage").exec();

/**
 * Everything awaiting the owner's decision, newest first. Each item says
 * which path it came through; report-backed items carry the structured
 * report.
 */
export const listPendingDecisions = async (companyId) => {
  const jobIds = (await Job.find({ company: companyId }).select("_id").lean()).map((j) => j._id);
  const applications = await Application.find({ job: { $in: jobIds }, status: "pending_ceo_approval" })
    .populate("job", "title salary jobType location")
    .populate("applicant", "fullname email profile.profilePhoto profile.skills")
    .populate("recruiterReview.reviewedBy", "fullname")
    .sort({ updatedAt: -1 })
    .lean();
  const interviews = await Interview.find({ applicationId: { $in: applications.map((a) => a._id) } })
    .select("applicationId recruiterId finalReport mcqTest.score")
    .populate("recruiterId", "fullname")
    .lean();
  const byApplication = new Map(interviews.map((i) => [String(i.applicationId), i]));

  return applications.map((app) => {
    const interview = byApplication.get(String(app._id));
    const report = interview?.finalReport?.status === "submitted" ? interview.finalReport : null;
    return {
      applicationId: String(app._id),
      interviewId: interview ? String(interview._id) : null,
      source: report ? "interview_report" : "passed_directly",
      candidate: {
        name: app.applicant?.fullname,
        email: app.applicant?.email,
        photo: app.applicant?.profile?.profilePhoto,
        skills: app.applicant?.profile?.skills ?? [],
      },
      job: app.job?.title,
      recruiter: interview?.recruiterId?.fullname ?? app.recruiterReview?.reviewedBy?.fullname ?? null,
      recruiterNotes: app.recruiterReview?.notes || null,
      submittedAt: report?.generatedAt ?? app.recruiterReview?.reviewedAt ?? app.updatedAt,
      onHold: app.ceoReview?.decision === "on_hold",
      report: report
        ? {
            overallScore: report.overallScore,
            recommendation: report.aiRecommendation,
            summary: report.aiSummary,
            strengths: report.strengths,
            concerns: report.weaknesses,
            generatedAt: report.generatedAt,
            structured: report.structured,
            onHold: report.adminDecision?.decision === "on_hold",
          }
        : null,
      scores: { mcq: interview?.mcqTest?.score ?? null },
    };
  });
};

/**
 * Record the owner's decision on one candidate.
 * @param {{ applicationId?: string, interviewId?: string, decision: string, comments?: string, ownerId: string }} input
 */
export const decide = async ({ applicationId, interviewId, decision, comments, ownerId }) => {
  if (!DECISIONS.includes(decision)) {
    throw new DecisionError(400, "BAD_DECISION", "Decision must be approved, rejected or on_hold");
  }
  const company = await ownedCompany(ownerId);
  if (!company) throw new DecisionError(403, "NOT_OWNER", "Only the company's owner can make the final decision");

  let interview = interviewId ? await Interview.findById(interviewId) : null;
  const appId = applicationId ?? interview?.applicationId;
  const application = appId ? await Application.findById(appId).populate("job", "title company").populate("applicant", "fullname") : null;
  if (!application || String(application.job?.company) !== String(company._id)) {
    throw new DecisionError(404, "NOT_FOUND", "Candidate not found");
  }
  interview ??= await Interview.findOne({ applicationId: application._id });
  if (application.status !== "pending_ceo_approval") {
    throw new DecisionError(409, "NOT_AWAITING_DECISION", "This candidate isn't awaiting your decision");
  }

  const note = typeof comments === "string" ? comments.slice(0, 2000) : undefined;
  const now = new Date();
  const viaReport = interview?.finalReport?.status === "submitted";

  application.ceoReview = { decision, notes: note, reviewedBy: ownerId, reviewedAt: now };
  if (viaReport) {
    interview.finalReport.adminDecision = { decision, decidedBy: ownerId, decidedAt: now, comments: note };
    // On hold keeps the report submitted, so it stays in the queue
    interview.finalReport.status = decision === "on_hold" ? "submitted" : decision;
    if (decision !== "on_hold") interview.status = decision;
  }
  if (decision === "approved") {
    // With an interview the offer letter follows; without one there's no
    // offer flow, so the candidate is hired directly (as before)
    application.status = viaReport ? "offer_pending" : "hired";
  } else if (decision === "rejected") {
    application.status = "rejected";
  }
  application.statusHistory?.push({
    status: application.status,
    changedBy: ownerId,
    changedAt: now,
    notes: `Owner decision: ${decision}${note ? `. ${note}` : ""}`,
  });

  await application.save();
  if (interview && viaReport) await interview.save();
  if (decision === "approved" && !viaReport) {
    await Company.updateOne({ _id: company._id }, { $inc: { "usage.hiresThisMonth": 1 } });
  }

  // Tell the recruiter; on approval of an interviewed candidate, prompt the offer
  const recruiterId = interview?.recruiterId ?? application.recruiterReview?.reviewedBy;
  if (recruiterId) {
    notify({
      userId: recruiterId,
      type: decision === "approved" ? "candidate_approved" : "candidate_rejected",
      title: decision === "approved" ? "Candidate approved" : decision === "rejected" ? "Candidate rejected" : "Decision on hold",
      message: `Final decision for ${application.applicant?.fullname} (${application.job?.title}): ${decision.replace("_", " ")}.${note ? ` ${note}` : ""}`,
      relatedEntities: { interviewId: interview?._id, applicationId: application._id },
      priority: "high",
    });
    if (decision === "approved" && viaReport) {
      notify({
        userId: recruiterId,
        type: "prepare_offer",
        title: "Prepare the offer letter",
        message: `${application.applicant?.fullname} was approved. Please prepare the offer letter.`,
        relatedEntities: { interviewId: interview._id },
        actionUrl: `/interview/${interview._id}/offer`,
        priority: "high",
      });
    }
  }
  // The candidate hears about a hire or a rejection, never a hold
  if (decision !== "on_hold") {
    notify({
      userId: application.applicant._id,
      type: decision === "approved" ? "application_status_update" : "application_rejected",
      title: decision === "approved" ? (viaReport ? "Good news on your application" : "You're hired!") : "Application update",
      message:
        decision === "approved"
          ? viaReport
            ? `${company.name} approved your application for ${application.job.title}. An offer is on its way.`
            : `${company.name} approved your application for ${application.job.title}. You'll receive further details soon.`
          : `Your application for ${application.job.title} at ${company.name} has been reviewed.`,
      relatedEntities: { applicationId: application._id },
    });
  }

  return {
    decision,
    source: viaReport ? "interview_report" : "passed_directly",
    applicationStatus: application.status,
    interviewId: interview ? String(interview._id) : null,
  };
};

/**
 * "Pass to CEO" is for candidates without a structured interview. Once an
 * interview has a scorecard, the evidence-based report is the way to the
 * owner (with its completeness checks), not a shortcut around it.
 */
export const assertCanPassDirectly = async (applicationId) => {
  const interview = await Interview.findOne({ applicationId }).select("_id").lean();
  if (!interview) return;
  const scorecard = await InterviewScorecard.findOne({ interviewId: interview._id }).select("status").lean();
  if (scorecard) {
    throw new DecisionError(
      409,
      "USE_INTERVIEW_REPORT",
      "This candidate has a structured interview: generate the interview report and send it to the CEO from there",
    );
  }
};
