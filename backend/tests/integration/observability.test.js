import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { AiRun } from "../../models/aiRun.model.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

const tokenFor = (user) =>
  jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY);

describe("request IDs", () => {
  it("generates one per request", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("reuses a well-formed incoming ID and replaces a malformed one", async () => {
    const good = await request(app)
      .get("/health")
      .set("X-Request-Id", "trace-abc_123");
    expect(good.headers["x-request-id"]).toBe("trace-abc_123");

    const bad = await request(app)
      .get("/health")
      .set("X-Request-Id", "bad id <script>");
    expect(bad.headers["x-request-id"]).not.toBe("bad id <script>");
  });
});

describe("GET /api/v1/admin/ai/stats", () => {
  const createUser = (email, role, phoneNumber) =>
    User.create({
      fullname: role,
      email,
      phoneNumber,
      password: "unused-password",
      role,
    });

  it("aggregates AI runs for super admins only", async () => {
    const admin = await createUser(
      "admin@test.com",
      "super_admin",
      "9100000001",
    );
    const recruiter = await createUser(
      "rec@test.com",
      "recruiter",
      "9100000002",
    );

    await AiRun.create([
      {
        task: "resume.extract",
        status: "success",
        model: "openai/gpt-oss-20b",
        latencyMs: 100,
        inputTokens: 1000,
        outputTokens: 200,
      },
      {
        task: "resume.extract",
        status: "success",
        model: "openai/gpt-oss-20b",
        cached: true,
        latencyMs: 2,
      },
      {
        task: "resume.extract",
        status: "error",
        model: "openai/gpt-oss-20b",
        latencyMs: 300,
      },
    ]);

    const denied = await request(app)
      .get("/api/v1/admin/ai/stats")
      .set("Authorization", `Bearer ${tokenFor(recruiter)}`);
    expect(denied.status).toBe(403);

    const res = await request(app)
      .get("/api/v1/admin/ai/stats?hours=1")
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual([
      {
        task: "resume.extract",
        model: "openai/gpt-oss-20b",
        calls: 3,
        errors: 1,
        cached: 1,
        degraded: 0,
        avgLatencyMs: 134,
        inputTokens: 1000,
        outputTokens: 200,
      },
    ]);

    const limits = await request(app)
      .get("/api/v1/admin/ai/limits")
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(limits.status).toBe(200);
    expect(limits.body.limits).toEqual({});
  });
});
