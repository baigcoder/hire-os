import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { Notification } from "../../models/notification.model.js";
import { IntegritySession } from "../../models/integritySession.model.js";
import { Call } from "../../models/call.model.js";
import { notifyStaff, ALERT_EVERY_MS } from "../../modules/integrity/service.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

let phone = 9700000000;
const createUser = (fields) =>
  User.create({ phoneNumber: String(phone++), password: "test-password", fullname: fields.email, ...fields });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("messages, calls and integrity alerts", () => {
  let owner, recruiter, otherRecruiter, candidate, stranger, interview, company;

  beforeEach(async () => {
    owner = await createUser({ email: "owner@acme.test", role: "company_admin" });
    company = await Company.create({
      subscription: { status: "active" },
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: owner._id,
    });
    await User.updateOne({ _id: owner._id }, { companyId: company._id });
    recruiter = await createUser({ email: "rec@acme.test", role: "recruiter", companyId: company._id });
    otherRecruiter = await createUser({ email: "rec@other.test", role: "recruiter", companyId: (await Company.create({
      subscription: { status: "active" },
      name: "Other",
      email: "hr@other.test",
      description: "Other builds other software for everyone.",
      website: "https://other.test",
      location: "Remote",
      adminUser: owner._id,
    }))._id });
    candidate = await createUser({ email: "cand@test.com", role: "student" });
    stranger = await createUser({ email: "stranger@test.com", role: "student" });
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

  const send = (from, to) =>
    request(app).post("/api/v1/message/send").set(auth(from)).send({ receiverId: String(to._id), subject: "Hi", content: "Hello there" });

  it("lets a candidate and the company's staff talk once an interview is scheduled", async () => {
    expect((await send(candidate, recruiter)).status).toBe(201);
    expect((await send(recruiter, candidate)).status).toBe(201);
    expect((await send(owner, candidate)).status).toBe(201);
  });

  it("lets owner and recruiters of one company talk, and nobody else", async () => {
    expect((await send(owner, recruiter)).status).toBe(201);
    expect((await send(recruiter, owner)).status).toBe(201);
    expect((await send(otherRecruiter, recruiter)).status).toBe(404);
    expect((await send(stranger, recruiter)).status).toBe(404);
    expect((await send(otherRecruiter, candidate)).status).toBe(404);
    expect((await send(candidate, stranger)).status).toBe(404);
  });

  it("closes the conversation when the interview is cancelled", async () => {
    await Interview.updateOne({ _id: interview._id }, { status: "cancelled" });
    expect((await send(candidate, recruiter)).status).toBe(404);
  });

  it("lists only the people each user may contact", async () => {
    const mine = async (u) =>
      (await request(app).get("/api/v1/message/contacts").set(auth(u))).body.contacts.map((c) => c.email).sort();
    expect(await mine(candidate)).toEqual(["owner@acme.test", "rec@acme.test"]);
    expect(await mine(recruiter)).toEqual(["cand@test.com", "owner@acme.test"]);
    expect(await mine(stranger)).toEqual([]);
  });

  it("limits an owner's announcement to their own recruiters", async () => {
    const res = await request(app).post("/api/v1/message/broadcast").set(auth(owner)).send({ subject: "Team", content: "Standup at ten" });
    expect(res.status).toBe(201);
    const reached = await Notification.find({ type: "announcement" }).distinct("userId");
    expect(reached.map(String)).toEqual([String(recruiter._id)]);
    expect((await request(app).post("/api/v1/message/broadcast").set(auth(recruiter)).send({ subject: "x", content: "y" })).status).toBe(403);
  });

  it("rings, answers and ends a call between allowed people only", async () => {
    expect((await request(app).post("/api/v1/calls").set(auth(stranger)).send({ calleeId: String(recruiter._id) })).status).toBe(404);

    const start = await request(app).post("/api/v1/calls").set(auth(candidate)).send({ calleeId: String(recruiter._id), type: "audio" });
    expect(start.status).toBe(201);
    expect(start.body.topic).toBe(`call:${start.body.call._id}`);
    expect(start.body.ice.iceServers.length).toBeGreaterThan(0);
    const id = start.body.call._id;

    // Only the two people on the call can see it, and only the callee answers
    expect((await request(app).get(`/api/v1/calls/${id}/config`).set(auth(owner))).status).toBe(404);
    expect((await request(app).post(`/api/v1/calls/${id}/accept`).set(auth(candidate))).status).toBe(404);
    const accept = await request(app).post(`/api/v1/calls/${id}/accept`).set(auth(recruiter));
    expect(accept.status).toBe(200);
    expect(accept.body.call.status).toBe("accepted");

    expect((await request(app).post(`/api/v1/calls/${id}/end`).set(auth(candidate))).body.call.status).toBe("ended");
    expect((await request(app).get(`/api/v1/calls/${id}/config`).set(auth(recruiter))).status).toBe(409);
  });

  it("marks an unanswered call missed", async () => {
    const start = await request(app).post("/api/v1/calls").set(auth(owner)).send({ calleeId: String(recruiter._id) });
    // Straight to the collection: Mongoose keeps createdAt immutable
    await Call.collection.updateOne({ _id: new mongoose.Types.ObjectId(start.body.call._id) }, { $set: { createdAt: new Date(Date.now() - 60_000) } });
    const res = await request(app).post(`/api/v1/calls/${start.body.call._id}/accept`).set(auth(recruiter));
    expect(res.status).toBe(409);
    expect(res.body.status).toBe("missed");
  });

  it("keeps the candidate out of the video round until the MCQ is passed", async () => {
    await Interview.updateOne({ _id: interview._id }, { "mcqTest.enabled": true, "mcqTest.status": "failed", "videoInterview.enabled": true });
    expect((await request(app).post(`/api/v1/interview/${interview._id}/video/join`).set(auth(candidate))).status).toBe(403);
    const config = await request(app).get(`/api/v1/realtime/interviews/${interview._id}/call-config`).set(auth(candidate));
    expect(config.status).toBe(403);
    expect(config.body.code).toBe("MCQ_REQUIRED");
    // Staff still get the room, and a passed MCQ opens it for the candidate
    expect((await request(app).get(`/api/v1/realtime/interviews/${interview._id}/call-config`).set(auth(recruiter))).status).toBe(200);
    await Interview.updateOne({ _id: interview._id }, { "mcqTest.status": "passed" });
    expect((await request(app).get(`/api/v1/realtime/interviews/${interview._id}/call-config`).set(auth(candidate))).status).toBe(200);
  });

  it("alerts the interview's recruiter and the owner, once per signal per window", async () => {
    const session = await IntegritySession.create({
      interviewId: interview._id,
      candidateId: candidate._id,
      recruiterId: recruiter._id,
      companyId: company._id,
      jobId: interview.jobId,
    });
    const now = Date.now();
    const tab = { signal: "tab_hidden", label: "Interview tab hidden" };
    expect(await notifyStaff(session, [tab, { signal: "gaze_away", label: "Looking away from the screen" }], now)).toBe(2);
    const alerts = await Notification.find({ type: "fraud_alert" }).lean();
    expect(alerts.map((a) => String(a.userId)).sort()).toEqual([String(owner._id), String(recruiter._id)].sort());
    expect(alerts[0].message).toBe("Interview tab hidden, Looking away from the screen");
    expect(alerts[0].actionUrl).toBe(`/interview/${interview._id}/integrity`);

    expect(await notifyStaff(session, [tab], now + 1000)).toBe(0);
    expect(await notifyStaff(session, [tab], now + ALERT_EVERY_MS + 1)).toBe(2);
  });
});
