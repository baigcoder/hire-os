import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { pipelineOf, stageOf, STAGES } from "../../modules/overview/overview.js";

let phone = 9930000000;
const createUser = (fields) => User.create({ phoneNumber: String(phone++), password: "test-password", fullname: fields.role, ...fields });
const auth = (user) => ({ Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}` });
const overview = (user) => request(app).get("/api/v1/overview").set(auth(user));

describe("stage map", () => {
  it("puts every application status in exactly one stage", () => {
    const statuses = Application.schema.path("status").enumValues;
    const mapped = STAGES.flatMap(([, , s]) => s);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect([...statuses].sort()).toEqual([...mapped].sort());
  });

  it("counts every stage, zeros included, and the parts sum to the total", () => {
    const p = pipelineOf([{ status: "pending" }, { status: "hired" }, { status: "offer_accepted" }, { status: "withdrawn" }]);
    expect(p.stages).toHaveLength(STAGES.length);
    expect(p.stages.reduce((n, s) => n + s.count, 0)).toBe(p.total);
    expect(Object.fromEntries(p.stages.map((s) => [s.key, s.count]))).toMatchObject({ new: 1, hired: 2, closed: 1, offer: 0 });
    expect(stageOf("pending_ceo_approval")).toBe("decision");
  });
});

describe("GET /api/v1/overview", () => {
  let owner, recruiter, student, other, company, jobA, closedJob;
  const now = Date.now();

  beforeEach(async () => {
    owner = await createUser({ email: "ceo@acme.test", role: "company_admin" });
    company = await Company.create({
    subscription: { status: "active" },
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: owner._id,
    });
    recruiter = await createUser({ email: "r@acme.test", role: "recruiter", companyId: company._id });
    await Company.updateOne({ _id: company._id }, { $push: { recruiters: { userId: recruiter._id, status: "active" } } });
    student = await createUser({ email: "s@test.com", role: "student", fullname: "Ada Lovelace", trialEndDate: new Date(now + 10 * 864e5) });
    other = await createUser({ email: "o@test.com", role: "student", fullname: "Ben" });
    const job = (title, extra = {}) =>
      Job.create({
        title,
        description: "Build APIs with Node.js and PostgreSQL for our platform.",
        requirements: ["Node.js"],
        salary: 1000,
        location: "Remote",
        jobType: "Full-time",
        experienceLevel: 2,
        position: 1,
        company: company._id,
        created_by: recruiter._id,
        ...extra,
      });
    jobA = await job("Backend Engineer");
    closedJob = await job("Old role", { isActive: false });
    const apply = (applicant, status, j = jobA, ageDays = 0) =>
      Application.create({ job: j._id, applicant: applicant._id, status, createdAt: new Date(now - ageDays * 864e5) });
    const a1 = await apply(student, "video_scheduled", jobA, 3);
    await apply(other, "pending", jobA, 5);
    await apply(other, "pending_ceo_approval", closedJob);
    await Interview.create({
      applicationId: a1._id,
      jobId: jobA._id,
      companyId: company._id,
      studentId: student._id,
      recruiterId: recruiter._id,
      scheduledAt: new Date(now + 3600e3),
    });
    await Interview.create({
      applicationId: a1._id,
      jobId: jobA._id,
      companyId: company._id,
      studentId: other._id,
      recruiterId: recruiter._id,
      scheduledAt: new Date(now - 864e5),
      status: "video_completed",
      videoInterview: { status: "completed" },
      finalReport: { status: "draft" },
    });
  });

  it("gives the owner a pipeline of open jobs only, plus the decision count across all jobs", async () => {
    const { body } = await overview(owner).expect(200);
    expect(body.role).toBe("company_admin");
    expect(body.company).toMatchObject({ name: "Acme", plan: "Basic" });
    expect(body.usage).toMatchObject({ activeJobs: 1, recruiters: 1 });
    expect(body.pipeline.total).toBe(2); // the closed job's applicant is left out
    expect(body.awaitingDecision).toBe(1); // but still waits on the owner
    expect(body.openJobs).toMatchObject({ total: 1, rows: [{ title: "Backend Engineer", applicants: 2, interviewing: 1 }] });
  });

  it("gives the recruiter today's interviews, reports to send and applicants waiting longest first", async () => {
    const { body } = await overview(recruiter).expect(200);
    expect(body.upcoming.rows).toEqual([expect.objectContaining({ candidate: "Ada Lovelace", job: "Backend Engineer" })]);
    expect(body.reportsToSend.rows).toEqual([expect.objectContaining({ candidate: "Ben", reportStatus: "draft" })]);
    expect(body.toReview.rows[0]).toMatchObject({ candidate: "Ben", waitingDays: 5 });
    expect(body.pipeline.stages.reduce((n, s) => n + s.count, 0)).toBe(body.pipeline.total);
  });

  it("gives the candidate their applications, next interview and trial", async () => {
    const { body } = await overview(student).expect(200);
    expect(body.applications.rows).toEqual([expect.objectContaining({ job: "Backend Engineer", company: "Acme", stage: "interviewing" })]);
    expect(body.upcoming.total).toBe(1);
    expect(body.trial).toMatchObject({ daysLeft: 10, expired: false });
    // Another candidate's data never leaks in
    const { body: ben } = await overview(other).expect(200);
    expect(ben.applications.total).toBe(2);
    expect(ben.applications.rows.map((r) => r.job)).not.toContain(undefined);
  });

  it("lists every company job with applicants per stage, the same for owner and recruiter", async () => {
    const asOwner = (await request(app).get("/api/v1/overview/jobs").set(auth(owner)).expect(200)).body.jobs;
    const asRecruiter = (await request(app).get("/api/v1/overview/jobs").set(auth(recruiter)).expect(200)).body.jobs;
    expect(asRecruiter).toEqual(asOwner);
    const byTitle = Object.fromEntries(asOwner.map((j) => [j.title, j]));
    expect(byTitle["Backend Engineer"]).toMatchObject({ open: true, applicants: 2, stages: { interviewing: 1, new: 1 } });
    expect(byTitle["Old role"]).toMatchObject({ open: false, applicants: 1, stages: { decision: 1 } });
    await request(app).get("/api/v1/overview/jobs").set(auth(student)).expect(403);
  });

  it("requires sign-in", async () => {
    await request(app).get("/api/v1/overview").expect(401);
  });
});
