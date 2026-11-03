import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { ApplicantScreening } from "../../models/applicantScreening.model.js";
import { Embedding } from "../../models/embedding.model.js";
import { BackgroundJob } from "../../models/backgroundJob.model.js";
import {
  setEmbedderForTests,
  searchSimilar,
  embedQuery,
} from "../../platform/embeddings/index.js";
import {
  EMBED_JOB,
  enqueueJobIndexing,
  indexJob,
  indexResumeReport,
  indexScreening,
  removeJobFromIndex,
} from "../../modules/discover/indexing.js";
import { toolByName } from "../../modules/coach/tools.js";
import { assignIds } from "../../modules/resume-intel/profile.js";
import { computeSignals } from "../../modules/resume-intel/signals.js";
import { backendExtraction } from "../fixtures/resumeIntelOutputs.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

// Deterministic stand-in for Gemini: a unit vector of keyword counts
const VOCAB = [
  "node",
  "postgres",
  "typescript",
  "react",
  "css",
  "frontend",
  "sql",
  "tableau",
  "python",
  "analyst",
  "backend",
  "kubernetes",
];
const fakeEmbedder = () => {
  const calls = [];
  const embed = async (texts) => {
    calls.push(texts.length);
    return texts.map((t) => {
      const lower = t.toLowerCase();
      const v = VOCAB.map((w) => lower.split(w).length - 1 + 0.01);
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      return v.map((x) => x / norm);
    });
  };
  embed.calls = calls;
  return embed;
};

let phone = 9700000000;
const createUser = (fields) =>
  User.create({
    phoneNumber: String(phone++),
    password: "test-password",
    ...fields,
  });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

const makeJob = (fields) =>
  Job.create({
    description:
      "A sufficiently long job description for validation purposes here.",
    salary: 1,
    location: "Remote",
    jobType: "Full-time",
    experienceLevel: 2,
    position: 1,
    ...fields,
  });

describe("semantic discovery", () => {
  beforeAll(() =>
    Promise.all([BackgroundJob.syncIndexes(), Company.syncIndexes()]),
  );

  let embedder, student, recruiter, otherRecruiter, company, otherCompany;
  let backendJob, frontendJob, dataJob, closedJob, otherCompanyJob;

  beforeEach(async () => {
    embedder = fakeEmbedder();
    setEmbedderForTests(embedder);

    student = await createUser({
      fullname: "Stu",
      email: "stu@test.com",
      role: "student",
    });
    recruiter = await createUser({
      fullname: "Rec",
      email: "rec@acme.test",
      role: "recruiter",
    });
    otherRecruiter = await createUser({
      fullname: "Oth",
      email: "rec@other.test",
      role: "recruiter",
    });
    company = await Company.create({
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: recruiter._id,
      userId: recruiter._id,
    });
    otherCompany = await Company.create({
      name: "Other",
      email: "hr@other.test",
      description: "Other company that also hires engineers here.",
      website: "https://other.test",
      location: "Remote",
      adminUser: otherRecruiter._id,
      userId: otherRecruiter._id,
    });
    await User.updateOne({ _id: recruiter._id }, { companyId: company._id });
    await User.updateOne(
      { _id: otherRecruiter._id },
      { companyId: otherCompany._id },
    );

    const mine = { company: company._id, created_by: recruiter._id };
    backendJob = await makeJob({
      title: "Backend Engineer",
      skills: ["Node.js", "PostgreSQL", "TypeScript"],
      requirements: ["backend node services"],
      ...mine,
    });
    frontendJob = await makeJob({
      title: "Frontend Developer",
      skills: ["React", "CSS"],
      requirements: ["frontend react apps"],
      ...mine,
    });
    dataJob = await makeJob({
      title: "Data Analyst",
      skills: ["SQL", "Tableau", "Python"],
      requirements: ["analyst dashboards"],
      ...mine,
    });
    closedJob = await makeJob({
      title: "Backend Node Engineer (closed)",
      skills: ["Node.js", "PostgreSQL"],
      isActive: false,
      ...mine,
    });
    otherCompanyJob = await makeJob({
      title: "Backend Engineer at Other",
      skills: ["Node.js", "PostgreSQL"],
      company: otherCompany._id,
      created_by: otherRecruiter._id,
    });
    for (const job of [
      backendJob,
      frontendJob,
      dataJob,
      closedJob,
      otherCompanyJob,
    ]) {
      await indexJob(job._id);
    }
  });

  afterEach(() => setEmbedderForTests(null));

  describe("indexing", () => {
    it("skips re-embedding unchanged documents and removes deleted jobs", async () => {
      const before = embedder.calls.length;
      expect(await indexJob(backendJob._id)).toBe("unchanged");
      expect(embedder.calls.length).toBe(before);

      await Job.updateOne(
        { _id: backendJob._id },
        { title: "Senior Backend Engineer" },
      );
      expect(await indexJob(backendJob._id)).toBe("updated");

      await removeJobFromIndex(backendJob._id);
      expect(
        await Embedding.countDocuments({ kind: "job", refId: backendJob._id }),
      ).toBe(0);
    });

    it("queues job indexing in the background", async () => {
      await enqueueJobIndexing(frontendJob._id);
      await enqueueJobIndexing(frontendJob._id);
      expect(await BackgroundJob.countDocuments({ name: EMBED_JOB })).toBe(1);
    });
  });

  describe("GET /api/v1/discover/jobs", () => {
    it("searches active jobs by meaning", async () => {
      const res = await request(app)
        .get("/api/v1/discover/jobs")
        .query({ q: "react frontend css" })
        .set(auth(student));
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe("query");
      expect(res.body.jobs[0].title).toBe("Frontend Developer");
      // Unrelated postings fall below the relative-similarity cutoff
      expect(res.body.jobs.map((j) => j.title)).not.toContain("Data Analyst");
      expect(res.body.jobs.map((j) => j.title)).not.toContain(
        "Backend Node Engineer (closed)",
      );
      expect(res.body.jobs[0].company.name).toBe("Acme");
    });

    it("recommends jobs from the analyzed resume, skipping jobs already applied to", async () => {
      const empty = await request(app)
        .get("/api/v1/discover/jobs")
        .set(auth(student));
      expect(empty.body).toMatchObject({ needsAnalysis: true, jobs: [] });

      const profile = assignIds(backendExtraction);
      await indexResumeReport({
        userId: student._id,
        profile,
        signals: computeSignals(
          profile,
          "Node.js PostgreSQL TypeScript backend",
        ),
      });

      const res = await request(app)
        .get("/api/v1/discover/jobs")
        .set(auth(student));
      expect(res.body.mode).toBe("profile");
      expect(res.body.jobs[0].title).toMatch(/Backend Engineer/);
      expect(res.body.jobs[0].matchedSkills).toEqual(
        expect.arrayContaining(["Node.js", "PostgreSQL", "TypeScript"]),
      );

      await Application.create({ job: backendJob._id, applicant: student._id });
      const after = await request(app)
        .get("/api/v1/discover/jobs")
        .set(auth(student));
      expect(after.body.jobs.map((j) => String(j._id))).not.toContain(
        String(backendJob._id),
      );
    });

    it("validates the query and reports when embeddings aren't configured", async () => {
      const long = await request(app)
        .get("/api/v1/discover/jobs")
        .query({ q: "x".repeat(201) })
        .set(auth(student));
      expect(long.status).toBe(400);

      setEmbedderForTests(null);
      const saved = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
        const res = await request(app)
          .get("/api/v1/discover/jobs")
          .set(auth(student));
        expect(res.status).toBe(503);
        expect(res.body.code).toBe("EMBEDDINGS_UNAVAILABLE");
      } finally {
        if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
      }
    });
  });

  describe("GET /api/v1/discover/candidates", () => {
    const screen = async (job, text, applicantName) => {
      const applicant = await createUser({
        fullname: applicantName,
        email: `${applicantName.replace(/\s+/g, ".").toLowerCase()}@x.test`,
        role: "student",
      });
      const application = await Application.create({
        job: job._id,
        applicant: applicant._id,
      });
      const profile = assignIds({
        ...backendExtraction,
        summary: text,
        experience: [{ ...backendExtraction.experience[0], bullets: [text] }],
        projects: [],
        skills: [],
      });
      const signals = computeSignals(profile, text);
      const screening = await ApplicantScreening.create({
        applicationId: application._id,
        jobId: job._id,
        applicantId: applicant._id,
        status: "completed",
        profile,
        signals,
        score: { overall: 70, band: "Good" },
        flags: [],
      });
      await indexScreening(screening, {
        companyId: job.company,
        createdBy: job.created_by,
      });
      return screening;
    };

    it("finds the company's applicants by meaning, anonymously", async () => {
      await screen(
        backendJob,
        "Built node postgres typescript backend services",
        "Ava Node",
      );
      await screen(
        dataJob,
        "Built tableau and sql dashboards as an analyst with python",
        "Ben Data",
      );
      await screen(
        otherCompanyJob,
        "Built node postgres backend services",
        "Cy Elsewhere",
      );

      const res = await request(app)
        .get("/api/v1/discover/candidates")
        .query({ q: "node postgres backend" })
        .set(auth(recruiter));
      expect(res.status).toBe(200);
      // The data analyst is far weaker than the backend match and is cut
      expect(res.body.candidates).toHaveLength(1);
      expect(res.body.candidates[0]).toMatchObject({
        jobTitle: "Backend Engineer",
        score: 70,
        band: "Good",
      });
      expect(JSON.stringify(res.body)).not.toMatch(/Ava|Ben|Cy|@x\.test/);

      const scoped = await request(app)
        .get("/api/v1/discover/candidates")
        .query({ q: "node postgres backend", jobId: String(dataJob._id) })
        .set(auth(recruiter));
      expect(scoped.body.candidates.map((c) => c.jobTitle)).toEqual([
        "Data Analyst",
      ]);
    });

    it("rejects other companies' jobs, students and empty queries", async () => {
      const foreign = await request(app)
        .get("/api/v1/discover/candidates")
        .query({ q: "node", jobId: String(otherCompanyJob._id) })
        .set(auth(recruiter));
      expect(foreign.status).toBe(403);

      const student403 = await request(app)
        .get("/api/v1/discover/candidates")
        .query({ q: "node" })
        .set(auth(student));
      expect(student403.status).toBe(403);

      const noQuery = await request(app)
        .get("/api/v1/discover/candidates")
        .set(auth(recruiter));
      expect(noQuery.status).toBe(400);
    });
  });

  it("gives the coach semantic job search", async () => {
    const result = await toolByName
      .get("search_jobs")
      .run({ query: "data analyst with sql and tableau", limit: 2 }, {});
    expect(result.method).toBe("semantic");
    expect(result.jobs[0].title).toBe("Data Analyst");
  });

  it("ranks by cosine similarity in exact mode", async () => {
    const hits = await searchSimilar({
      kind: "job",
      vector: await embedQuery("react css frontend"),
      limit: 3,
      excludeRefIds: [new mongoose.Types.ObjectId()],
    });
    expect(hits[0].refId).toBe(String(frontendJob._id));
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });
});
