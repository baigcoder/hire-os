import request from "supertest";
import crypto from "crypto";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";

const register = () =>
  request(app).post("/api/v1/user/register").send({
    fullname: "Rae Reset",
    email: "rae@example.com",
    phoneNumber: "5550004444",
    password: "Password123!",
    role: "student",
  });

// Stands in for the emailed link: the same hashed token forgotPassword stores
const issueLink = async () => {
  const token = crypto.randomBytes(32).toString("hex");
  await User.updateOne(
    { email: "rae@example.com" },
    { passwordResetToken: crypto.createHash("sha256").update(token).digest("hex"), passwordResetExpires: Date.now() + 3600_000 },
  );
  return token;
};

describe("Password reset", () => {
  it("says so when reset emails can't be sent, the same for any address", async () => {
    await register();
    const saved = ["SMTP_USER", "SMTP_PASS", "EMAIL_USER", "EMAIL_PASS"].map((k) => [k, process.env[k]]);
    saved.forEach(([k]) => delete process.env[k]);
    const known = await request(app).post("/api/v1/user/forgot-password").send({ email: "rae@example.com" });
    const unknown = await request(app).post("/api/v1/user/forgot-password").send({ email: "nobody@example.com" });
    saved.forEach(([k, v]) => v !== undefined && (process.env[k] = v));
    expect(known.status).toBe(503);
    expect(unknown.status).toBe(503);
  });

  it("resets with a valid link, once, and signs in with the new password", async () => {
    await register();
    const token = await issueLink();

    expect((await request(app).get(`/api/v1/user/verify-reset-token/${token}`)).status).toBe(200);
    const weak = await request(app).post("/api/v1/user/reset-password").send({ token, password: "password" });
    expect(weak.status).toBe(400);

    const reset = await request(app).post("/api/v1/user/reset-password").send({ token, password: "NewPassword456!" });
    expect(reset.status).toBe(200);
    expect((await request(app).post("/api/v1/user/reset-password").send({ token, password: "Another789!" })).status).toBe(400);

    expect((await request(app).post("/api/v1/user/login").send({ email: "rae@example.com", password: "Password123!" })).status).not.toBe(200);
    expect((await request(app).post("/api/v1/user/login").send({ email: "rae@example.com", password: "NewPassword456!" })).status).toBe(200);
  });

  it("refuses an unknown or expired link", async () => {
    await register();
    const token = await issueLink();
    await User.updateOne({ email: "rae@example.com" }, { passwordResetExpires: Date.now() - 1000 });
    expect((await request(app).get(`/api/v1/user/verify-reset-token/${token}`)).status).toBe(400);
    expect((await request(app).post("/api/v1/user/reset-password").send({ token: "f".repeat(64), password: "NewPassword456!" })).status).toBe(400);
  });
});
