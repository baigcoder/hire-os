import request from "supertest";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Company } from "../../models/company.model.js";
import { issueCode, checkCode } from "../../utils/emailCode.js";

const cookieValue = (res, name) =>
  (res.headers["set-cookie"] ?? []).map((c) => c.split(";")[0]).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

const signIn = async () => {
  await request(app).post("/api/v1/user/register").send({
    fullname: "Sam Session",
    email: "sam@example.com",
    phoneNumber: "5550003333",
    password: "Password123!",
    role: "student",
  });
  return request(app).post("/api/v1/user/login").send({ email: "sam@example.com", password: "Password123!" });
};

describe("Sessions", () => {
  it("signs in with a short access cookie and a separate refresh cookie", async () => {
    const res = await signIn();
    expect(res.statusCode).toBe(200);
    const cookies = res.headers["set-cookie"].join(" | ");
    expect(cookieValue(res, "token")).toBeTruthy();
    expect(cookieValue(res, "refreshToken")).toBeTruthy();
    expect(cookies).toMatch(/token=[^;]+;.*Max-Age=900/);
    expect(cookies).toMatch(/HttpOnly/);
  });

  it("renews the access token from the refresh cookie", async () => {
    const res = await signIn();
    const refresh = await request(app)
      .post("/api/v1/user/refresh-token")
      .set("Cookie", `refreshToken=${cookieValue(res, "refreshToken")}`)
      .set("X-Requested-With", "XMLHttpRequest");
    expect(refresh.statusCode).toBe(200);
    expect(cookieValue(refresh, "token")).toBeTruthy();
  });

  it("never accepts a refresh token as an access token", async () => {
    const res = await signIn();
    const call = await request(app)
      .get("/api/v1/application/get")
      .set("Authorization", `Bearer ${cookieValue(res, "refreshToken")}`);
    expect(call.statusCode).toBe(401);
  });

  it("ends the session on sign-out, so its refresh token stops working", async () => {
    const res = await signIn();
    const refreshToken = cookieValue(res, "refreshToken");
    await request(app).get("/api/v1/user/logout").set("Cookie", `refreshToken=${refreshToken}`);
    const refresh = await request(app)
      .post("/api/v1/user/refresh-token")
      .set("Cookie", `refreshToken=${refreshToken}`)
      .set("X-Requested-With", "XMLHttpRequest");
    expect(refresh.statusCode).toBe(401);
  });

  it("blocks a cookie-authenticated write that lacks the CSRF header", async () => {
    const res = await signIn();
    const write = await request(app)
      .post("/api/v1/user/refresh-token")
      .set("Cookie", `refreshToken=${cookieValue(res, "refreshToken")}`);
    expect(write.statusCode).toBe(403);
    expect(write.body.code).toBe("CSRF");
  });
});

describe("Recruiters on every request", () => {
  const recruiterWith = async ({ mustChangePassword = false, status = "active" } = {}) => {
    const owner = await User.create({ fullname: "Owner", email: "owner2@example.com", phoneNumber: "5550004444", password: "owner-password-1", role: "company_admin" });
    const company = await Company.create({ name: "Acme Two", email: "acme2@example.com", adminUser: owner._id, userId: owner._id, subscription: { status, endDate: new Date(Date.now() + 86400000) } });
    await User.create({
      fullname: "Rec",
      email: "rec2@example.com",
      phoneNumber: "5550005555",
      password: await bcrypt.hash("Password123!", 4),
      role: "recruiter",
      companyId: company._id,
      mustChangePassword,
    });
    const login = await request(app).post("/api/v1/user/login").send({ email: "rec2@example.com", password: "Password123!" });
    return { token: login.body.token, company };
  };
  const applicants = (token) => request(app).get(`/api/v1/application/${new mongoose.Types.ObjectId()}/applicants`).set("Authorization", `Bearer ${token}`);

  it("keeps a recruiter on a temporary password out of recruiter routes", async () => {
    const { token } = await recruiterWith({ mustChangePassword: true });
    const res = await applicants(token);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("cuts a signed-in recruiter off as soon as the company's subscription lapses", async () => {
    const { token, company } = await recruiterWith();
    await Company.updateOne({ _id: company._id }, { "subscription.status": "expired" });
    const res = await applicants(token);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe("COMPANY_SUBSCRIPTION_INACTIVE");
  });
});

describe("Email codes", () => {
  it("accepts the right code once", async () => {
    const code = await issueCode("Code@Example.com");
    expect(code).toMatch(/^\d{6}$/);
    expect((await checkCode("code@example.com", code)).valid).toBe(true);
    expect((await checkCode("code@example.com", code)).valid).toBe(false);
  });

  it("stops after five wrong tries, even with the right code", async () => {
    const code = await issueCode("try@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await checkCode("try@example.com", wrong)).valid).toBe(false);
    expect((await checkCode("try@example.com", code)).valid).toBe(false);
  });
});
