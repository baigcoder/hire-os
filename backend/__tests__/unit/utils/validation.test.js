import { describe, test, expect } from "@jest/globals";
import Joi from "joi";

// Import schemas to test
import {
  registerSchema,
  loginSchema,
  createJobSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../../../middlewares/validation.schemas.js";

describe("Validation Schemas", () => {
  describe("Register Schema", () => {
    test("should validate a correct registration payload", () => {
      const validData = {
        fullname: "John Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        password: "SecurePass123",
        role: "student",
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    test("should reject registration with missing fields", () => {
      const invalidData = {
        fullname: "John Doe",
        // missing email, phoneNumber, password, role
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    test("should reject invalid email format", () => {
      const invalidData = {
        fullname: "John Doe",
        email: "not-an-email",
        phoneNumber: "+1234567890",
        password: "SecurePass123",
        role: "student",
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("email");
    });

    test("should reject password less than 8 characters", () => {
      const invalidData = {
        fullname: "John Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        password: "short",
        role: "student",
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("password");
    });

    test("should reject invalid role", () => {
      const invalidData = {
        fullname: "John Doe",
        email: "john@example.com",
        phoneNumber: "+1234567890",
        password: "SecurePass123",
        role: "admin", // invalid role
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("role");
    });
  });

  describe("Login Schema", () => {
    test("should validate correct login payload", () => {
      const validData = {
        email: "john@example.com",
        password: "SecurePass123",
        role: "student",
      };

      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    test("should require all fields", () => {
      const invalidData = {
        email: "john@example.com",
        // missing password and role
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe("Forgot Password Schema", () => {
    test("should validate email only", () => {
      const validData = { email: "john@example.com" };
      const { error } = forgotPasswordSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    test("should reject invalid email", () => {
      const invalidData = { email: "invalid" };
      const { error } = forgotPasswordSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe("Reset Password Schema", () => {
    test("should validate token and password", () => {
      const validData = {
        token: "abc123def456",
        password: "NewSecurePass123",
      };
      const { error } = resetPasswordSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    test("should reject weak password", () => {
      const invalidData = {
        token: "abc123def456",
        password: "weak",
      };
      const { error } = resetPasswordSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe("Create Job Schema", () => {
    test("should validate correct job data", () => {
      const validData = {
        title: "Software Engineer",
        description:
          "Looking for an experienced software engineer. " +
          "Must have 3+ years of experience in web development.",
        requirements: ["JavaScript", "React", "Node.js"],
        salary: 75000,
        location: "Remote",
        jobType: "Full-time",
        position: 1,
        companyId: "507f1f77bcf86cd799439011",
      };

      const { error } = createJobSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    test("should reject job with short description", () => {
      const invalidData = {
        title: "Software Engineer",
        description: "Short desc", // Less than 50 chars
        requirements: ["JavaScript"],
        salary: 75000,
        location: "Remote",
        jobType: "Full-time",
        position: 1,
        companyId: "507f1f77bcf86cd799439011",
      };

      const { error } = createJobSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("description");
    });

    test("should reject invalid job type", () => {
      const invalidData = {
        title: "Software Engineer",
        description:
          "Looking for an experienced software engineer with web development skills.",
        requirements: ["JavaScript"],
        salary: 75000,
        location: "Remote",
        jobType: "Invalid-Type", // Invalid
        position: 1,
        companyId: "507f1f77bcf86cd799439011",
      };

      const { error } = createJobSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain("jobType");
    });
  });
});
