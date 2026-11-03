/**
 * Local demo: the real API on a throwaway in-memory database, seeded with one
 * company's hiring in progress, so every dashboard has something true to show.
 *
 *   npm run demo            (API on http://localhost:8000)
 *
 * Signs in: owner@demo.test, recruiter@demo.test, candidate@demo.test, all
 * with the password "demo-password". Data disappears when the process stops.
 * Never point this at a real database: it refuses to run with MONGO_URI set.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

if (process.env.MONGO_URI) {
  console.error("demo: MONGO_URI is set; refusing to seed a real database. Unset it to run the demo.");
  process.exit(1);
}

const mongo = await MongoMemoryServer.create();
process.env.MONGO_URI = mongo.getUri("hireos-demo");
process.env.SECRET_KEY ??= "demo-secret-key-local-only";
process.env.NODE_ENV ??= "development";
process.env.FRONTEND_URL ??= "http://localhost:5173";

await import("../index.js"); // connects and listens
while (mongoose.connection.readyState !== 1) await new Promise((r) => setTimeout(r, 200));

const { User } = await import("../models/user.model.js");
const { Company } = await import("../models/company.model.js");
const { Job } = await import("../models/job.model.js");
const { Application } = await import("../models/application.model.js");
const { Interview } = await import("../models/interview.model.js");

const now = Date.now();
const H = 3600e3;
const D = 24 * H;
const at = (ms) => new Date(now + ms);
const password = await bcrypt.hash("demo-password", 12);
let phone = 3001000000;
const person = (fullname, email, role, extra = {}) =>
  User.create({ fullname, email, role, password, phoneNumber: `0${phone++}`, ...extra });

const owner = await person("Zainab Malik", "owner@demo.test", "company_admin");
const company = await Company.create({
  name: "Northwind Logistics",
  email: "hiring@northwind.demo",
  description: "Northwind moves freight across Pakistan with software it builds in-house.",
  website: "https://northwind.demo",
  location: "Lahore",
  adminUser: owner._id,
  subscription: { plan: "professional", status: "active", startDate: at(-40 * D), endDate: at(20 * D) },
  features: { maxJobPostings: 20, maxRecruiters: 5, videoInterviews: true, mcqTests: true, aiRecommendations: true, advancedAnalytics: true },
});
await User.updateOne({ _id: owner._id }, { companyId: company._id });
const riley = await person("Riley Shah", "recruiter@demo.test", "recruiter", { companyId: company._id });
const hamza = await person("Hamza Ali", "hamza@demo.test", "recruiter", { companyId: company._id });
await Company.updateOne(
  { _id: company._id },
  { $push: { recruiters: { $each: [{ userId: riley._id, email: riley.email, name: riley.fullname, status: "active" }, { userId: hamza._id, email: hamza.email, name: hamza.fullname, status: "active" }] } } },
);

const job = (title, by, location, daysAgo, skills) =>
  Job.create({
    title,
    description: `${title} at Northwind Logistics: own real systems that move freight, with a small team and short feedback loops.`,
    requirements: skills,
    salary: 350000,
    location,
    jobType: "Full-time",
    experienceLevel: 3,
    position: 1,
    company: company._id,
    created_by: by._id,
    createdAt: at(-daysAgo * D),
  });
const backend = await job("Backend engineer", riley, "Lahore", 21, ["Node.js", "PostgreSQL", "System design", "AWS"]);
const designer = await job("Product designer", hamza, "Karachi", 12, ["Interaction design", "User research", "Figma"]);
const ops = await job("Operations lead", riley, "Islamabad", 6, ["Logistics", "Forecasting", "Team leadership"]);

const candidate = await person("Amina Farooq", "candidate@demo.test", "student", {
  trialStartDate: at(-12 * D),
  trialEndDate: at(18 * D),
  subscriptionStatus: "trial",
  profile: { skills: ["Node.js", "PostgreSQL", "AWS", "Redis"] },
});
const names = ["Bilal Khan", "Sara Iqbal", "Usman Tariq", "Hira Javed", "Omar Siddiqui", "Mahnoor Aziz", "Fahad Raza", "Ayesha Noor", "Danish Qureshi", "Iqra Saleem", "Kamran Butt", "Noor Fatima"];
const others = [];
for (const [i, n] of names.entries()) others.push(await person(n, `c${i}@demo.test`, "student"));

const apply = (who, j, status, daysAgo, extra = {}) =>
  Application.create({ job: j._id, applicant: who._id, company: company._id, status, createdAt: at(-daysAgo * D), ...extra });
const interview = (app, who, j, rec, fields) =>
  Interview.create({ applicationId: app._id, jobId: j._id, companyId: company._id, studentId: who._id, recruiterId: rec._id, ...fields });

// Amina, the demo candidate: interviewing for backend (today), applied to ops
const aminaBackend = await apply(candidate, backend, "video_scheduled", 9);
await apply(candidate, ops, "under_review", 2);
await interview(aminaBackend, candidate, backend, riley, { scheduledAt: at(2 * H), status: "video_scheduled" });

// New applicants waiting, oldest first
await apply(others[0], backend, "pending", 10);
await apply(others[1], designer, "pending", 4);
await apply(others[2], ops, "under_review", 1);
await apply(others[3], backend, "shortlisted", 7);

// An interview tomorrow, and one finished whose report isn't sent yet
const usman = await apply(others[4], designer, "video_scheduled", 8);
await interview(usman, others[4], designer, hamza, { scheduledAt: at(D + 3 * H), status: "video_scheduled" });
const hira = await apply(others[5], backend, "video_completed", 14);
await interview(hira, others[5], backend, riley, {
  scheduledAt: at(-D),
  status: "video_completed",
  videoInterview: { status: "completed", endedAt: at(-D + H) },
  finalReport: { status: "draft" },
});

// Waiting on the owner: one with an interview report, one passed directly
const omar = await apply(others[6], backend, "pending_ceo_approval", 16);
await interview(omar, others[6], backend, riley, {
  scheduledAt: at(-3 * D),
  status: "pending_ceo_approval",
  videoInterview: { status: "completed", endedAt: at(-3 * D + H) },
  finalReport: {
    status: "submitted",
    generatedAt: at(-2 * D),
    overallScore: 78,
    aiRecommendation: "RECOMMEND",
    aiSummary: "Clear, specific answers on Node.js services and Postgres indexing; AWS was covered only briefly.",
    structured: {
      recommendation: "RECOMMEND",
      recommendationSource: "recruiter",
      overallScore: 78,
      summary:
        "Fahad explained how he split a monolith's order service and tuned Postgres with specific numbers. System design was solid; AWS was only touched on, so cloud depth is unproven.",
      narrativeSource: "ai",
      strengths: [
        { competencyId: "c1", text: "Ships and measures backend changes", evidence: [{ quote: "We cut p95 from 900 to 180 milliseconds after moving the order service." }] },
        { competencyId: "c2", text: "Knows where Postgres time goes", evidence: [{ quote: "A partial index on unpaid orders took the nightly job from forty minutes to six." }] },
      ],
      concerns: [{ competencyId: "c4", text: "AWS experience not demonstrated in the interview" }],
      nextSteps: ["A short follow-up on running services on AWS"],
      facts: {
        scorecard: {
          rated: 3,
          total: 4,
          competencies: [
            { id: "c1", title: "Node.js APIs", kind: "must", rating: 4, quotes: [{ quote: "We cut p95 from 900 to 180 milliseconds." }] },
            { id: "c2", title: "PostgreSQL tuning", kind: "must", rating: 3, quotes: [{ quote: "A partial index took the nightly job from forty minutes to six." }] },
            { id: "c3", title: "System design", kind: "nice", rating: 3, quotes: [{ quote: "I'd queue the payment call so a slow provider can't block checkout." }] },
            { id: "c4", title: "AWS", kind: "nice", rating: null, quotes: [] },
          ],
        },
        mcq: null,
        resumeScreening: null,
        integrity: null,
      },
    },
  },
});
await apply(others[7], ops, "pending_ceo_approval", 5, {
  recruiterReview: { decision: "passed", notes: "Ran dispatch for a 40-truck fleet; referred by our ops manager.", reviewedBy: riley._id, reviewedAt: at(-D) },
});

// Further along, and closed
await apply(others[8], designer, "offer_sent", 18);
const hire = await apply(others[9], backend, "hired", 20);
// Hired two days ago (Mongoose stamps a new document's updatedAt with its createdAt)
await Application.updateOne({ _id: hire._id }, { updatedAt: at(-2 * D) }, { timestamps: false });
await apply(others[10], designer, "rejected", 11);
await apply(others[11], ops, "withdrawn", 3);

const token = (u) => jwt.sign({ userId: String(u._id) }, process.env.SECRET_KEY, { expiresIn: "1d" });
const session = (u) => ({ token: token(u), user: { _id: String(u._id), fullname: u.fullname, email: u.email, role: u.role, companyId: u.companyId ? String(u.companyId) : undefined, profile: u.profile ?? {} } });
console.log("\nHIRE.OS demo is running on http://localhost:" + (process.env.PORT || 8000));
console.log("Sign in with owner@demo.test, recruiter@demo.test or candidate@demo.test, password demo-password.");
console.log("DEMO_SESSIONS " + JSON.stringify({ owner: session(await User.findById(owner._id)), recruiter: session(riley), candidate: session(candidate) }));

const stop = async () => {
  await mongoose.disconnect();
  await mongo.stop({ doCleanup: true, force: true });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
