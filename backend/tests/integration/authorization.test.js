/**
 * Regression tests for the role/ownership audit (S13–S19): each case is a
 * request that used to succeed for the wrong caller.
 */
import crypto from "crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Company } from "../../models/company.model.js";
import { TalentPool } from "../../models/talentPool.model.js";
import { Message } from "../../models/message.model.js";
import { Referral } from "../../models/referral.model.js";
import { Assessment } from "../../models/assessment.model.js";
import { setSessionVerifierForTests } from "../../utils/supabase.js";
import {
  getPendingTransaction,
  setPendingTransactionForTests,
} from "../../controllers/paddle.controller.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

let phone = 9500000000;
const createUser = (fields) =>
  User.create({
    phoneNumber: String(phone++),
    password: "test-password",
    fullname: fields.role,
    ...fields,
  });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

const createCompany = async (name, admin) => {
  const company = await Company.create({
    name,
    email: `hr@${name.toLowerCase()}.test`,
    description: `${name} builds software for a living, at scale.`,
    website: `https://${name.toLowerCase()}.test`,
    location: "Remote",
    adminUser: admin._id,
  });
  await User.updateOne({ _id: admin._id }, { companyId: company._id });
  admin.companyId = company._id;
  return company;
};

describe("S13 supabase-sync trusts only a verified Supabase session", () => {
  afterEach(() => setSessionVerifierForTests(null));

  it("rejects a request without a valid access token", async () => {
    setSessionVerifierForTests(async () => null);
    const res = await request(app)
      .post("/api/v1/user/supabase-sync")
      .send({ email: "victim@test.com", supabaseId: "attacker" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_SUPABASE_SESSION");
  });

  it("won't link an unconfirmed identity to an existing account", async () => {
    await createUser({ email: "victim@test.com", role: "student" });
    setSessionVerifierForTests(async () => ({
      id: "new-supabase-id",
      email: "victim@test.com",
      emailConfirmed: false,
      provider: "email",
    }));
    const res = await request(app)
      .post("/api/v1/user/supabase-sync")
      .send({ accessToken: "a-supabase-access-token-for-tests" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NOT_CONFIRMED");
  });
});

describe("S14 change-initial-password needs the account's own session", () => {
  it("rejects an anonymous caller", async () => {
    const res = await request(app)
      .post("/api/v1/user/change-initial-password")
      .send({ email: "someone@test.com", newPassword: "N3w-password!" });
    expect(res.status).toBe(401);
  });
});

describe("S18 recruiter resources stay inside their company", () => {
  let ownerA, ownerB, companyA;

  beforeEach(async () => {
    ownerA = await createUser({ email: "a@a.test", role: "recruiter" });
    ownerB = await createUser({ email: "b@b.test", role: "recruiter" });
    companyA = await createCompany("Alpha", ownerA);
    await createCompany("Beta", ownerB);
  });

  it("hides another company's talent pool", async () => {
    const pool = await TalentPool.create({
      company: companyA._id,
      createdBy: ownerA._id,
      name: "Backend",
    });
    const theirs = await request(app)
      .get(`/api/v1/talent-pools/${pool._id}`)
      .set(auth(ownerB));
    expect(theirs.status).toBe(404);
    const removed = await request(app)
      .delete(`/api/v1/talent-pools/${pool._id}`)
      .set(auth(ownerB));
    expect(removed.status).toBe(404);
    expect(await TalentPool.exists({ _id: pool._id })).toBeTruthy();
  });

  it("keeps students out of talent pools entirely", async () => {
    const student = await createUser({ email: "s@s.test", role: "student" });
    const res = await request(app)
      .get("/api/v1/talent-pools")
      .set(auth(student));
    expect(res.status).toBe(403);
  });

  it("won't let another company assign its assessment", async () => {
    const assessment = await Assessment.create({
      company: companyA._id,
      createdBy: ownerA._id,
      title: "Node basics",
      type: "mcq",
      duration: 30,
    });
    const student = await createUser({ email: "s@s.test", role: "student" });
    const res = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/assign`)
      .set(auth(ownerB))
      .send({ candidateId: student._id.toString() });
    expect(res.status).toBe(403);
  });

  it("won't let a company owner edit another company", async () => {
    const res = await request(app)
      .put(`/api/v1/company/update/${companyA._id}`)
      .set(auth(ownerB))
      .send({ name: "Hijacked" });
    expect([403, 404]).toContain(res.status);
    expect((await Company.findById(companyA._id)).name).toBe("Alpha");
  });
});

describe("S18 platform-admin actions", () => {
  it("lets only super admins mark referrals rewarded", async () => {
    const recruiter = await createUser({ email: "r@r.test", role: "recruiter" });
    const referral = await Referral.create({
      referrer: recruiter._id,
      code: "ABC123",
    });
    const denied = await request(app)
      .put(`/api/v1/referral/reward/${referral._id}`)
      .set(auth(recruiter))
      .send({ amount: 100000 });
    expect(denied.status).toBe(403);

    const admin = await createUser({ email: "x@x.test", role: "super_admin" });
    const allowed = await request(app)
      .put(`/api/v1/referral/reward/${referral._id}`)
      .set(auth(admin))
      .send({ amount: 50 });
    expect(allowed.status).toBe(200);
  });

  it("applies a referral code to the caller, not a body userId", async () => {
    const referrer = await createUser({ email: "r@r.test", role: "student" });
    await Referral.create({ referrer: referrer._id, code: "JOINME" });
    const anon = await request(app)
      .post("/api/v1/referral/apply")
      .send({ code: "JOINME", userId: referrer._id.toString() });
    expect(anon.status).toBe(401);

    const newcomer = await createUser({ email: "n@n.test", role: "student" });
    const res = await request(app)
      .post("/api/v1/referral/apply")
      .set(auth(newcomer))
      .send({ code: "JOINME" });
    expect(res.status).toBe(200);
    const referral = await Referral.findOne({ code: "JOINME" });
    expect(String(referral.referee)).toBe(String(newcomer._id));
  });

  it("lets only the recipient reply to a message", async () => {
    const sender = await createUser({ email: "a@a.test", role: "recruiter" });
    const receiver = await createUser({ email: "b@b.test", role: "student" });
    const outsider = await createUser({ email: "c@c.test", role: "student" });
    const original = await Message.create({
      senderId: sender._id,
      senderRole: "recruiter",
      receiverId: receiver._id,
      receiverRole: "student",
      subject: "Offer details",
      content: "Private",
    });
    const denied = await request(app)
      .post(`/api/v1/message/reply/${original._id}`)
      .set(auth(outsider))
      .send({ content: "hi" });
    expect(denied.status).toBe(404);
    const allowed = await request(app)
      .post(`/api/v1/message/reply/${original._id}`)
      .set(auth(receiver))
      .send({ content: "thanks" });
    expect(allowed.status).toBe(201);
  });
});

describe("S16/S19 Paddle payments", () => {
  const SECRET = "whsec_test";
  const sign = (body, ts = Math.floor(Date.now() / 1000)) =>
    `ts=${ts};h1=${crypto.createHmac("sha256", SECRET).update(`${ts}:${body}`).digest("hex")}`;

  beforeEach(() => {
    process.env.PADDLE_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.PADDLE_WEBHOOK_SECRET;
  });

  it("prices the plan on the server", async () => {
    const bad = await request(app)
      .post("/api/v1/paddle/initiate")
      .send({ planId: "platinum", billingCycle: "monthly" });
    expect(bad.status).toBe(400);

    const res = await request(app)
      .post("/api/v1/paddle/initiate")
      .send({
        planId: "basic",
        billingCycle: "monthly",
        paddlePriceId: "pri_attacker_choice",
      });
    expect(res.status).toBe(200);
    expect(res.body.paddlePriceId).not.toBe("pri_attacker_choice");
  });

  it("rejects an unsigned webhook", async () => {
    const body = JSON.stringify({ event_type: "transaction.completed", data: {} });
    const res = await request(app)
      .post("/api/v1/paddle/webhook")
      .set("Content-Type", "application/json")
      .set("paddle-signature", "ts=1;h1=deadbeef")
      .send(body);
    expect(res.status).toBe(401);
  });

  it("won't complete a payment made with another plan's price", async () => {
    setPendingTransactionForTests("TXN_1", {
      planId: "enterprise",
      billingCycle: "monthly",
      paddlePriceId: "pri_enterprise",
      createdAt: new Date(),
      status: "pending",
    });
    const body = JSON.stringify({
      event_type: "transaction.completed",
      data: {
        id: "txn_paddle_1",
        custom_data: { transactionRef: "TXN_1" },
        items: [{ price: { id: "pri_basic" } }],
      },
    });
    const res = await request(app)
      .post("/api/v1/paddle/webhook")
      .set("Content-Type", "application/json")
      .set("paddle-signature", sign(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(getPendingTransaction("TXN_1").status).toBe("price_mismatch");
  });
});
