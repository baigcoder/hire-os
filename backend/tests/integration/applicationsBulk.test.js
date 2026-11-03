import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";

let phone = 9940000000;
const createUser = (fields) => User.create({ phoneNumber: String(phone++), password: "test-password-hash", fullname: fields.role, ...fields });
const auth = (user) => ({ Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}` });

const makeCompany = async (name) => {
  const owner = await createUser({ email: `ceo@${name}.test`, role: "company_admin" });
  const company = await Company.create({
    name,
    email: `hr@${name}.test`,
    description: `${name} builds logistics software for everyone.`,
    website: `https://${name}.test`,
    location: "Remote",
    adminUser: owner._id,
  });
  const recruiter = await createUser({ email: `r@${name}.test`, role: "recruiter", companyId: company._id });
  const job = (title) =>
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
    });
  return { owner, company, recruiter, job };
};

describe("applicants: bulk actions and the company list", () => {
  let acme, other, a1, a2, locked, foreign, jobA;

  beforeEach(async () => {
    acme = await makeCompany("acme");
    other = await makeCompany("other");
    jobA = await acme.job("Backend");
    const jobB = await acme.job("Design");
    const otherJob = await other.job("Sales");
    const cand = (n) => createUser({ email: `c${n}@test.com`, role: "student" });
    a1 = await Application.create({ job: jobA._id, applicant: (await cand(1))._id, status: "pending" });
    a2 = await Application.create({ job: jobB._id, applicant: (await cand(2))._id, status: "pending" });
    locked = await Application.create({ job: jobA._id, applicant: (await cand(3))._id, status: "pending_ceo_approval" });
    foreign = await Application.create({ job: otherJob._id, applicant: (await cand(4))._id, status: "pending" });
  });

  const bulk = (user, body) => request(app).post("/api/v1/application/bulk-update").set(auth(user)).send(body);

  it("updates selected applications across several jobs and marks them reviewed", async () => {
    const res = await bulk(acme.recruiter, { applicationIds: [a1._id, a2._id], action: "review" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ updated: 2, skipped: 0 });
    expect((await Application.findById(a2._id)).status).toBe("under_review");
  });

  it("leaves candidates with the owner untouched", async () => {
    const res = await bulk(acme.recruiter, { applicationIds: [a1._id, locked._id], action: "reject" });
    expect(res.body).toMatchObject({ updated: 1, skipped: 1 });
    expect((await Application.findById(locked._id)).status).toBe("pending_ceo_approval");
  });

  it("refuses unknown actions and another company's applications", async () => {
    expect((await bulk(acme.recruiter, { applicationIds: [a1._id], action: "reviewed" })).status).toBe(400);
    expect((await bulk(acme.recruiter, { applicationIds: [a1._id, foreign._id], action: "reject" })).status).toBe(403);
    expect((await Application.findById(foreign._id)).status).toBe("pending");
    expect((await Application.findById(a1._id)).status).toBe("pending");
  });

  it("never sends applicants' password hashes", async () => {
    const res = await request(app).get("/api/v1/application/company").set(auth(acme.recruiter));
    expect(res.status).toBe(200);
    expect(res.body.applications.length).toBe(3);
    for (const a of res.body.applications) {
      expect(a.applicant.password).toBeUndefined();
      expect(a.applicant.passwordResetToken).toBeUndefined();
    }
  });

  it("lets the owner close and reopen any of the company's jobs, but not another company's", async () => {
    await User.updateOne({ _id: acme.owner._id }, { companyId: acme.company._id });
    await User.updateOne({ _id: other.owner._id }, { companyId: other.company._id });
    const toggle = (user) => request(app).patch(`/api/v1/job/toggle-status/${jobA._id}`).set(auth(user));
    expect((await toggle(other.owner)).status).toBe(403);
    const closed = await toggle(acme.owner); // posted by acme's recruiter
    expect(closed.status).toBe(200);
    expect(closed.body.isActive).toBe(false);
    expect((await toggle(acme.owner)).body.isActive).toBe(true);
  });

  it("updates one applicant only to a status a recruiter may set", async () => {
    const update = (id, status) => request(app).post(`/api/v1/application/status/${id}/update`).set(auth(acme.recruiter)).send({ status });
    const accepted = await update(a1._id, "Accepted"); // what the old screens sent
    expect(accepted.status).toBe(200);
    expect((await Application.findById(a1._id)).status).toBe("shortlisted");
    expect((await update(a1._id, "hired")).status).toBe(400);
    expect((await update(locked._id, "rejected")).status).toBe(409);
    const app1 = await Application.findById(a1._id);
    expect(app1.statusHistory.at(-1)).toMatchObject({ status: "shortlisted" });
  });

  it("lists a job's applicants from the applications themselves, with their stage", async () => {
    const res = await request(app).get(`/api/v1/application/${jobA._id}/applicants`).set(auth(acme.recruiter));
    expect(res.status).toBe(200);
    const stages = res.body.job.applications.map((a) => a.stage).sort();
    expect(stages).toEqual(["decision", "new"]);
    expect(res.body.job.applications[0].applicant.password).toBeUndefined();
  });
});
