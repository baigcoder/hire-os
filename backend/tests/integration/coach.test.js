import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { ResumeReport } from "../../models/resumeReport.model.js";
import { CoachConversation } from "../../models/coachConversation.model.js";
import { setGatewayForTests } from "../../platform/ai-gateway/index.js";
import { AiGatewayError } from "../../platform/ai-gateway/gateway.js";
import { runResumePipeline } from "../../modules/resume-intel/pipeline.js";
import {
  backendExtraction,
  backendRequirements,
  backendMatches,
  backendCritique,
} from "../fixtures/resumeIntelOutputs.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

const resumeText = fs.readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../evals/resume-intel/fixtures/resumes/backend_mid.txt",
  ),
  "utf8",
);

const pipelineAi = {
  run: async ({ task, schema }) => {
    const data = {
      "resume.extract": backendExtraction,
      "resume.requirements": backendRequirements,
      "resume.match": backendMatches,
      "resume.critique": backendCritique,
    }[task];
    return {
      data: schema.parse(data),
      content: "",
      model: "fake",
      provider: "groq",
      degraded: false,
      usage: {},
    };
  },
};

/** Fake gateway for coach turns; `script` maps call index → response. */
const installCoachAi = (script) => {
  const calls = [];
  setGatewayForTests({
    run: async (options) => {
      calls.push(options);
      const next = script(calls.length - 1, options);
      if (next instanceof Error) throw next;
      return {
        content: "",
        toolCalls: [],
        model: "openai/gpt-oss-120b",
        ...next,
      };
    },
    limiterSnapshot: () => ({}),
  });
  return calls;
};

let phone = 9600000000;
const createUser = (email) =>
  User.create({
    fullname: email,
    email,
    phoneNumber: String(phone++),
    password: "test-password",
    role: "student",
  });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("Resume Coach API", () => {
  let owner, other, report;

  beforeAll(() => Job.syncIndexes());

  beforeEach(async () => {
    owner = await createUser("coach-owner@test.com");
    other = await createUser("coach-other@test.com");
    const result = await runResumePipeline({
      ai: pipelineAi,
      text: resumeText,
      textHash: "h",
      job: {
        text: "Backend Engineer, Node.js, PostgreSQL, Kubernetes",
        title: "Backend Engineer",
      },
    });
    report = await ResumeReport.create({
      userId: owner._id,
      status: "completed",
      pipelineVersion: "resume-intel-2.0",
      resumeText,
      input: { source: "text", textHash: "h" },
      ...result,
    });
    await Job.create({
      title: "Node.js Platform Engineer",
      description:
        "Own our Node.js services and PostgreSQL data platform end to end.",
      skills: ["Node.js", "PostgreSQL"],
      salary: 1,
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: 3,
      position: 1,
      company: owner._id,
      created_by: owner._id,
    });
  });

  afterEach(() => setGatewayForTests(null));

  const coachUrl = () => `/api/v1/resume-intel/analyses/${report._id}/coach`;

  it("answers with tool results, persists the chat and sends history next time", async () => {
    const calls = installCoachAi(
      (i) =>
        [
          {
            toolCalls: [
              {
                id: "t1",
                name: "search_jobs",
                arguments: '{"query":"Node.js PostgreSQL"}',
              },
            ],
          },
          { content: "You fit **Node.js Platform Engineer** well." },
          { content: "Second answer." },
        ][i],
    );

    const res = await request(app)
      .post(coachUrl())
      .set(auth(owner))
      .send({ message: "Find jobs for me" });
    expect(res.status).toBe(200);
    expect(res.body.reply.content).toBe(
      "You fit **Node.js Platform Engineer** well.",
    );
    expect(res.body.reply.trace).toEqual([
      {
        tool: "search_jobs",
        summary: "Searched jobs for “Node.js PostgreSQL” (1 found)",
      },
    ]);
    const toolResult = JSON.parse(
      calls[1].messages.find((m) => m.role === "tool").content,
    );
    expect(toolResult.jobs[0].title).toBe("Node.js Platform Engineer");

    // The report's resume text reaches the tools (what-if), never the client
    expect(JSON.stringify(res.body)).not.toMatch(/Parcelwise/);

    await request(app)
      .post(coachUrl())
      .set(auth(owner))
      .send({ message: "And now?" });
    const history = calls[2].messages.map((m) => m.content);
    expect(history).toEqual(
      expect.arrayContaining([
        "Find jobs for me",
        "You fit **Node.js Platform Engineer** well.",
        "And now?",
      ]),
    );

    const stored = await request(app).get(coachUrl()).set(auth(owner));
    expect(stored.body.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
  });

  it("enforces ownership, readiness, input limits and the daily cap", async () => {
    installCoachAi(() => ({ content: "ok" }));

    expect(
      (
        await request(app)
          .post(coachUrl())
          .set(auth(other))
          .send({ message: "hi" })
      ).status,
    ).toBe(404);
    expect((await request(app).get(coachUrl()).set(auth(other))).status).toBe(
      404,
    );
    expect(
      (
        await request(app)
          .post(coachUrl())
          .set(auth(owner))
          .send({ message: "  " })
      ).body.code,
    ).toBe("EMPTY_MESSAGE");
    expect(
      (
        await request(app)
          .post(coachUrl())
          .set(auth(owner))
          .send({ message: "x".repeat(1001) })
      ).body.code,
    ).toBe("MESSAGE_TOO_LONG");

    await ResumeReport.updateOne({ _id: report._id }, { status: "running" });
    expect(
      (
        await request(app)
          .post(coachUrl())
          .set(auth(owner))
          .send({ message: "hi" })
      ).status,
    ).toBe(409);
    await ResumeReport.updateOne({ _id: report._id }, { status: "completed" });

    process.env.COACH_MESSAGES_PER_DAY = "1";
    try {
      expect(
        (
          await request(app)
            .post(coachUrl())
            .set(auth(owner))
            .send({ message: "one" })
        ).status,
      ).toBe(200);
      const capped = await request(app)
        .post(coachUrl())
        .set(auth(owner))
        .send({ message: "two" });
      expect(capped.status).toBe(429);
      expect(capped.body.code).toBe("DAILY_LIMIT");
    } finally {
      delete process.env.COACH_MESSAGES_PER_DAY;
    }
  });

  it("returns 503 when the AI is unavailable and keeps nothing", async () => {
    installCoachAi(
      () =>
        new AiGatewayError("coach.turn", [
          { provider: "groq", model: "m", error: "429" },
        ]),
    );
    const res = await request(app)
      .post(coachUrl())
      .set(auth(owner))
      .send({ message: "hi" });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("AI_UNAVAILABLE");
    expect(await CoachConversation.countDocuments()).toBe(0);
  });

  it("clears the chat on reset and when the analysis is deleted", async () => {
    installCoachAi(() => ({ content: "ok" }));
    await request(app)
      .post(coachUrl())
      .set(auth(owner))
      .send({ message: "hi" });
    expect(await CoachConversation.countDocuments()).toBe(1);

    await request(app).delete(coachUrl()).set(auth(owner));
    expect(await CoachConversation.countDocuments()).toBe(0);

    await request(app)
      .post(coachUrl())
      .set(auth(owner))
      .send({ message: "hi again" });
    await request(app)
      .delete(`/api/v1/resume-intel/analyses/${report._id}`)
      .set(auth(owner));
    expect(await CoachConversation.countDocuments()).toBe(0);
  });
});
