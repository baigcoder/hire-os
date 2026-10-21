import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Interview } from "../../models/interview.model.js";
import { ResumeAnalysis } from "../../models/ResumeAnalysis.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

const tokenFor = (user) =>
  jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY, {
    expiresIn: "15m",
  });

let phoneSeq = 0;
const createUser = (email, role) =>
  User.create({
    fullname: email.split("@")[0],
    email,
    phoneNumber: String(9000000000 + phoneSeq++),
    password: "hashed-password-not-used",
    role,
  });

describe("Phase 0 security fixes", () => {
  let candidate, otherStudent, recruiter, otherRecruiter, job;

  beforeEach(async () => {
    candidate = await createUser("candidate@test.com", "student");
    otherStudent = await createUser("other@test.com", "student");
    recruiter = await createUser("recruiter@test.com", "recruiter");
    otherRecruiter = await createUser("recruiter2@test.com", "recruiter");
    job = await Job.collection.insertOne({
      title: "Engineer",
      created_by: recruiter._id,
    });
  });

  describe("resume download", () => {
    it.each(["..%2F.env", "..%2Fpackage.json", "..%2F..%2Findex.js"])(
      "rejects path traversal %s",
      async (name) => {
        const res = await request(app)
          .get(`/api/v1/resume/download/${name}`)
          .set("Authorization", `Bearer ${tokenFor(candidate)}`);
        expect(res.status).toBe(400);
      },
    );

    it("does not serve a resume to an unrelated user", async () => {
      await ResumeAnalysis.create({
        userId: candidate._id,
        jobId: job.insertedId,
        resumePath: "/srv/uploads/resume-1-2.pdf",
        analysisScore: 70,
      });
      const res = await request(app)
        .get("/api/v1/resume/download/resume-1-2.pdf")
        .set("Authorization", `Bearer ${tokenFor(otherStudent)}`);
      expect(res.status).toBe(404);
    });
  });

  describe("resume analysis by job/user", () => {
    const path = () =>
      `/api/v1/resume/${job.insertedId}/${candidate._id.toString()}`;

    beforeEach(async () => {
      await ResumeAnalysis.create({
        userId: candidate._id,
        jobId: job.insertedId,
        analysisScore: 70,
      });
    });

    it("is visible to the candidate", async () => {
      const res = await request(app)
        .get(path())
        .set("Authorization", `Bearer ${tokenFor(candidate)}`);
      expect(res.status).toBe(200);
    });

    it("is visible to the recruiter who posted the job", async () => {
      const res = await request(app)
        .get(path())
        .set("Authorization", `Bearer ${tokenFor(recruiter)}`);
      expect(res.status).toBe(200);
    });

    it.each([
      ["another student", () => otherStudent],
      ["another recruiter", () => otherRecruiter],
    ])("is hidden from %s", async (_label, who) => {
      const res = await request(app)
        .get(path())
        .set("Authorization", `Bearer ${tokenFor(who())}`);
      expect(res.status).toBe(403);
    });
  });

  describe("interview fraud alerts", () => {
    let interview;

    beforeEach(async () => {
      interview = await Interview.create({
        applicationId: new mongoose.Types.ObjectId(),
        jobId: job.insertedId,
        companyId: new mongoose.Types.ObjectId(),
        studentId: candidate._id,
        recruiterId: recruiter._id,
        scheduledAt: new Date(),
      });
    });

    const post = (user, body) =>
      request(app)
        .post(`/api/v1/interview/${interview._id}/video/fraud-alert`)
        .set("Authorization", `Bearer ${tokenFor(user)}`)
        .send(body);

    it("accepts alerts from the interview's candidate", async () => {
      const res = await post(candidate, {
        type: "tab_switch",
        details: "switched",
        severity: "bogus",
      });
      expect(res.status).toBe(200);
      const saved = await Interview.findById(interview._id).lean();
      expect(saved.videoInterview.fraudAlerts).toHaveLength(1);
      expect(saved.videoInterview.fraudAlerts[0].severity).toBe("medium");
    });

    it.each([
      ["an unrelated user", () => otherStudent],
      ["the recruiter", () => recruiter],
    ])("rejects alerts from %s", async (_label, who) => {
      const res = await post(who(), { type: "tab_switch" });
      expect(res.status).toBe(403);
    });
  });

  it("requires super admin for performance stats", async () => {
    expect((await request(app).get("/api/v1/admin/performance")).status).toBe(
      401,
    );
    const res = await request(app)
      .get("/api/v1/admin/performance")
      .set("Authorization", `Bearer ${tokenFor(recruiter)}`);
    expect(res.status).toBe(403);
  });

  it("rejects an access token after logout", async () => {
    const token = tokenFor(candidate);
    const auth = { Authorization: `Bearer ${token}` };

    expect(
      (await request(app).get("/api/v1/resume/my-analysis").set(auth)).status,
    ).toBe(200);
    await request(app).get("/api/v1/user/logout").set(auth);
    const res = await request(app).get("/api/v1/resume/my-analysis").set(auth);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_REVOKED");
  });
});

describe("ResumeAnalysis schema", () => {
  it("keeps practice fields and normalizes overallFit", async () => {
    const userId = new mongoose.Types.ObjectId();
    await ResumeAnalysis.findOneAndUpdate(
      { userId, type: "practice" },
      {
        userId,
        type: "practice",
        analysisScore: 64,
        atsScore: 71,
        missingSkills: ["Docker"],
        overallFit: "Needs Improvement",
      },
      { upsert: true, new: true, runValidators: true },
    );
    const doc = await ResumeAnalysis.findOne({ userId }).lean();
    expect(doc.atsScore).toBe(71);
    expect(doc.missingSkills).toEqual(["Docker"]);
    expect(doc.overallFit).toBe("Poor");
  });

  it("still requires a job for application analyses", async () => {
    await expect(
      ResumeAnalysis.create({
        userId: new mongoose.Types.ObjectId(),
        analysisScore: 50,
      }),
    ).rejects.toThrow(/jobId/);
  });
});
