import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { setRealtimeFetchForTests } from "../../platform/realtime/index.js";

let phone = 9800000000;
const createUser = (fields) =>
  User.create({ phoneNumber: String(phone++), password: "test-password", fullname: fields.role, ...fields });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("realtime call config", () => {
  let recruiter, colleague, outsider, candidate, interview, broadcasts;

  beforeEach(async () => {
    process.env.SUPABASE_JWT_SECRET = "realtime-test-secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.SUPABASE_URL = "https://proj.supabase.co";
    broadcasts = [];
    setRealtimeFetchForTests(async (url, init) => {
      broadcasts.push(JSON.parse(init.body).messages[0]);
      return { ok: true };
    });

    recruiter = await createUser({ email: "r@acme.test", role: "recruiter" });
    const company = await Company.create({
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: recruiter._id,
    });
    await User.updateOne({ _id: recruiter._id }, { companyId: company._id });
    colleague = await createUser({ email: "c@acme.test", role: "recruiter", companyId: company._id });
    outsider = await createUser({ email: "o@other.test", role: "student" });
    candidate = await createUser({ email: "s@test.com", role: "student", fullname: "Sam Candidate" });
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
    const application = await Application.create({ job: job._id, applicant: candidate._id });
    interview = await Interview.create({
      applicationId: application._id,
      jobId: job._id,
      companyId: company._id,
      studentId: candidate._id,
      recruiterId: recruiter._id,
      scheduledAt: new Date(),
    });
  });

  afterEach(() => {
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    setRealtimeFetchForTests(null);
  });

  const url = () => `/api/v1/realtime/interviews/${interview._id}/call-config`;

  it("gives each participant a token for this interview and their own topic only", async () => {
    const res = await request(app).get(url()).set(auth(candidate));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: "candidate", topic: `interview:${interview._id}` });
    expect(res.body.ice.iceServers.length).toBeGreaterThan(0);
    const claims = jwt.verify(res.body.realtime.token, "realtime-test-secret");
    expect(claims.hireos_topics).toEqual([`interview:${interview._id}`, `user:${candidate._id}`]);
    expect(res.headers["cache-control"]).toBe("no-store");

    const asColleague = await request(app).get(url()).set(auth(colleague));
    expect(asColleague.body.role).toBe("recruiter");
  });

  it("hides the interview from everyone else", async () => {
    expect((await request(app).get(url()).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get(url())).status).toBe(401);
  });

  it("refuses a cancelled interview", async () => {
    await Interview.updateOne({ _id: interview._id }, { "videoInterview.status": "cancelled" });
    const res = await request(app).get(url()).set(auth(candidate));
    expect(res.status).toBe(409);
  });

  it("falls back to public channels when no JWT secret is configured", async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const res = await request(app).get(url()).set(auth(candidate));
    expect(res.body.realtime).toEqual({
      privateChannels: false,
      topics: [`interview:${interview._id}`, `user:${candidate._id}`],
    });
  });

  it("issues a notification-topic token for the caller only", async () => {
    const res = await request(app).get("/api/v1/realtime/token").set(auth(recruiter));
    const claims = jwt.verify(res.body.realtime.token, "realtime-test-secret");
    expect(claims.hireos_topics).toEqual([`user:${recruiter._id}`]);
  });

  it("tells only this interview's recruiter, privately, that the candidate joined", async () => {
    const res = await request(app).post(`/api/v1/interview/${interview._id}/video/join`).set(auth(candidate));
    expect(res.status).toBe(200);
    expect(broadcasts).toEqual([
      expect.objectContaining({
        topic: `user:${recruiter._id}`,
        event: "student_joined_interview",
        private: true,
        payload: expect.objectContaining({ interviewId: String(interview._id), studentName: "Sam Candidate" }),
      }),
    ]);
  });
});
