import request from "supertest";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import mongoose from "mongoose";

describe("Auth Integration Tests", () => {
  const userData = {
    fullname: "Test User",
    email: "test@example.com",
    phoneNumber: "1234567890",
    password: "Password123!", // Strong password
    role: "student",
  };

  describe("POST /api/v1/user/register", () => {
    it("should register a new user successfully", async () => {
      const res = await request(app)
        .post("/api/v1/user/register")
        .send(userData);

      if (res.statusCode !== 201) {
        // console.log('Register failed:', res.body);
      }
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.token).toBeDefined(); // Should return JWT

      // Check headers for cookie
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);

      // Verify in DB
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.fullname).toBe(userData.fullname);
    });

    it("should validate required fields", async () => {
      const res = await request(app).post("/api/v1/user/register").send({}); // Empty body

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should prevent duplicate email registration", async () => {
      // First registration
      await request(app).post("/api/v1/user/register").send(userData);

      // Duplicate registration
      const res = await request(app)
        .post("/api/v1/user/register")
        .send({ ...userData, phoneNumber: "0987654321" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/exists/);
    });
  });

  describe("POST /api/v1/user/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/v1/user/register").send(userData);
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app).post("/api/v1/user/login").send({
        email: userData.email,
        password: userData.password,
        role: userData.role,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it("should login without a role, using the account's own", async () => {
      const res = await request(app).post("/api/v1/user/login").send({
        email: userData.email,
        password: userData.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBe(userData.role);
    });

    it("should still refuse a role that doesn't match the account", async () => {
      const res = await request(app).post("/api/v1/user/login").send({
        email: userData.email,
        password: userData.password,
        role: userData.role === "recruiter" ? "student" : "recruiter",
      });

      expect(res.statusCode).toBe(400);
    });

    it("should fail with incorrect password", async () => {
      const res = await request(app).post("/api/v1/user/login").send({
        email: userData.email,
        password: "wrongpassword",
        role: userData.role,
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should fail with non-existent email", async () => {
      const res = await request(app).post("/api/v1/user/login").send({
        email: "nonexistent@example.com",
        password: userData.password,
        role: userData.role,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("who can get an account", () => {
    const recruiter = { fullname: "Rae Cruiter", email: "rae@example.com", phoneNumber: "5550001111", password: "Password123!" };

    it("refuses a recruiter signing themselves up", async () => {
      const res = await request(app).post("/api/v1/user/register").send({ ...recruiter, role: "recruiter" });
      expect(res.statusCode).toBe(400);
      expect(await User.countDocuments({ email: recruiter.email })).toBe(0);
    });

    const recruiterIn = async (subscription) => {
      const { Company } = await import("../../models/company.model.js");
      const owner = await User.create({ fullname: "Owner", email: "own@example.com", phoneNumber: "5550002222", password: "owner-password-1", role: "company_admin" });
      const company = subscription
        ? await Company.create({ name: "Acme", email: "acme@example.com", adminUser: owner._id, userId: owner._id, subscription })
        : null;
      const bcrypt = (await import("bcryptjs")).default;
      await User.create({ ...recruiter, password: await bcrypt.hash(recruiter.password, 4), role: "recruiter", companyId: company?._id });
      return request(app).post("/api/v1/user/login").send({ email: recruiter.email, password: recruiter.password });
    };

    it("lets an invited recruiter in while the company's subscription is live", async () => {
      const res = await recruiterIn({ status: "active", endDate: new Date(Date.now() + 86400000) });
      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBe("recruiter");
    });

    it("lets a recruiter in whatever the company's old subscription state is (the platform is free)", async () => {
      const res = await recruiterIn({ status: "expired" });
      expect(res.statusCode).toBe(200);
    });

    it("keeps a recruiter with no company out", async () => {
      const res = await recruiterIn(null);
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe("NO_COMPANY");
    });
  });
});
