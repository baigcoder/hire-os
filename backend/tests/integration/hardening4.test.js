/**
 * Regression tests for the last hardening items: per-user AI budget, shared session stores,
 * private presence, vector-search fallback and token/secret enforcement.
 */
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Company } from "../../models/company.model.js";
import { createUserBudget, UserBudgetError } from "../../platform/ai-gateway/userBudget.js";
import { createSessionStore } from "../../utils/sessionStore.js";
import mongoose from "mongoose";
import { Embedding } from "../../models/embedding.model.js";
import { searchSimilar } from "../../platform/embeddings/index.js";
import { EMBEDDING_MODEL } from "../../config/aiModels.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

let phone = 9800000000;
const createUser = async (fields) =>
  User.create({
    phoneNumber: String(phone++),
    password: await bcrypt.hash("Passw0rd!x", 4),
    fullname: fields.role,
    ...fields,
  });
const bearer = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("per-user AI budget", () => {
  it("limits calls per minute and tokens per day for one user, not others", async () => {
    let now = 1_000_000_000_000;
    const budget = createUserBudget({ callsPerMinute: () => 3, tokensPerDay: () => 1000, now: () => now });
    for (let i = 0; i < 3; i++) await budget.charge("u1", 10);
    await expect(budget.charge("u1", 10)).rejects.toBeInstanceOf(UserBudgetError);
    await budget.charge("u2", 10); // another user is unaffected
    now += 61_000; // next minute
    await budget.charge("u1", 10);
    await expect(budget.charge("u1", 5000)).rejects.toMatchObject({ status: 429 });
    await budget.charge(null, 99999); // server-initiated work isn't charged to anyone
  });
});

describe("shared session store", () => {
  it("stores, reads, expires and deletes sessions", async () => {
    const store = createSessionStore("test", 1);
    await store.set("a", { n: 1 });
    expect(await store.get("a")).toEqual({ n: 1 });
    await store.delete("a");
    expect(await store.get("a")).toBeUndefined();
    await store.set("b", { n: 2 });
    await new Promise((r) => setTimeout(r, 1100));
    expect(await store.get("b")).toBeUndefined();
  });
});

describe("presence without a public channel", () => {
  it("shows only the caller's own contacts, and only when they are recently active", async () => {
    const owner = await createUser({ email: "owner@pr.test", role: "company_admin" });
    const company = await Company.create({
      name: "Presence Co",
      email: "hr@pr.test",
      description: "A company description long enough for validation.",
      website: "https://pr.test",
      location: "Remote",
      adminUser: owner._id,
    });
    await User.updateOne({ _id: owner._id }, { companyId: company._id });
    const teammate = await createUser({ email: "team@pr.test", role: "recruiter", companyId: company._id });
    const stranger = await createUser({ email: "str@other.test", role: "student" });

    await request(app).post("/api/v1/realtime/heartbeat").set(bearer(teammate)).expect(204);
    await request(app).post("/api/v1/realtime/heartbeat").set(bearer(stranger)).expect(204);

    const res = await request(app).get("/api/v1/realtime/presence").set(bearer(owner));
    expect(res.status).toBe(200);
    expect(res.body.online).toEqual([String(teammate._id)]);

    // a stale heartbeat is offline
    await User.updateOne({ _id: teammate._id }, { lastSeenAt: new Date(Date.now() - 10 * 60 * 1000) });
    const later = await request(app).get("/api/v1/realtime/presence").set(bearer(owner));
    expect(later.body.online).toEqual([]);

    expect((await request(app).get("/api/v1/realtime/presence")).status).toBe(401);
  });
});

describe("tokens must be session-bound outside tests", () => {
  it("refuses a token without a session id when not running tests", async () => {
    const user = await createUser({ email: "legacy@test.com", role: "student" });
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const res = await request(app).get("/api/v1/user/me").set(bearer(user));
      expect(res.status).toBe(401);
    } finally {
      process.env.NODE_ENV = previous;
    }
    expect((await request(app).get("/api/v1/user/me").set(bearer(user))).status).toBe(200);
  });
});

describe("vector search", () => {
  it("falls back to capped exact search when the cluster has no Atlas vector index", async () => {
    const previous = process.env.VECTOR_SEARCH;
    process.env.VECTOR_SEARCH = "auto";
    try {
      const near = new mongoose.Types.ObjectId();
      const far = new mongoose.Types.ObjectId();
      const base = { kind: "job", model: EMBEDDING_MODEL.ID, dimensions: 3, textHash: "h" };
      await Embedding.create({ ...base, refId: near, vector: [1, 0, 0] });
      await Embedding.create({ ...base, refId: far, vector: [0, 1, 0] });
      const found = await searchSimilar({ kind: "job", vector: [1, 0, 0], limit: 2 });
      expect(found.map((f) => f.refId)).toEqual([String(near), String(far)]);
    } finally {
      if (previous === undefined) delete process.env.VECTOR_SEARCH;
      else process.env.VECTOR_SEARCH = previous;
    }
  });
});
