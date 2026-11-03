import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { InterviewScorecard } from "../../models/interviewScorecard.model.js";
import { TranscriptSegment } from "../../models/transcriptSegment.model.js";
import { BackgroundJob } from "../../models/backgroundJob.model.js";
import queue from "../../platform/queue/index.js";
import { setTranscriberForTests } from "../../modules/copilot/transcribe.js";
import { COPILOT_SCORECARD_JOB, COPILOT_REFRESH_JOB, COPILOT_DRAFT_JOB, createCopilotHandlers } from "../../jobs/copilot.js";

let phone = 9900000000;
const createUser = (fields) =>
  User.create({ phoneNumber: String(phone++), password: "test-password", fullname: fields.role, ...fields });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});
const AUDIO = Buffer.alloc(4096, 1);

const COMPETENCIES = [
  {
    id: "c1",
    requirementId: "req_1",
    title: "Node.js services",
    description: "Builds and runs Node.js APIs.",
    kind: "must",
    probes: ["Tell me about a Node.js service you owned."],
    rubric: { 1: "none", 2: "some", 3: "meets", 4: "exceeds" },
  },
  {
    id: "c2",
    requirementId: "req_2",
    title: "PostgreSQL",
    description: "Designs and tunes schemas.",
    kind: "must",
    probes: ["Describe a slow query you fixed."],
    rubric: { 1: "none", 2: "some", 3: "meets", 4: "exceeds" },
  },
];

describe("interview copilot API", () => {
  let recruiter, outsider, candidate, interview, whisperText, aiCalls;

  beforeAll(() => BackgroundJob.syncIndexes());

  beforeEach(async () => {
    whisperText = "At Shipfast I moved our order API to a queue and cut p95 latency from 900ms to 120ms.";
    setTranscriberForTests(async () => ({
      text: whisperText,
      segments: [{ start: 0.4, end: 6.2, text: ` ${whisperText}`, no_speech_prob: 0.02, avg_logprob: -0.2 }],
    }));
    aiCalls = [];
    const handlers = createCopilotHandlers({
      ai: null,
      generate: async () => ({ competencies: COMPETENCIES, source: "model" }),
      run: async (ai, { competencies, segments }) => {
        aiCalls.push("live");
        const s = segments.find((x) => x.speaker === "candidate");
        return {
          competencies: competencies.map((c) =>
            c.id === "c1"
              ? { ...c, coverage: { status: "covered", evidence: [{ segmentId: String(s._id), quote: "cut p95 latency" }] } }
              : c,
          ),
          followUps: [{ competencyId: "c2", question: "Describe a slow query you fixed.", reason: "PostgreSQL isn't covered yet" }],
          source: "model",
        };
      },
      draft: async (ai, { competencies }) => {
        aiCalls.push("draft");
        return {
          model: "fake-120b",
          competencies: competencies.map((c) => ({
            ...c,
            aiDraft: c.id === "c1" ? { rating: 4, rationale: "Concrete result.", evidence: [] } : { rationale: "Not discussed.", evidence: [] },
          })),
        };
      },
    });
    queue.register(COPILOT_SCORECARD_JOB, handlers.scorecard);
    queue.register(COPILOT_REFRESH_JOB, handlers.refresh);
    queue.register(COPILOT_DRAFT_JOB, handlers.draft);

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
    outsider = await createUser({ email: "o@other.test", role: "recruiter" });
    candidate = await createUser({ email: "s@test.com", role: "student" });
    const job = await Job.create({
      title: "Backend Engineer",
      description: "Build APIs with Node.js and PostgreSQL for our platform.",
      requirements: ["Node.js", "PostgreSQL"],
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

  afterEach(() => setTranscriberForTests(null));

  const base = () => `/api/v1/copilot/${interview._id}`;
  const consent = () =>
    request(app).post(`/api/v1/integrity/${interview._id}/consent`).set(auth(candidate)).send({ accept: true });
  const upload = (user, seq, { type = "audio/webm;codecs=opus", body = AUDIO, startedAt = Date.now() - 15_000 } = {}) =>
    request(app)
      .post(`${base()}/audio`)
      .set(auth(user))
      .set("Content-Type", type)
      .set("x-chunk-seq", String(seq))
      .set("x-chunk-started-at", String(startedAt))
      .send(body);

  const readyScorecard = async () => {
    await request(app).get(base()).set(auth(recruiter)); // creates + queues it
    await queue.drain();
  };

  it("builds the scorecard on first open, for the interview's recruiter only", async () => {
    expect((await request(app).get(base()).set(auth(outsider))).status).toBe(404);
    expect((await request(app).get(base()).set(auth(candidate))).status).toBe(403);
    const first = await request(app).get(base()).set(auth(recruiter));
    expect(first.body.scorecard.status).toBe("generating");
    await queue.drain();
    const ready = await request(app).get(base()).set(auth(recruiter));
    expect(ready.body.scorecard).toMatchObject({ status: "ready", source: "model" });
    expect(ready.body.scorecard.competencies.map((c) => c.title)).toEqual(["Node.js services", "PostgreSQL"]);
  });

  it("transcribes only after the candidate consents", async () => {
    const before = await upload(candidate, 0);
    expect(before.status).toBe(409);
    expect(before.body.code).toBe("NO_CONSENT");
    await consent();
    const res = await upload(candidate, 0);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, segments: 1 }); // no text echoed to the candidate
    const [segment] = await TranscriptSegment.find().lean();
    expect(segment).toMatchObject({ speaker: "candidate", text: whisperText, chunkSeq: 0 });
  });

  it("rejects non-audio and empty uploads, and doesn't duplicate a retried chunk", async () => {
    await consent();
    expect((await upload(candidate, 0, { type: "audio/x-unknown" })).status).toBe(415);
    expect((await upload(candidate, 0, { body: Buffer.alloc(10) })).status).toBe(400);
    expect((await upload(candidate, 1, { startedAt: Date.now() - 3600_000 })).status).toBe(400);
    await upload(candidate, 3);
    await upload(candidate, 3);
    expect(await TranscriptSegment.countDocuments()).toBe(1);
  });

  it("labels each side by who uploaded it", async () => {
    await consent();
    whisperText = "Tell me about a Node.js service you owned.";
    await upload(recruiter, 0);
    const { body } = await request(app).get(base()).set(auth(recruiter));
    expect(body.transcript).toEqual([expect.objectContaining({ speaker: "recruiter", text: whisperText })]);
  });

  it("refreshes coverage and follow-ups after candidate speech, without clobbering ratings", async () => {
    await readyScorecard();
    await consent();
    await upload(candidate, 0);
    // The recruiter rates while the copilot job is pending
    await request(app).put(`${base()}/competencies/c1/rating`).set(auth(recruiter)).send({ value: 3, notes: "solid" });
    const job = await BackgroundJob.findOne({ name: COPILOT_REFRESH_JOB });
    expect(job).toBeTruthy();
    await queue.drain();

    const { body } = await request(app).get(base()).set(auth(recruiter));
    const [c1, c2] = body.scorecard.competencies;
    expect(c1.coverage.status).toBe("covered");
    expect(c1.rating).toMatchObject({ value: 3, notes: "solid" });
    expect(c2.coverage.status).toBe("not_covered");
    expect(body.scorecard.suggestions).toEqual([
      expect.objectContaining({ competencyId: "c2", question: "Describe a slow query you fixed." }),
    ]);

    // Nothing new said: a manual refresh doesn't re-run the model
    await request(app).post(`${base()}/refresh`).set(auth(recruiter));
    await queue.drain();
    expect(aiCalls.filter((c) => c === "live")).toHaveLength(1);
  });

  it("validates ratings and the overall recommendation", async () => {
    await readyScorecard();
    expect((await request(app).put(`${base()}/competencies/c1/rating`).set(auth(recruiter)).send({ value: 7 })).status).toBe(400);
    expect((await request(app).put(`${base()}/competencies/zz/rating`).set(auth(recruiter)).send({ value: 2 })).status).toBe(404);
    expect((await request(app).put(`${base()}/competencies/c1/rating`).set(auth(candidate)).send({ value: 4 })).status).toBe(403);
    expect((await request(app).put(`${base()}/overall`).set(auth(recruiter)).send({ recommendation: "maybe" })).status).toBe(400);
    const ok = await request(app).put(`${base()}/overall`).set(auth(recruiter)).send({ recommendation: "yes", notes: "Strong backend" });
    expect(ok.status).toBe(200);
    const card = await InterviewScorecard.findOne().lean();
    expect(card.overall).toMatchObject({ recommendation: "yes", notes: "Strong backend" });
  });

  it("drafts ratings when the call ends, for the recruiter to review", async () => {
    await readyScorecard();
    await consent();
    await upload(candidate, 0);
    await request(app).post(`/api/v1/interview/${interview._id}/video/end`).set(auth(recruiter));
    await queue.drain();
    const { body } = await request(app).get(base()).set(auth(recruiter));
    expect(body.scorecard.draft).toMatchObject({ status: "ready", model: "fake-120b" });
    expect(body.scorecard.competencies[0].aiDraft).toMatchObject({ rating: 4 });
    expect(body.scorecard.competencies[0].rating?.value).toBeUndefined(); // never auto-applied
    // Transcription stops with the call
    expect((await upload(candidate, 5)).body.code).toBe("NO_CONSENT");
  });
});
