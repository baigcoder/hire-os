import request from "supertest";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Application } from "../../models/application.model.js";
import mongoose from "mongoose";

describe("Application Integration Tests", () => {
  let studentToken;
  let recruiterToken;
  let jobId;
  let studentId;

  beforeEach(async () => {
    // Create company admin (recruiter with company)
    const recruiterRes = await request(app).post("/api/v1/user/register").send({
      fullname: "Recruiter",
      email: "recruiter@app.com",
      phoneNumber: "1111111111",
      password: "Password123!",
      role: "company_admin",
    });
    recruiterToken = recruiterRes.body.token;
    const recruiterId = recruiterRes.body.user?._id;

    // Create a valid company
    const { Company } = await import("../../models/company.model.js");
    const company = await Company.create({
      name: "App Test Company",
      email: "apptest@company.com",
      description: "A test company for applications",
      website: "https://apptest.com",
      location: "Remote",
      adminUser: recruiterId,
      userId: recruiterId,
      subscription: {
        status: "active",
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update user with companyId
    await User.findByIdAndUpdate(recruiterId, { companyId: company._id });

    // Create student
    const studentRes = await request(app).post("/api/v1/user/register").send({
      fullname: "Student",
      email: "student@app.com",
      phoneNumber: "2222222222",
      password: "Password123!",
      role: "student",
    });
    studentToken = studentRes.body.token;
    studentId = studentRes.body.user._id;

    // Create job with valid company
    const job = await Job.create({
      title: "Test Job",
      description:
        "This is a detailed job description that meets the minimum length requirement of fifty characters to pass validation.",
      requirements: ["Req"],
      salary: 1000,
      location: "Loc",
      jobType: "Full-time",
      experienceLevel: 0,
      position: 1,
      company: company._id,
      created_by: recruiterId,
    });
    jobId = job._id;
  });

  describe("POST /api/v1/application/apply/:id", () => {
    it("should allow student to apply for a job", async () => {
      const res = await request(app)
        .post(`/api/v1/application/apply/${jobId}`)
        .set("Cookie", `token=${studentToken}`)
        .send();

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      const application = await Application.findOne({
        job: jobId,
        applicant: studentId,
      });
      expect(application).toBeTruthy();
    });

    it("should prevent double application", async () => {
      // First application
      await request(app)
        .post(`/api/v1/application/apply/${jobId}`)
        .set("Cookie", `token=${studentToken}`)
        .send();

      // Second application
      const res = await request(app)
        .post(`/api/v1/application/apply/${jobId}`)
        .set("Cookie", `token=${studentToken}`)
        .send();

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already applied/i);
    });
  });

  describe("GET /api/v1/application/get", () => {
    it("should get applied jobs for student", async () => {
      await request(app)
        .post(`/api/v1/application/apply/${jobId}`)
        .set("Cookie", `token=${studentToken}`)
        .send();

      const res = await request(app)
        .get("/api/v1/application/get")
        .set("Cookie", `token=${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.length).toBe(1);
      expect(res.body.application[0].job._id.toString()).toBe(jobId.toString());
    });
  });
});
