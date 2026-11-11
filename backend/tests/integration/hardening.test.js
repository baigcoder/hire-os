/**
 * Regression tests for the security audit (run-1): each case is a request that used to
 * succeed for the wrong caller or leak data.
 */
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Company } from "../../models/company.model.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

let phone = 9600000000;
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

const createCompany = async (name, admin, extra = {}) => {
  const company = await Company.create({
    subscription: { status: "active" },
    name,
    email: `hr@${name.toLowerCase()}.test`,
    description: `${name} builds software for a living, at scale.`,
    website: `https://${name.toLowerCase()}.test`,
    location: "Remote",
    adminUser: admin._id,
    ...extra,
  });
  await User.updateOne({ _id: admin._id }, { companyId: company._id });
  return company;
};

describe("company registration never issues a session for an existing account", () => {
  it("rejects an anonymous re-register for an existing company admin", async () => {
    const admin = await createUser({ email: "owner@acme.test", role: "company_admin" });
    await createCompany("Acme", admin);
    const res = await request(app)
      .post("/api/v1/company/register")
      .send({ companyName: "Acme", adminEmail: "owner@acme.test" });
    expect(res.status).toBe(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(res.body.token).toBeUndefined();
  });

  it("rejects an anonymous register that adopts an existing admin without a company", async () => {
    await createUser({ email: "new@admin.test", role: "company_admin" });
    const res = await request(app)
      .post("/api/v1/company/register")
      .send({ companyName: "Fresh Co", adminEmail: "new@admin.test" });
    expect(res.status).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("recruiter invitations", () => {
  const invite = (email) => ({
    email,
    name: "Invitee",
    status: "invited",
    invitationToken: "secret-invite-token",
    invitationExpiresAt: new Date(Date.now() + 86400000),
    permissions: ["post_jobs"],
  });

  it("won't log in as, or re-role, an existing account", async () => {
    const admin = await createUser({ email: "owner@beta.test", role: "company_admin" });
    const company = await createCompany("Beta", admin, { recruiters: [invite("victim@test.com")] });
    const victim = await createUser({ email: "victim@test.com", role: "student" });

    const res = await request(app)
      .post("/api/v1/company/accept-invite")
      .send({ token: "secret-invite-token", companyId: company._id, password: "Passw0rd!x" });

    expect(res.status).toBe(409);
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect((await User.findById(victim._id)).role).toBe("student");
  });

  it("never exposes invitation tokens or staff emails on the public company page", async () => {
    const admin = await createUser({ email: "owner@gamma.test", role: "company_admin" });
    const company = await createCompany("Gamma", admin, { recruiters: [invite("staff@gamma.test")] });

    const res = await request(app).get(`/api/v1/company/public/${company._id}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("secret-invite-token");
    expect(body).not.toContain("owner@gamma.test");
    expect(body).not.toContain("staff@gamma.test");
  });
});

describe("uploads", () => {
  it("won't let a user delete someone else's image", async () => {
    const attacker = await createUser({ email: "a@test.com", role: "student" });
    const victim = await createUser({ email: "v@test.com", role: "student" });
    const res = await request(app)
      .delete("/api/v1/upload/image")
      .set(auth(attacker))
      .send({ publicId: `hireos/users/${victim._id}/abc123` });
    expect(res.status).toBe(403);
  });
});

describe("the platform is free", () => {
  it("registers a company with no payment: active, full features, unverified admin email", async () => {
    const res = await request(app).post("/api/v1/company/register").send({
      companyName: "Free Co",
      adminEmail: "boss@free.test",
      adminName: "Boss",
      adminPassword: "Passw0rd!long",
      location: "Remote",
    });
    expect(res.status).toBe(201);
    const company = await Company.findOne({ name: "Free Co" });
    expect(company.subscription.status).toBe("active");
    expect(company.isSubscriptionActive).toBe(true);
    expect(company.hasFeature("videoInterviews")).toBe(true);
    expect((await User.findOne({ email: "boss@free.test" })).isEmailVerified).toBe(false);
  });

  it("no longer exposes any payment or subscription routes", async () => {
    for (const path of ["/api/v1/payment/initiate", "/api/v1/paddle/initiate", "/api/v1/subscription/plans"]) {
      const res = await request(app).post(path).send({});
      expect(res.status).toBe(404);
    }
  });
});
