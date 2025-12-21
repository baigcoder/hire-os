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
});
