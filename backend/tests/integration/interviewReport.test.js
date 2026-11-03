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
import { setGatewayForTests } from "../../platform/ai-gateway/index.js";

let phone = 9910000000;
const createUser = (fields) =>
  User.create({ phoneNumber: String(phone++), password: "test-password", fullname: fields.role, ...fields });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("evidence-based report and CEO approval", () => {
  let ceo, recruiter, candidate, interview, application, aiCalls;

  beforeEach(async () => {
    aiCalls = [];
    setGatewayForTests({
      run: async ({ task, schema, messages }) => {
        aiCalls.push({ task, content: messages.at(-1).content });
        const seg = await TranscriptSegment.findOne({ speaker: "candidate" }).lean();
        return {
          model: "fake-120b",
          data: schema.parse({
            summary: "Solid backend candidate with one gap in PostgreSQL.",
            strengths: [{ competencyId: "c1", text: "Owned a high-traffic Node.js API.", evidence: [{ segmentId: String(seg._id), quote: "cut p95 latency" }] }],
            concerns: [{ competencyId: "c2", text: "Limited PostgreSQL tuning." }],
            nextSteps: ["Short follow-up on PostgreSQL."],
          }),
        };
      },
    });

    ceo = await createUser({ email: "ceo@acme.test", role: "company_admin" });
    const company = await Company.create({
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: ceo._id,
    });
    await User.updateOne({ _id: ceo._id }, { companyId: company._id });
    recruiter = await createUser({ email: "r@acme.test", role: "recruiter", companyId: company._id });
    candidate = await createUser({ email: "s@test.com", role: "student", fullname: "Sam Candidate" });
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
    application = await Application.create({ job: job._id, applicant: candidate._id });
    interview = await Interview.create({
      applicationId: application._id,
      jobId: job._id,
      companyId: company._id,
      studentId: candidate._id,
      recruiterId: recruiter._id,
      scheduledAt: new Date(),
      mcqTest: { totalQuestions: 10, correctAnswers: 8 },
    });
    await TranscriptSegment.create({
      interviewId: interview._id,
      speaker: "candidate",
      userId: candidate._id,
      chunkSeq: 0,
      index: 0,
      startedAt: new Date(),
      endedAt: new Date(),
      text: "I owned the order API and cut p95 latency from 900ms to 120ms.",
    });
    await InterviewScorecard.create({
      interviewId: interview._id,
      status: "ready",
      competencies: [
        { id: "c1", title: "Node.js services", kind: "must", rubric: { 1: "a", 2: "b", 3: "c", 4: "d" } },
        { id: "c2", title: "PostgreSQL", kind: "must", rubric: { 1: "a", 2: "b", 3: "c", 4: "d" } },
      ],
    });
  });

  afterEach(() => setGatewayForTests(null));

  const base = () => `/api/v1/interview/${interview._id}`;
  const rate = (cid, value) =>
    request(app).put(`/api/v1/copilot/${interview._id}/competencies/${cid}/rating`).set(auth(recruiter)).send({ value });
  const overall = (recommendation) =>
    request(app).put(`/api/v1/copilot/${interview._id}/overall`).set(auth(recruiter)).send({ recommendation });

  it("builds the report from the scorecard, with no invented sub-scores", async () => {
    await rate("c1", 4);
    await rate("c2", 2);
    await overall("yes");
    const res = await request(app).post(`${base()}/report/generate`).set(auth(recruiter)).send({ recruiterNotes: "Good call" });
    expect(res.status).toBe(200);
    const saved = (await Interview.findById(interview._id).lean()).finalReport;
    expect(saved).toMatchObject({ status: "draft", overallScore: 67, aiRecommendation: "RECOMMEND", version: "interview-report-2" });
    expect(saved.cultureFitScore).toBeUndefined();
    expect(saved.communicationScore).toBeUndefined();
    expect(saved.structured).toMatchObject({
      recommendationSource: "recruiter",
      narrativeSource: "model",
      facts: { mcq: { percentage: 80 }, scorecard: { rated: 2, total: 2 } },
    });
    expect(saved.structured.strengths[0].evidence[0].quote).toBe("cut p95 latency");
    expect(aiCalls[0].content).toContain("Good call");
  });

  it("won't send an incomplete or outdated scorecard to the CEO", async () => {
    await rate("c1", 4);
    await request(app).post(`${base()}/report/generate`).set(auth(recruiter));
    const incomplete = await request(app).post(`${base()}/report/send-to-ceo`).set(auth(recruiter));
    expect(incomplete.status).toBe(409);
    expect(incomplete.body.code).toBe("SCORECARD_INCOMPLETE");
    expect(incomplete.body.gaps.map((g) => g.type)).toEqual(["unrated_must", "no_overall"]);

    await rate("c2", 3);
    await overall("yes");
    const stale = await request(app).post(`${base()}/report/send-to-ceo`).set(auth(recruiter));
    expect(stale.body.code).toBe("REPORT_STALE");

    await request(app).post(`${base()}/report/generate`).set(auth(recruiter));
    const sent = await request(app).post(`${base()}/report/send-to-ceo`).set(auth(recruiter));
    expect(sent.status).toBe(200);
    expect((await Application.findById(application._id)).status).toBe("pending_ceo_approval");
    // Locked once sent
    expect((await request(app).post(`${base()}/report/generate`).set(auth(recruiter))).status).toBe(409);
  });

  it("only lets the CEO decide on a submitted report; on hold stays in the queue", async () => {
    const early = await request(app).post(`${base()}/ceo/decision`).set(auth(ceo)).send({ decision: "approved" });
    expect(early.status).toBe(409);

    await rate("c1", 4);
    await rate("c2", 3);
    await overall("strong_yes");
    await request(app).post(`${base()}/report/generate`).set(auth(recruiter));
    await request(app).post(`${base()}/report/send-to-ceo`).set(auth(recruiter));

    expect((await request(app).post(`${base()}/ceo/decision`).set(auth(recruiter)).send({ decision: "approved" })).status).toBe(403);

    await request(app).post(`${base()}/ceo/decision`).set(auth(ceo)).send({ decision: "on_hold", comments: "Check references" });
    const queue = await request(app).get("/api/v1/interview/ceo/pending-reports").set(auth(ceo));
    expect(queue.body.reports).toHaveLength(1);
    expect(queue.body.reports[0].report).toMatchObject({ onHold: true, structured: expect.objectContaining({ recommendation: "STRONGLY_RECOMMEND" }) });

    const approved = await request(app).post(`${base()}/ceo/decision`).set(auth(ceo)).send({ decision: "approved" });
    expect(approved.status).toBe(200);
    expect((await Application.findById(application._id)).status).toBe("offer_pending");
    expect((await request(app).post(`${base()}/ceo/decision`).set(auth(ceo)).send({ decision: "rejected" })).status).toBe(409);
  });

  it("lets the company owner open the interview, and hides the hiring report from the candidate", async () => {
    await rate("c1", 4);
    await rate("c2", 3);
    await overall("yes");
    await request(app).post(`${base()}/report/generate`).set(auth(recruiter)).send({ recruiterNotes: "Internal note" });

    const asCeo = await request(app).get(base()).set(auth(ceo));
    expect(asCeo.status).toBe(200);
    expect(asCeo.body.interview.finalReport.structured.recommendation).toBe("RECOMMEND");

    const asCandidate = await request(app).get(base()).set(auth(candidate));
    expect(asCandidate.status).toBe(200);
    expect(asCandidate.body.interview.finalReport).toBeUndefined();
    expect(JSON.stringify(asCandidate.body)).not.toContain("Internal note");

    const outsider = await createUser({ email: "x@other.test", role: "company_admin" });
    expect((await request(app).get(base()).set(auth(outsider))).status).toBe(403);
  });

  it("no longer offers a way around the CEO's approval", async () => {
    const res = await request(app).post(`${base()}/report/submit`).set(auth(recruiter)).send({ recommendation: "strong_hire" });
    expect(res.status).toBe(404);
    expect((await Application.findById(application._id)).status).not.toBe("offer_pending");
  });
});
