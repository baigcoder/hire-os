/**
 * One overview per role, computed on the server from the rows themselves,
 * so every figure on a dashboard agrees with every other (the old screens
 * stitched five endpoints together in the browser and their counts drifted).
 *
 *   owner      Who is waiting on my decision, and how is hiring moving?
 *   recruiter  What needs me today: interviews, reports to send, new applicants
 *   candidate  Where do my applications stand, and what happens next?
 */
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { Job } from "../../models/job.model.js";
import { Company, SUBSCRIPTION_PLANS } from "../../models/company.model.js";
import { User } from "../../models/user.model.js";

/** Application status → the stage a person would name. Order is the funnel. */
export const STAGES = [
  ["new", "New", ["pending", "under_review"]],
  ["shortlisted", "Shortlisted", ["shortlisted"]],
  ["interviewing", "Interviewing", ["interview", "mcq_pending", "mcq_passed", "video_scheduled", "video_completed"]],
  ["decision", "Awaiting owner", ["pending_ceo_approval"]],
  ["offer", "Offer", ["offer_pending", "offer_sent"]],
  ["hired", "Hired", ["hired", "offer_accepted"]],
  ["closed", "Closed", ["rejected", "mcq_failed", "offer_rejected", "withdrawn"]],
];
const STAGE_OF = new Map(STAGES.flatMap(([key, , statuses]) => statuses.map((s) => [s, key])));
export const stageOf = (status) => STAGE_OF.get(status) ?? "new";

const DONE_INTERVIEW = ["completed", "pending_ceo_approval", "approved", "rejected", "cancelled", "no_show", "mcq_failed"];
const SENT_REPORT = ["submitted", "approved", "rejected"];
const DAY = 24 * 3600 * 1000;

/** Counts per stage, every stage present (zeros included), plus the total. */
export const pipelineOf = (applications) => {
  const counts = Object.fromEntries(STAGES.map(([key]) => [key, 0]));
  for (const a of applications) counts[stageOf(a.status)] += 1;
  return {
    stages: STAGES.map(([key, label]) => ({ key, label, count: counts[key] })),
    total: applications.length,
  };
};

const startOfMonth = (now) => new Date(now.getFullYear(), now.getMonth(), 1);
const limit = (n) => (n === -1 ? null : n); // -1 means unlimited

const interviewRow = (i) => ({
  id: String(i._id),
  candidate: i.studentId?.fullname ?? "Candidate",
  job: i.jobId?.title ?? "—",
  scheduledAt: i.scheduledAt,
  status: i.status,
  live: i.videoInterview?.status === "in_progress" || i.videoInterview?.status === "waiting",
});

/** Company owner. */
export const ownerOverview = async (userId, now = new Date()) => {
  const company = await Company.findOne({ adminUser: userId }).lean();
  if (!company) return { company: null };

  const jobs = await Job.find({ company: company._id }).select("title location createdAt isActive deadline").lean();
  const active = jobs.filter((j) => j.isActive !== false);
  const apps = await Application.find({ job: { $in: jobs.map((j) => j._id) } })
    .select("job status updatedAt")
    .lean();
  const activeIds = new Set(active.map((j) => String(j._id)));
  const onActive = apps.filter((a) => activeIds.has(String(a.job)));

  const byJob = new Map();
  for (const a of onActive) {
    const row = byJob.get(String(a.job)) ?? { applicants: 0, interviewing: 0, decision: 0, hired: 0 };
    row.applicants += 1;
    const stage = stageOf(a.status);
    if (stage in row) row[stage] += 1;
    byJob.set(String(a.job), row);
  }
  const openJobs = active
    .map((j) => ({
      id: String(j._id),
      title: j.title,
      location: j.location,
      postedAt: j.createdAt,
      daysOpen: Math.max(0, Math.floor((now - new Date(j.createdAt)) / DAY)),
      ...(byJob.get(String(j._id)) ?? { applicants: 0, interviewing: 0, decision: 0, hired: 0 }),
    }))
    .sort((a, b) => b.applicants - a.applicants || a.daysOpen - b.daysOpen);

  const monthStart = startOfMonth(now);
  const hiredThisMonth = apps.filter((a) => stageOf(a.status) === "hired" && new Date(a.updatedAt) >= monthStart).length;
  const plan = company.subscription?.plan ?? "basic";
  const features = company.features ?? SUBSCRIPTION_PLANS[plan]?.features ?? {};

  return {
    company: {
      id: String(company._id),
      name: company.name,
      plan: SUBSCRIPTION_PLANS[plan]?.name ?? plan,
      subscriptionStatus: company.subscription?.status ?? null,
      renewsOn: company.subscription?.endDate ?? null,
    },
    usage: {
      activeJobs: active.length,
      maxJobs: limit(features.maxJobPostings ?? null),
      recruiters: (company.recruiters ?? []).filter((r) => r.status === "active").length,
      maxRecruiters: limit(features.maxRecruiters ?? null),
    },
    awaitingDecision: apps.filter((a) => a.status === "pending_ceo_approval").length,
    hiredThisMonth,
    pipeline: pipelineOf(onActive),
    openJobs: { rows: openJobs.slice(0, 6), total: openJobs.length },
  };
};

/** Recruiter: their own interviews, and the company's applicants. */
export const recruiterOverview = async (userId, now = new Date()) => {
  const me = await User.findById(userId).select("companyId").lean();
  const jobQuery = me?.companyId ? { company: me.companyId } : { created_by: userId };
  const jobs = await Job.find({ ...jobQuery, isActive: { $ne: false } }).select("title").lean();
  const jobIds = jobs.map((j) => j._id);

  const [apps, interviews] = await Promise.all([
    Application.find({ job: { $in: jobIds } })
      .select("job applicant status createdAt")
      .populate("applicant", "fullname")
      .populate("job", "title")
      .sort({ createdAt: 1 })
      .lean(),
    Interview.find({ recruiterId: userId })
      .select("studentId jobId scheduledAt status videoInterview.status finalReport.status")
      .populate("studentId", "fullname")
      .populate("jobId", "title")
      .sort({ scheduledAt: 1 })
      .lean(),
  ]);

  // Started up to two hours ago still counts as today's interview
  const upcoming = interviews.filter((i) => !DONE_INTERVIEW.includes(i.status) && i.videoInterview?.status !== "completed" && new Date(i.scheduledAt) >= new Date(now - 2 * 3600 * 1000));
  const reportsToSend = interviews
    .filter((i) => i.videoInterview?.status === "completed" && !SENT_REPORT.includes(i.finalReport?.status))
    .map((i) => ({ ...interviewRow(i), reportStatus: i.finalReport?.status ?? "pending" }));
  const toReview = apps
    .filter((a) => stageOf(a.status) === "new")
    .map((a) => ({
      id: String(a._id),
      candidate: a.applicant?.fullname ?? "Candidate",
      job: a.job?.title ?? "—",
      jobId: a.job?._id ? String(a.job._id) : null,
      appliedAt: a.createdAt,
      waitingDays: Math.max(0, Math.floor((now - new Date(a.createdAt)) / DAY)),
    }));
  const isToday = (d) => new Date(d).toDateString() === now.toDateString();

  return {
    interviewsToday: upcoming.filter((i) => isToday(i.scheduledAt)).length,
    upcoming: { rows: upcoming.slice(0, 6).map(interviewRow), total: upcoming.length },
    reportsToSend: { rows: reportsToSend.slice(0, 6), total: reportsToSend.length },
    toReview: { rows: toReview.slice(0, 6), total: toReview.length },
    pipeline: pipelineOf(apps),
    activeJobs: jobs.length,
  };
};

const NEXT_STEP = {
  new: "Waiting for the recruiter to review",
  shortlisted: "Shortlisted: an interview may follow",
  interviewing: "Interview stage",
  decision: "Final decision pending",
  offer: "Offer on its way",
  hired: "Hired",
  closed: "Closed",
};

/** Candidate. */
export const candidateOverview = async (userId, now = new Date()) => {
  const [user, apps, interviews] = await Promise.all([
    User.findById(userId).select("trialEndDate trialExpired subscriptionStatus").lean(),
    Application.find({ applicant: userId })
      .select("job status createdAt updatedAt")
      .populate({ path: "job", select: "title company location", populate: { path: "company", select: "name" } })
      .sort({ updatedAt: -1 })
      .lean(),
    Interview.find({ studentId: userId })
      .select("jobId scheduledAt status videoInterview.status")
      .populate("jobId", "title")
      .sort({ scheduledAt: 1 })
      .lean(),
  ]);

  const upcoming = interviews.filter((i) => !DONE_INTERVIEW.includes(i.status) && i.videoInterview?.status !== "completed" && new Date(i.scheduledAt) >= new Date(now - 2 * 3600 * 1000));
  const trialEnds = user?.trialEndDate ? new Date(user.trialEndDate) : null;

  return {
    applications: {
      rows: apps.slice(0, 8).map((a) => {
        const stage = stageOf(a.status);
        return {
          id: String(a._id),
          job: a.job?.title ?? "A removed job",
          company: a.job?.company?.name ?? "—",
          location: a.job?.location ?? null,
          appliedAt: a.createdAt,
          updatedAt: a.updatedAt,
          stage,
          nextStep: NEXT_STEP[stage],
        };
      }),
      total: apps.length,
    },
    pipeline: pipelineOf(apps),
    upcoming: {
      rows: upcoming.slice(0, 4).map((i) => ({ id: String(i._id), job: i.jobId?.title ?? "—", scheduledAt: i.scheduledAt, status: i.status })),
      total: upcoming.length,
    },
    trial: trialEnds
      ? {
          endsAt: trialEnds,
          daysLeft: Math.max(0, Math.ceil((trialEnds - now) / DAY)),
          expired: Boolean(user.trialExpired) || trialEnds < now,
        }
      : null,
  };
};

export const overviewFor = (user, now) =>
  user.role === "company_admin" ? ownerOverview(user._id, now) : user.role === "recruiter" ? recruiterOverview(user._id, now) : candidateOverview(user._id, now);

/**
 * Every job of the user's company, open and closed, with its applicants
 * counted per stage. Owners and recruiters see the same numbers.
 */
export const jobsOverview = async (user, now = new Date()) => {
  const companyId = user.role === "company_admin" ? (await Company.findOne({ adminUser: user._id }).select("_id").lean())?._id : user.companyId;
  const jobQuery = companyId ? { company: companyId } : { created_by: user._id };
  const jobs = await Job.find(jobQuery).select("title location jobType createdAt isActive deadline created_by").populate("created_by", "fullname").sort({ createdAt: -1 }).lean();
  const apps = await Application.find({ job: { $in: jobs.map((j) => j._id) } }).select("job status").lean();
  const counts = new Map();
  for (const a of apps) {
    const c = counts.get(String(a.job)) ?? Object.fromEntries(STAGES.map(([key]) => [key, 0]));
    c[stageOf(a.status)] += 1;
    counts.set(String(a.job), c);
  }
  return {
    jobs: jobs.map((j) => {
      const c = counts.get(String(j._id)) ?? Object.fromEntries(STAGES.map(([key]) => [key, 0]));
      return {
        id: String(j._id),
        title: j.title,
        location: j.location,
        jobType: j.jobType,
        open: j.isActive !== false,
        postedAt: j.createdAt,
        daysOpen: Math.max(0, Math.floor((now - new Date(j.createdAt)) / DAY)),
        deadline: j.deadline ?? null,
        postedBy: j.created_by?.fullname ?? null,
        applicants: Object.values(c).reduce((n, v) => n + v, 0),
        stages: c,
      };
    }),
  };
};
