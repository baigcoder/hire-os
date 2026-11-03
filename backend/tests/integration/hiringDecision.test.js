import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { InterviewScorecard } from "../../models/interviewScorecard.model.js";
import { Notification } from "../../models/notification.model.js";

let phone = 9920000000;
const createUser = (fields) =>
  User.create({ phoneNumber: String(phone++), password: "test-password", fullname: fields.role, ...fields });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("one owner queue, one decision", () => {
  let owner, recruiter, direct, interviewed, interview, company;

  beforeEach(async () => {
    owner = await createUser({ email: "ceo@acme.test", role: "company_admin" });
    company = await Company.create({
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: owner._id,
    });
    await User.updateOne({ _id: owner._id }, { companyId: company._id });
    recruiter = await createUser({ email: "r@acme.test", role: "recruiter", companyId: company._id });
    const job = await Job.create({
      title: "Backend Engineer",
      description: "Build APIs with Node.js and PostgreSQL for our platform.",
      requirements: ["Node.js"],
      salary: 1000,
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: 2,
      position: 1,
      company: company._id,
      created_by: recruiter._id,
    });
    const a = await createUser({ email: "a@test.com", role: "student", fullname: "Ada Direct" });
    const b = await createUser({ email: "b@test.com", role: "student", fullname: "Ben Interviewed" });
    direct = await Application.create({ job: job._id, applicant: a._id, status: "shortlisted" });
    interviewed = await Application.create({ job: job._id, applicant: b._id, status: "pending_ceo_approval" });
    interview = await Interview.create({
      applicationId: interviewed._id,
      jobId: job._id,
      companyId: company._id,
      studentId: b._id,
      recruiterId: recruiter._id,
      scheduledAt: new Date(),
      status: "pending_ceo_approval",
      finalReport: {
        status: "submitted",
        generatedAt: new Date(),
        overallScore: 83,
        aiRecommendation: "RECOMMEND",
        structured: { recommendation: "RECOMMEND", overallScore: 83 },
      },
    });
  });

  const queue = () => request(app).get("/api/v1/interview/ceo/pending-reports").set(auth(owner));

  it("shows both paths in one queue, on either endpoint", async () => {
    const passed = await request(app)
      .post(`/api/v1/application/${direct._id}/pass-to-ceo`)
      .set(auth(recruiter))
      .send({ notes: "Strong referral" });
    expect(passed.status).toBe(200);
    // Its notification used to fail validation half-way through
    expect(await Notification.countDocuments({ userId: owner._id, type: "interview_report_submitted" })).toBe(1);

    const { body } = await queue();
    expect(body.count).toBe(2);
    const bySource = Object.fromEntries(body.reports.map((r) => [r.source, r]));
    expect(bySource.passed_directly).toMatchObject({ applicationId: String(direct._id), interviewId: null, report: null, recruiterNotes: "Strong referral" });
    expect(bySource.interview_report).toMatchObject({ interviewId: String(interview._id), report: { overallScore: 83 } });

    const other = await request(app).get("/api/v1/company/pending-approvals").set(auth(owner));
    expect(other.body.pendingApprovals.map((r) => r.applicationId).sort()).toEqual(body.reports.map((r) => r.applicationId).sort());
  });

  it("decides a report-backed candidate the same way from either endpoint", async () => {
    const res = await request(app)
      .post(`/api/v1/company/candidates/${interviewed._id}/approve`)
      .set(auth(owner))
      .send({ decision: "approved", notes: "Go" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: "interview_report", applicationStatus: "offer_pending" });
    // The report no longer gets stuck in the queue
    const saved = await Interview.findById(interview._id).lean();
    expect(saved.finalReport).toMatchObject({ status: "approved", adminDecision: { decision: "approved" } });
    expect(saved.status).toBe("approved");
    expect((await queue()).body.count).toBe(0);
    expect(await Notification.countDocuments({ userId: recruiter._id, type: "prepare_offer" })).toBe(1);
  });

  it("hires a directly passed candidate on approval, without a crash", async () => {
    await request(app).post(`/api/v1/application/${direct._id}/pass-to-ceo`).set(auth(recruiter)).send({});
    const res = await request(app).post(`/api/v1/company/candidates/${direct._id}/approve`).set(auth(owner)).send({ decision: "approved" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: "passed_directly", applicationStatus: "hired" });
    expect((await Company.findById(company._id)).usage.hiresThisMonth).toBe(1);
    expect(await Notification.countDocuments({ type: "application_status_update" })).toBe(1);
  });

  it("keeps on-hold candidates in the queue and doesn't tell the candidate", async () => {
    await request(app).post(`/api/v1/company/candidates/${interviewed._id}/approve`).set(auth(owner)).send({ decision: "on_hold" });
    const { body } = await queue();
    expect(body.reports[0]).toMatchObject({ onHold: true, report: { onHold: true } });
    expect(await Notification.countDocuments({ type: { $in: ["application_status_update", "application_rejected"] } })).toBe(0);
  });

  it("sends interviewed candidates through their report, not the shortcut", async () => {
    const other = await Application.create({ job: interviewed.job, applicant: (await createUser({ email: "c@test.com", role: "student" }))._id, status: "shortlisted" });
    const iv = await Interview.create({
      applicationId: other._id,
      jobId: interviewed.job,
      companyId: company._id,
      studentId: other.applicant,
      recruiterId: recruiter._id,
      scheduledAt: new Date(),
    });
    await InterviewScorecard.create({ interviewId: iv._id, status: "ready", competencies: [] });
    const res = await request(app).post(`/api/v1/application/${other._id}/pass-to-ceo`).set(auth(recruiter)).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("USE_INTERVIEW_REPORT");
    expect((await Application.findById(other._id)).status).toBe("shortlisted");
  });

  it("refuses non-owners, other companies and candidates not awaiting a decision", async () => {
    expect((await request(app).post(`/api/v1/company/candidates/${interviewed._id}/approve`).set(auth(recruiter)).send({ decision: "approved" })).status).toBe(403);
    const stranger = await createUser({ email: "x@other.test", role: "company_admin" });
    await Company.create({ name: "Other", email: "hr@other.test", description: "Another company that hires people too.", website: "https://other.test", location: "Remote", adminUser: stranger._id });
    expect((await request(app).post(`/api/v1/company/candidates/${interviewed._id}/approve`).set(auth(stranger)).send({ decision: "approved" })).status).toBe(404);
    expect((await request(app).post(`/api/v1/company/candidates/${direct._id}/approve`).set(auth(owner)).send({ decision: "approved" })).status).toBe(409);
    expect((await request(app).post(`/api/v1/company/candidates/${interviewed._id}/approve`).set(auth(owner)).send({ decision: "maybe" })).status).toBe(400);
  });
});
