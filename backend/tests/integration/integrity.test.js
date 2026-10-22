import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { Interview } from "../../models/interview.model.js";
import { IntegritySession } from "../../models/integritySession.model.js";
import { IntegrityEvent } from "../../models/integrityEvent.model.js";
import { IntegrityEvidence } from "../../models/integrityEvidence.model.js";
import { BackgroundJob } from "../../models/backgroundJob.model.js";
import queue from "../../platform/queue/index.js";
import { setStorageAdminForTests } from "../../utils/supabase.js";
import { signBatch } from "../../modules/integrity/heartbeat.js";
import { subscribe } from "../../modules/integrity/live.js";
import {
  INTEGRITY_REPORT_JOB,
  INTEGRITY_EVIDENCE_PURGE_JOB,
  createIntegrityReportHandler,
  createEvidencePurgeHandler,
} from "../../jobs/integrity.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

let phone = 9600000000;
const createUser = (fields) =>
  User.create({ phoneNumber: String(phone++), password: "test-password", fullname: fields.role, ...fields });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

// Smallest valid-looking JPEG: SOI marker + padding
const JPEG = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 1, 2, 3]).toString("base64")}`;

const makeFakeStorage = () => {
  const objects = new Map();
  return {
    objects,
    from: (bucket) => ({
      upload: async (path, buffer) => {
        objects.set(`${bucket}/${path}`, buffer);
        return { data: { path }, error: null };
      },
      createSignedUrl: async (path, expiresIn) => ({
        data: { signedUrl: `https://signed.test/${bucket}/${path}?ttl=${expiresIn}` },
        error: null,
      }),
      remove: async ([path]) => {
        objects.delete(`${bucket}/${path}`);
        return { data: [], error: null };
      },
    }),
  };
};

describe("live-interview integrity", () => {
  let recruiter, colleague, outsider, candidate, interview, storage, aiCalls;
  const base = () => `/api/v1/integrity/${interview._id}`;

  beforeAll(() => BackgroundJob.syncIndexes());

  beforeEach(async () => {
    storage = makeFakeStorage();
    setStorageAdminForTests(storage);
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
    outsider = await createUser({ email: "o@other.test", role: "recruiter" });
    candidate = await createUser({ email: "s@test.com", role: "student" });
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

    aiCalls = [];
    queue.register(
      INTEGRITY_REPORT_JOB,
      createIntegrityReportHandler({
        ai: {
          run: async ({ schema, messages }) => {
            aiCalls.push(messages.at(-1).content);
            return {
              model: "fake-120b",
              data: schema.parse({
                summary: "A phone was detected twice, once confirmed by the interviewer's side.",
                observations: [
                  {
                    signal: "phone_detected",
                    observed: "Phone in view twice.",
                    strength: "moderate",
                    possibleBenignExplanations: ["Checking the time"],
                  },
                ],
                suggestedFollowUps: ["Ask the candidate to show their desk"],
              }),
            };
          },
        },
      }),
    );
    queue.register(INTEGRITY_EVIDENCE_PURGE_JOB, createEvidencePurgeHandler());
  });

  afterEach(() => setStorageAdminForTests(null));

  const consent = async () => {
    const res = await request(app).post(`${base()}/consent`).set(auth(candidate)).send({ accept: true });
    expect(res.status).toBe(200);
    return res.body.ingestKey;
  };

  const sendBatch = (key, seq, events = [], stats = { modelLoaded: true, fps: 5 }, sentAt = Date.now()) => {
    const batch = { seq, sentAt, events, stats };
    return request(app)
      .post(`${base()}/events`)
      .set(auth(candidate))
      .send({ ...batch, sig: signBatch(key, batch) });
  };

  it("hides the interview from everyone but its candidate and company", async () => {
    expect((await request(app).get(base()).set(auth(outsider))).status).toBe(404);
    const asCandidate = await request(app).get(base()).set(auth(candidate));
    expect(asCandidate.body).toMatchObject({ role: "candidate", status: "awaiting_consent" });
    expect(asCandidate.body.risk).toBeUndefined();
    const asColleague = await request(app).get(base()).set(auth(colleague));
    expect(asColleague.body.role).toBe("recruiter");
  });

  it("only takes events after consent, and only signed ones", async () => {
    const early = await sendBatch("not-issued-yet", 1);
    expect(early.status).toBe(409);
    expect(early.body.code).toBe("NO_CONSENT");

    const key = await consent();
    const forged = await sendBatch("someone-elses-key", 1, [{ type: "tab_hidden", startedAt: Date.now(), durationMs: 2000 }]);
    expect(forged.status).toBe(401);

    expect((await sendBatch(key, 1)).status).toBe(200);
    expect((await sendBatch(key, 1)).status).toBe(409); // replay

    // Recruiters can't post candidate events, candidates can't post verifier ones
    expect((await request(app).post(`${base()}/events`).set(auth(recruiter)).send({})).status).toBe(403);
    expect((await request(app).post(`${base()}/observations`).set(auth(candidate)).send({})).status).toBe(403);
  });

  it("scores debounced behavior and streams it to the recruiter", async () => {
    const key = await consent();
    const live = [];
    const unsubscribe = subscribe(String(interview._id), (payload) => live.push(payload));
    const now = Date.now();
    const res = await sendBatch(key, 1, [
      { type: "gaze_away", startedAt: now - 4000, durationMs: 1500, confidence: 0.9 }, // a glance: ignored
      { type: "phone_detected", startedAt: now - 3000, durationMs: 2500, confidence: 0.92 },
      { type: "phone_detected", startedAt: now - 1000, durationMs: 1000, confidence: 0.9 }, // cooldown
    ]);
    unsubscribe();
    expect(res.body).toMatchObject({ accepted: 3, nextSeq: 2 });

    const snapshot = await request(app).get(base()).set(auth(recruiter));
    expect(snapshot.body.risk.score).toBeGreaterThan(25);
    expect(snapshot.body.aggregates.phone_detected).toMatchObject({ occurrences: 2, counted: 1 });
    expect(snapshot.body.aggregates.gaze_away.counted).toBeUndefined();
    expect(snapshot.body.candidateDetector).toMatchObject({ alive: true, modelLoaded: true });
    expect(live).toEqual([
      expect.objectContaining({ kind: "update", alerts: [expect.objectContaining({ signal: "phone_detected" })] }),
    ]);
  });

  it("flags tampering separately from behavior", async () => {
    const key = await consent();
    await sendBatch(key, 1, [], { modelLoaded: true, cameraLabel: "OBS Virtual Camera", frameHash: "abc" });
    await sendBatch(key, 2, [], { modelLoaded: true, frameHash: "abc" });
    await sendBatch(key, 3, [], { modelLoaded: true, frameHash: "abc" });
    await sendBatch(key, 4, [], { modelLoaded: true, frameHash: "abc" });
    await sendBatch(key, 7, [], { modelLoaded: true, frameHash: "def" }); // 5 and 6 never arrived

    const { body } = await request(app).get(base()).set(auth(recruiter));
    expect(body.tamperFlags.map((t) => t.type).sort()).toEqual(
      ["frozen_video", "sequence_gap", "virtual_camera"].sort(),
    );
    expect(body.risk.score).toBe(0);
  });

  it("detects a heartbeat gap", async () => {
    const key = await consent();
    const t0 = Date.now() - 60_000;
    await sendBatch(key, 1, [], { modelLoaded: true }, t0);
    // Make the first batch look 60 s old
    await IntegritySession.updateOne({ interviewId: interview._id }, { "heartbeat.lastAt": new Date(t0) });
    await sendBatch(key, 2);
    const { body } = await request(app).get(base()).set(auth(recruiter));
    expect(body.tamperFlags).toEqual([expect.objectContaining({ type: "heartbeat_gap" })]);
  });

  it("cross-checks the recruiter-side detector against the candidate's", async () => {
    const key = await consent();
    const t = Date.now() - 60_000;
    await sendBatch(key, 1, [], { modelLoaded: true }, Date.now());
    await IntegritySession.updateOne(
      { interviewId: interview._id },
      { "heartbeat.firstAt": new Date(t - 10_000), startedAt: new Date(t - 10_000) },
    );
    // The recruiter's side sees a second face twice; the candidate's reported none
    const obs = await request(app)
      .post(`${base()}/observations`)
      .set(auth(recruiter))
      .send({
        events: [
          { type: "multiple_faces", startedAt: t, durationMs: 3000, confidence: 0.95 },
          { type: "multiple_faces", startedAt: t + 20_000, durationMs: 3000, confidence: 0.95 },
        ],
      });
    expect(obs.status).toBe(200);
    const { body } = await request(app).get(base()).set(auth(recruiter));
    expect(body.mismatches).toBe(2);
    expect(body.tamperFlags.map((f) => f.type)).toContain("detector_mismatch");
  });

  it("lets the recruiter mark a signal as expected (accommodation)", async () => {
    const key = await consent();
    await sendBatch(key, 1, [{ type: "gaze_away", startedAt: Date.now() - 9000, durationMs: 8000, confidence: 1 }]);
    const before = await request(app).get(base()).set(auth(recruiter));
    expect(before.body.risk.score).toBeGreaterThan(0);
    const res = await request(app)
      .post(`${base()}/annotations`)
      .set(auth(recruiter))
      .send({ signal: "gaze_away", expected: true, note: "Uses a screen reader" });
    expect(res.body.risk.score).toBe(0);
  });

  it("stores evidence privately and purges it on schedule", async () => {
    await consent();
    const bad = await request(app).post(`${base()}/evidence`).set(auth(candidate)).send({ image: "data:image/png;base64,AAAA", signal: "phone_detected" });
    expect(bad.status).toBe(400);

    const res = await request(app)
      .post(`${base()}/evidence`)
      .set(auth(candidate))
      .send({ image: JPEG, signal: "phone_detected", at: Date.now() });
    expect(res.status).toBe(201);
    expect(storage.objects.size).toBe(1);

    expect((await request(app).get(`${base()}/evidence/${res.body.evidenceId}`).set(auth(candidate))).status).toBe(403);
    const link = await request(app).get(`${base()}/evidence/${res.body.evidenceId}`).set(auth(recruiter));
    expect(link.status).toBe(302);
    expect(link.headers.location).toMatch(/^https:\/\/signed\.test\/integrity-evidence\/.+\?ttl=60$/);
    const json = await request(app)
      .get(`${base()}/evidence/${res.body.evidenceId}?format=json`)
      .set(auth(recruiter));
    expect(json.body.url).toBe(link.headers.location);

    // The purge job is scheduled 30 days out; run it now
    const purge = await BackgroundJob.findOne({ name: INTEGRITY_EVIDENCE_PURGE_JOB });
    expect(purge.runAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600_000);
    await BackgroundJob.updateOne({ _id: purge._id }, { runAt: new Date() });
    await queue.drain();
    expect(storage.objects.size).toBe(0);
    expect(await IntegrityEvidence.countDocuments()).toBe(0);
  });

  it("ends with the call and produces a grounded report the candidate can dispute", async () => {
    const key = await consent();
    const now = Date.now();
    await sendBatch(key, 1, [{ type: "phone_detected", startedAt: now - 3000, durationMs: 2500, confidence: 0.9 }]);
    await request(app)
      .post(`${base()}/observations`)
      .set(auth(recruiter))
      .send({ events: [{ type: "phone_detected", startedAt: now - 2500, durationMs: 2000, confidence: 0.9 }] });

    // Candidate sees no report (and no live state) during the call
    expect((await request(app).get(`${base()}/report`).set(auth(candidate))).status).toBe(404);

    const ended = await request(app).post(`/api/v1/interview/${interview._id}/video/end`).set(auth(recruiter));
    expect(ended.status).toBe(200);
    await queue.drain();

    const { body } = await request(app).get(`${base()}/report`).set(auth(recruiter));
    expect(body.status).toBe("ready");
    expect(body.report).toMatchObject({
      reviewPriority: "review",
      narrativeSource: "model",
      model: "fake-120b",
      observations: [expect.objectContaining({ signal: "phone_detected" })],
    });
    expect(body.report.facts.signals[0]).toMatchObject({ signal: "phone_detected", confirmedByRecruiterSide: true });
    expect(aiCalls[0]).not.toMatch(/base64|jpeg/i); // facts only, never media

    const own = await request(app).get(`${base()}/report`).set(auth(candidate));
    expect(own.body.report.reviewPriority).toBe("review");

    const dispute = await request(app)
      .post(`${base()}/disputes`)
      .set(auth(candidate))
      .send({ text: "I was checking the time on my phone when the interviewer asked." });
    expect(dispute.status).toBe(201);
    await queue.drain();
    expect(aiCalls).toHaveLength(2);
    expect(aiCalls[1]).toMatch(/checking the time/);

    // Monitoring is closed: late batches are refused
    expect((await sendBatch(key, 2)).body.code).toBe("SESSION_ENDED");
    expect(await IntegrityEvent.countDocuments({ kind: "behavior" })).toBe(2);
  });
});
