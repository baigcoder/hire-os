import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";

let phone = 9950000000;
const createUser = (fields) => User.create({ phoneNumber: String(phone++), password: "test-password-hash", fullname: fields.role, ...fields });
const auth = (user) => ({ Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}` });

const setup = async (name) => {
  const owner = await createUser({ email: `ceo@${name}.test`, role: "company_admin" });
  const company = await Company.create({
    subscription: { status: "active" },
    name,
    email: `hr@${name}.test`,
    description: `${name} builds logistics software for everyone.`,
    website: `https://${name}.test`,
    location: "Remote",
    adminUser: owner._id,
  });
  await User.updateOne({ _id: owner._id }, { companyId: company._id });
  const recruiter = await createUser({ email: `r@${name}.test`, role: "recruiter", companyId: company._id });
  const job = await Job.create({
    title: "Backend",
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
  const interview = async (fields = {}) => {
    const student = await createUser({ email: `s${phone}@test.com`, role: "student" });
    const application = await Application.create({ job: job._id, applicant: student._id, status: "video_scheduled" });
    return Interview.create({
      applicationId: application._id,
      jobId: job._id,
      companyId: company._id,
      studentId: student._id,
      recruiterId: recruiter._id,
      scheduledAt: new Date(Date.now() + 864e5),
      ...fields,
    });
  };
  return { owner, recruiter, interview };
};

describe("managing interviews", () => {
  let acme, other;
  beforeEach(async () => {
    acme = await setup("acme");
    other = await setup("other");
  });

  const reschedule = (user, id, newDateTime) => request(app).put(`/api/v1/interview/${id}/reschedule`).set(auth(user)).send({ newDateTime, reason: "Clash" });

  it("reschedules only to a real time in the future", async () => {
    const iv = await acme.interview();
    expect((await reschedule(acme.recruiter, iv._id, "not a date")).status).toBe(400);
    expect((await reschedule(acme.recruiter, iv._id, undefined)).status).toBe(400);
    expect((await reschedule(acme.recruiter, iv._id, new Date(Date.now() - 3600e3).toISOString())).status).toBe(400);
    const when = new Date(Date.now() + 3 * 864e5);
    expect((await reschedule(acme.recruiter, iv._id, when.toISOString())).status).toBe(200);
    expect((await Interview.findById(iv._id)).scheduledAt.toISOString()).toBe(when.toISOString());
  });

  it("won't reschedule or cancel an interview that already happened", async () => {
    const done = await acme.interview({ videoInterview: { status: "completed" } });
    expect((await reschedule(acme.recruiter, done._id, new Date(Date.now() + 864e5).toISOString())).status).toBe(409);
    expect((await request(app).put(`/api/v1/interview/${done._id}/cancel`).set(auth(acme.recruiter)).send({ reason: "x" })).status).toBe(409);
    const upcoming = await acme.interview();
    expect((await request(app).put(`/api/v1/interview/${upcoming._id}/cancel`).set(auth(acme.recruiter)).send({ reason: "Role filled" })).status).toBe(200);
    expect((await Interview.findById(upcoming._id)).status).toBe("cancelled");
  });

  it("refuses another company", async () => {
    const iv = await acme.interview();
    expect((await reschedule(other.recruiter, iv._id, new Date(Date.now() + 864e5).toISOString())).status).toBe(403);
  });

  it("lists every interview of the company for its owner, and nothing of other companies", async () => {
    await acme.interview();
    await acme.interview();
    await other.interview();
    const res = await request(app).get("/api/v1/interview/company/all").set(auth(acme.owner));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.interviews[0].recruiterId.fullname).toBe("recruiter");
    expect(res.body.interviews[0].studentId.password).toBeUndefined();
  });
});
