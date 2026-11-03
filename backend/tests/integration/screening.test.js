import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { ApplicantScreening } from "../../models/applicantScreening.model.js";
import { BackgroundJob } from "../../models/backgroundJob.model.js";
import { WorkerHeartbeat } from "../../models/workerHeartbeat.model.js";
import queue from "../../platform/queue/index.js";
import {
  APPLICANT_SCREEN_JOB,
  createApplicantScreenHandler,
} from "../../jobs/applicantScreen.js";
import { ResumeSourceError } from "../../modules/screening/resumeSource.js";
import {
  backendExtraction,
  backendRequirements,
  backendMatches,
  backendScreeningSummary,
} from "../fixtures/resumeIntelOutputs.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

const resumeText = fs.readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../evals/resume-intel/fixtures/resumes/backend_mid.txt",
  ),
  "utf8",
);

const RESUME_URL = "https://res.cloudinary.com/demo/raw/upload/jordan.pdf";

/** Scripted AI that records every prompt it was sent. */
const makeFakeAi = () => {
  const prompts = [];
  const outputs = {
    "resume.extract": backendExtraction,
    "resume.requirements": backendRequirements,
    "resume.match": backendMatches,
    "screening.summary": backendScreeningSummary,
  };
  return {
    prompts,
    run: async ({ task, schema, messages }) => {
      prompts.push({ task, text: messages.map((m) => m.content).join("\n") });
      const data = outputs[task];
      if (!data) throw new Error(`unexpected task ${task}`);
      return {
        data: schema.parse(data),
        content: JSON.stringify(data),
        provider: "groq",
        model: "fake",
        degraded: false,
        cached: false,
        usage: {},
      };
    },
  };
};

let phone = 9400000000;
const createUser = (fields) =>
  User.create({
    phoneNumber: String(phone++),
    password: "test-password",
    ...fields,
  });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("recruiter screening", () => {
  let owner,
    colleague,
    outsider,
    applicant,
    otherApplicant,
    job,
    fakeAi,
    fetchCalls;

  beforeEach(async () => {
    owner = await createUser({
      fullname: "Owner",
      email: "owner@acme.test",
      role: "recruiter",
    });
    const company = await Company.create({
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: owner._id,
      userId: owner._id,
    });
    await User.updateOne({ _id: owner._id }, { companyId: company._id });
    colleague = await createUser({
      fullname: "Colleague",
      email: "colleague@acme.test",
      role: "recruiter",
      companyId: company._id,
    });
    outsider = await createUser({
      fullname: "Outsider",
      email: "rec@other.test",
      role: "recruiter",
    });
    applicant = await createUser({
      fullname: "Jordan Reyes",
      email: "jordan.reyes@example.com",
      role: "student",
      profile: { resume: RESUME_URL },
    });
    otherApplicant = await createUser({
      fullname: "No Resume",
      email: "noresume@example.com",
      role: "student",
    });
    job = await Job.create({
      title: "Backend Engineer (Node.js)",
      description:
        "Build the APIs behind our logistics platform with Node.js, TypeScript and PostgreSQL.",
      requirements: [
        "3+ years backend",
        "Node.js and TypeScript",
        "PostgreSQL",
      ],
      salary: 1000,
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: 3,
      position: 1,
      company: company._id,
      created_by: owner._id,
    });

    fakeAi = makeFakeAi();
    fetchCalls = [];
    queue.register(
      APPLICANT_SCREEN_JOB,
      createApplicantScreenHandler({
        ai: fakeAi,
        fetchResume: async (url) => {
          fetchCalls.push(url);
          return { text: resumeText };
        },
      }),
    );
  });

  const goOnline = () =>
    WorkerHeartbeat.create({
      workerId: "test-worker",
      handlers: [APPLICANT_SCREEN_JOB],
      seenAt: new Date(),
    });

  const apply = (user) =>
    request(app)
      .post(`/api/v1/application/apply/${job._id}`)
      .set(auth(user))
      .send();

  describe("applicant endpoints (S12)", () => {
    it("only shows applicants to the job's company, without secrets", async () => {
      await apply(applicant);
      await User.updateOne(
        { _id: applicant._id },
        {
          activeSessions: [
            { sessionId: "s1", refreshToken: "secret-refresh-token" },
          ],
        },
      );

      const denied = await request(app)
        .get(`/api/v1/application/${job._id}/applicants`)
        .set(auth(outsider));
      expect(denied.status).toBe(403);

      for (const user of [owner, colleague]) {
        const res = await request(app)
          .get(`/api/v1/application/${job._id}/applicants`)
          .set(auth(user));
        expect(res.status).toBe(200);
        const person = res.body.job.applications[0].applicant;
        expect(person.fullname).toBe("Jordan Reyes");
        expect(person.password).toBeUndefined();
        expect(person.activeSessions).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toMatch(/secret-refresh-token/);
      }
    });

    it("blocks status changes from other companies and bulk updates without a job", async () => {
      await apply(applicant);
      const application = await Application.findOne({ job: job._id });

      const denied = await request(app)
        .post(`/api/v1/application/status/${application._id}/update`)
        .set(auth(outsider))
        .send({ status: "rejected" });
      expect(denied.status).toBe(403);
      expect((await Application.findById(application._id)).status).toBe(
        "pending",
      );

      const ok = await request(app)
        .post(`/api/v1/application/status/${application._id}/update`)
        .set(auth(owner))
        .send({ status: "shortlisted" });
      expect(ok.status).toBe(200);
      expect(ok.body.application.applicant.password).toBeUndefined();

      const bulk = await request(app)
        .post("/api/v1/application/bulk-update")
        .set(auth(owner))
        .send({ action: "reject" });
      expect(bulk.status).toBe(400);

      const bulkOther = await request(app)
        .post("/api/v1/application/bulk-update")
        .set(auth(outsider))
        .send({ jobId: job._id, action: "reject" });
      expect(bulkOther.status).toBe(403);
      expect((await Application.findById(application._id)).status).toBe(
        "shortlisted",
      );
    });
  });

  it("queues a blind screening on apply and processes it without identity in prompts", async () => {
    const res = await apply(applicant);
    expect(res.status).toBe(201);

    const queued = await ApplicantScreening.findOne({ jobId: job._id }).lean();
    expect(queued.status).toBe("queued");
    expect(
      await BackgroundJob.countDocuments({ name: APPLICANT_SCREEN_JOB }),
    ).toBe(1);

    await queue.drain();

    expect(fetchCalls).toEqual([RESUME_URL]);
    const allPrompts = fakeAi.prompts.map((p) => p.text).join("\n");
    expect(allPrompts).not.toMatch(
      /Jordan|Reyes|jordan\.reyes@example\.com|555 010|github\.com/,
    );
    expect(allPrompts).toMatch(/\[Candidate\]/);

    const screening = await ApplicantScreening.findOne({
      jobId: job._id,
    }).lean();
    expect(screening.status).toBe("completed");
    expect(screening.redactions).toMatchObject({ email: 1, phone: 1, link: 1 });
    expect(screening.redactions.name).toBeGreaterThan(0);
    expect(screening.score.mode).toBe("job-match");
    // Ungrounded strength dropped, unknown requirement id cleared
    expect(screening.summary.strengths.map((s) => s.text)).toEqual([
      "Production Node.js microservices",
    ]);
    expect(screening.summary.concerns[1].requirementId).toBeNull();

    const application = await Application.findOne({ job: job._id }).lean();
    expect(application.resumeScore).toBe(screening.score.overall);
  });

  it("ranks screenings for the job's recruiters only", async () => {
    await apply(applicant);
    await apply(otherApplicant);
    await queue.drain();

    const denied = await request(app)
      .get(`/api/v1/screening/jobs/${job._id}`)
      .set(auth(outsider));
    expect(denied.status).toBe(403);

    const res = await request(app)
      .get(`/api/v1/screening/jobs/${job._id}`)
      .set(auth(colleague));
    expect(res.status).toBe(200);
    expect(res.body.counts).toMatchObject({
      total: 2,
      completed: 1,
      noResume: 1,
    });
    const [first, second] = res.body.candidates;
    expect(first).toMatchObject({ name: "Jordan Reyes", status: "completed" });
    expect(first.mustHave).toEqual({ met: 3, total: 3 });
    expect(second).toMatchObject({ status: "no_resume", score: null });

    const detail = await request(app)
      .get(`/api/v1/screening/${first.screeningId}`)
      .set(auth(owner));
    expect(detail.status).toBe(200);
    expect(detail.body.screening.matches).toHaveLength(4);

    const hidden = await request(app)
      .get(`/api/v1/screening/${first.screeningId}`)
      .set(auth(outsider));
    expect(hidden.status).toBe(404);
  });

  it("runs screening on demand only when a worker is online, skipping finished ones", async () => {
    await apply(applicant);
    await queue.drain();

    const offline = await request(app)
      .post(`/api/v1/screening/jobs/${job._id}/run`)
      .set(auth(owner))
      .send({});
    expect(offline.status).toBe(503);

    await goOnline();
    const again = await request(app)
      .post(`/api/v1/screening/jobs/${job._id}/run`)
      .set(auth(owner))
      .send({});
    expect(again.body).toMatchObject({ queued: 0, considered: 1 });

    const forced = await request(app)
      .post(`/api/v1/screening/jobs/${job._id}/run`)
      .set(auth(owner))
      .send({ force: true });
    expect(forced.body.queued).toBe(1);
    expect((await ApplicantScreening.findOne({ jobId: job._id })).status).toBe(
      "queued",
    );
    await queue.drain();
    expect((await ApplicantScreening.findOne({ jobId: job._id })).status).toBe(
      "completed",
    );
  });

  it("fails permanently, without retrying, when the resume can't be read", async () => {
    const application = await Application.create({
      job: job._id,
      applicant: applicant._id,
    });
    await ApplicantScreening.create({
      applicationId: application._id,
      jobId: job._id,
      applicantId: applicant._id,
    });
    const handler = createApplicantScreenHandler({
      ai: fakeAi,
      fetchResume: async () => {
        throw new ResumeSourceError("UNSUPPORTED_SOURCE", "nope");
      },
    });

    const result = await handler(
      { applicationId: application._id },
      { attempt: 1, job: { maxAttempts: 2 }, setProgress: async () => {} },
    );
    expect(result).toEqual({ failed: "UNSUPPORTED_SOURCE" });
    const saved = await ApplicantScreening.findOne({
      applicationId: application._id,
    }).lean();
    expect(saved).toMatchObject({
      status: "failed",
      error: { code: "UNSUPPORTED_SOURCE" },
    });
    expect(fakeAi.prompts).toHaveLength(0);
  });

  it("rejects invalid job ids", async () => {
    const res = await request(app)
      .get(`/api/v1/screening/jobs/${new mongoose.Types.ObjectId()}`)
      .set(auth(owner));
    expect(res.status).toBe(404);
    const bad = await request(app)
      .get("/api/v1/screening/jobs/nope")
      .set(auth(owner));
    expect(bad.status).toBe(400);
  });
});
