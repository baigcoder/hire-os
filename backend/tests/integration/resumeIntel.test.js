import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { ResumeReport } from "../../models/resumeReport.model.js";
import { ResumeAnalysis } from "../../models/ResumeAnalysis.js";
import { WorkerHeartbeat } from "../../models/workerHeartbeat.model.js";
import queue from "../../platform/queue/index.js";
import { AiGatewayError } from "../../platform/ai-gateway/gateway.js";
import {
  RESUME_ANALYZE_JOB,
  createResumeAnalyzeHandler,
} from "../../jobs/resumeAnalyze.js";
import { runResumePipeline } from "../../modules/resume-intel/pipeline.js";
import {
  backendExtraction,
  backendRequirements,
  backendMatches,
  backendCritique,
} from "../fixtures/resumeIntelOutputs.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../evals/resume-intel/fixtures",
);
const backendResume = fs.readFileSync(
  path.join(fixtureDir, "resumes/backend_mid.txt"),
  "utf8",
);
const injectionResume = fs.readFileSync(
  path.join(fixtureDir, "resumes/injection.txt"),
  "utf8",
);
const backendJob = fs.readFileSync(
  path.join(fixtureDir, "jobs/backend_node.txt"),
  "utf8",
);

/** Scripted stand-in for the AI gateway, keyed by task name. */
const makeFakeAi = (overrides = {}) => {
  const calls = [];
  const outputs = {
    "resume.extract": () => backendExtraction,
    "resume.requirements": () => backendRequirements,
    "resume.match": () => backendMatches,
    "resume.critique": () => backendCritique,
    ...overrides,
  };
  return {
    calls,
    run: async ({ task, schema }) => {
      calls.push(task);
      const output = outputs[task];
      if (!output) throw new Error(`unexpected task ${task}`);
      const data = await output(calls.filter((c) => c === task).length);
      return {
        data: schema ? schema.parse(data) : data,
        content: JSON.stringify(data),
        provider: "groq",
        model: "fake-model",
        degraded: false,
        cached: false,
        usage: { inputTokens: 100, outputTokens: 50 },
      };
    },
  };
};

const NOW = new Date("2026-10-01T00:00:00Z");

describe("runResumePipeline", () => {
  it("produces a verified, scored report against a job", async () => {
    const ai = makeFakeAi();
    const stages = [];
    const result = await runResumePipeline({
      ai,
      text: backendResume,
      textHash: "h",
      job: { text: backendJob, title: "Backend Engineer", minYears: 3 },
      onStage: (id, status) => stages.push(`${id}:${status}`),
      now: NOW,
    });

    expect(stages.filter((s) => s.endsWith(":done"))).toEqual([
      "guard:done",
      "structure:done",
      "signals:done",
      "requirements:done",
      "match:done",
      "score:done",
      "critique:done",
    ]);
    expect(result.job.requirements[1].skills).toEqual([
      "Node.js",
      "TypeScript",
    ]);
    // req_4 (Kubernetes) cited a quote that isn't in the resume
    expect(result.matches.map((m) => m.status)).toEqual([
      "met",
      "met",
      "met",
      "missing",
    ]);
    expect(result.grounding.matchDowngrades).toBe(1);
    // "Led a team of 20 engineers" had no real evidence
    expect(result.critique.strengths.map((s) => s.text)).not.toContain(
      "Led a team of 20 engineers",
    );
    expect(result.score.mode).toBe("job-match");
    // must: 3/3 met (weight 6), nice: missing (weight 1) → 6/7
    expect(result.score.components[0].value).toBe(0.86);
    expect(result.models.critique.model).toBe("fake-model");
  });

  it("skips job stages without a job and retries an ungrounded critique once", async () => {
    const ungrounded = {
      ...backendCritique,
      strengths: backendCritique.strengths.map((s) => ({
        ...s,
        evidence: [{ itemId: "exp_42", quote: "nothing real" }],
      })),
    };
    const ai = makeFakeAi({
      "resume.critique": (n) => (n === 1 ? ungrounded : backendCritique),
    });
    const stages = [];
    const result = await runResumePipeline({
      ai,
      text: backendResume,
      textHash: "h",
      onStage: (id, status) => stages.push(`${id}:${status}`),
      now: NOW,
    });

    expect(stages).toContain("requirements:skipped");
    expect(ai.calls).not.toContain("resume.match");
    expect(result.score.mode).toBe("profile-strength");
    expect(result.grounding.retried).toBe(true);
    expect(result.critique.strengths.length).toBeGreaterThan(0);
    expect(ai.calls.filter((c) => c === "resume.critique")).toHaveLength(2);
  });
});

describe("resume-intel API", () => {
  let phone = 9300000000;
  const createUser = (email) =>
    User.create({
      fullname: email.split("@")[0],
      email,
      phoneNumber: String(phone++),
      password: "test-password",
      role: "student",
    });
  const auth = (user) => ({
    Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
  });
  const goOnline = () =>
    WorkerHeartbeat.create({
      workerId: "test-worker",
      handlers: [RESUME_ANALYZE_JOB],
      seenAt: new Date(),
    });

  let fakeAi;
  beforeEach(() => {
    fakeAi = makeFakeAi();
    queue.register(
      RESUME_ANALYZE_JOB,
      createResumeAnalyzeHandler({ ai: fakeAi }),
      {
        concurrency: 2,
      },
    );
  });

  it("reports availability from worker heartbeats and refuses work when offline", async () => {
    const user = await createUser("offline@test.com");
    const caps = await request(app)
      .get("/api/v1/resume-intel/capabilities")
      .set(auth(user));
    expect(caps.body.available).toBe(false);

    const res = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: backendResume });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("PIPELINE_UNAVAILABLE");
  });

  it("queues, processes and returns a full report, then reuses it", async () => {
    await goOnline();
    const user = await createUser("owner@test.com");
    const other = await createUser("other@test.com");

    const created = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: backendResume, jobDescription: backendJob });
    expect(created.status).toBe(202);
    const id = created.body.analysisId;

    const queued = await request(app)
      .get(`/api/v1/resume-intel/analyses/${id}`)
      .set(auth(user));
    expect(queued.body.analysis.status).toBe("queued");
    expect(queued.body.analysis.resumeText).toBeUndefined();

    await queue.drain();

    const done = await request(app)
      .get(`/api/v1/resume-intel/analyses/${id}`)
      .set(auth(user));
    const report = done.body.analysis;
    expect(report.status).toBe("completed");
    expect(report.stages.every((s) => s.status === "done")).toBe(true);
    expect(report.score.mode).toBe("job-match");
    expect(report.matches).toHaveLength(4);
    expect(report.critique.rewrites[0].before).toMatch(/admin dashboard API/);

    // Legacy dashboard record is kept in step
    const legacy = await ResumeAnalysis.findOne({
      userId: user._id,
      type: "practice",
    }).lean();
    expect(legacy.analysisScore).toBe(report.score.overall);
    expect(legacy.analysisMethod).toBe("resume-intel-2.0");

    // Owner only
    const hidden = await request(app)
      .get(`/api/v1/resume-intel/analyses/${id}`)
      .set(auth(other));
    expect(hidden.status).toBe(404);

    // Same resume + job → reused, no new LLM calls
    const callsBefore = fakeAi.calls.length;
    const again = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: backendResume, jobDescription: backendJob });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ analysisId: id, reused: true });
    await queue.drain();
    expect(fakeAi.calls.length).toBe(callsBefore);

    const list = await request(app)
      .get("/api/v1/resume-intel/analyses")
      .set(auth(user));
    expect(list.body.analyses).toHaveLength(1);
    expect(list.body.analyses[0].score.overall).toBe(report.score.overall);
  });

  it("streams progress and completion over SSE", async () => {
    await goOnline();
    const user = await createUser("sse@test.com");
    const created = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: backendResume });
    await queue.drain();

    const res = await request(app)
      .get(`/api/v1/resume-intel/analyses/${created.body.analysisId}/events`)
      .set(auth(user))
      .buffer(true)
      .parse((response, callback) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => callback(null, body));
      });

    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(res.body).toMatch(/event: progress/);
    expect(res.body).toMatch(/event: done\ndata: \{"status":"completed"/);
  });

  it("flags and removes injected instructions", async () => {
    await goOnline();
    const user = await createUser("inject@test.com");
    const created = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: injectionResume });
    await queue.drain();

    const report = await ResumeReport.findById(created.body.analysisId).lean();
    expect(report.flags[0]).toMatchObject({
      type: "prompt_injection",
      severity: "high",
    });
  });

  it("validates input and enforces the daily limit", async () => {
    await goOnline();
    const user = await createUser("limits@test.com");

    const short = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: "hello" });
    expect(short.body.code).toBe("TOO_SHORT");

    const badJob = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: backendResume, jobId: "nope" });
    expect(badJob.body.code).toBe("INVALID_JOB");

    const badFile = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .attach("resume", Buffer.from("png"), {
        filename: "cv.png",
        contentType: "image/png",
      });
    expect(badFile.status).toBe(400);
    expect(badFile.body.code).toBe("UNSUPPORTED_FORMAT");

    process.env.RESUME_ANALYSES_PER_DAY = "1";
    try {
      const first = await request(app)
        .post("/api/v1/resume-intel/analyses")
        .set(auth(user))
        .send({ resumeText: backendResume });
      expect(first.status).toBe(202);
      const second = await request(app)
        .post("/api/v1/resume-intel/analyses")
        .set(auth(user))
        .send({ resumeText: `${backendResume}\nExtra line.` });
      expect(second.status).toBe(429);
      expect(second.body.code).toBe("DAILY_LIMIT");
    } finally {
      delete process.env.RESUME_ANALYSES_PER_DAY;
    }
  });

  it("lets owners delete reports", async () => {
    await goOnline();
    const user = await createUser("delete@test.com");
    const created = await request(app)
      .post("/api/v1/resume-intel/analyses")
      .set(auth(user))
      .send({ resumeText: backendResume });
    const id = created.body.analysisId;

    const del = await request(app)
      .delete(`/api/v1/resume-intel/analyses/${id}`)
      .set(auth(user));
    expect(del.status).toBe(200);
    expect(await ResumeReport.findById(id)).toBeNull();
    // The queued job finds nothing and finishes cleanly
    await queue.drain();
  });
});

describe("resume.analyze job handler", () => {
  it("marks the report failed with a friendly error on the final attempt", async () => {
    const report = await ResumeReport.create({
      userId: "64b000000000000000000001",
      pipelineVersion: "resume-intel-2.0",
      resumeText: backendResume,
      input: { source: "text", textHash: "h" },
      stages: [
        { id: "guard", label: "g" },
        { id: "structure", label: "s" },
      ],
    });
    const ai = makeFakeAi({
      "resume.extract": () => {
        throw new AiGatewayError("resume.extract", [
          { provider: "groq", model: "m", error: "429" },
        ]);
      },
    });
    const handler = createResumeAnalyzeHandler({ ai });
    const ctx = {
      attempt: 2,
      job: { maxAttempts: 2 },
      setProgress: async () => {},
    };

    await expect(handler({ reportId: report._id }, ctx)).rejects.toBeInstanceOf(
      AiGatewayError,
    );
    const saved = await ResumeReport.findById(report._id).lean();
    expect(saved.status).toBe("failed");
    expect(saved.error.code).toBe("AI_UNAVAILABLE");
    expect(saved.stages.find((s) => s.id === "structure").status).toBe(
      "failed",
    );
  });
});
