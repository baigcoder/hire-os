/**
 * Seed Script - Add Sample Company and Job
 * Run: node backend/seeds/seedSampleData.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

// Models
import { Company } from "../models/company.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";

const MONGO_URI = process.env.MONGO_URI;

async function seedData() {
    try {
        console.log("🔗 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Find an existing recruiter user
        let recruiter = await User.findOne({ role: "recruiter" });

        if (!recruiter) {
            console.log("❌ No recruiter found. Please create a recruiter account first.");
            process.exit(1);
        }

        console.log("📌 Using recruiter:", recruiter.email);

        // Create sample company - Google
        const existingCompany = await Company.findOne({ name: "Google" });

        let company;
        if (existingCompany) {
            company = existingCompany;
            console.log("📌 Company already exists:", company.name);
        } else {
            company = await Company.create({
                name: "Google",
                email: "careers@google.com",
                phone: "+1-650-253-0000",
                description: "Google LLC is an American multinational technology company focusing on search engine technology, online advertising, cloud computing, computer software, quantum computing, e-commerce, artificial intelligence, and consumer electronics.",
                website: "https://careers.google.com",
                location: "Mountain View, California",
                logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png",
                industry: "Technology",
                companySize: "1000+",
                foundedYear: 1998,
                adminUser: recruiter._id,
                userId: recruiter._id,
                tagline: "Organizing the world's information and making it universally accessible",
                culture: ["Innovation", "Collaboration", "Impact", "Diversity"],
                benefits: [
                    "Health Insurance",
                    "401(k) Matching",
                    "Free Meals",
                    "Gym & Wellness",
                    "Parental Leave",
                    "Learning Budget",
                    "Stock Options",
                ],
                subscription: {
                    plan: "enterprise",
                    status: "active",
                },
            });
            console.log("✅ Created company:", company.name);
        }

        // Create sample job - Software Engineer
        const existingJob = await Job.findOne({ company: company._id, title: "Software Engineer III" });

        if (existingJob) {
            console.log("📌 Job already exists:", existingJob.title);
        } else {
            const job = await Job.create({
                title: "Software Engineer III",
                description: `Google is looking for a Software Engineer to join our team and help build the next generation of products that impact billions of users worldwide.

As a Software Engineer at Google, you will work on a specific project critical to Google's needs. You will design, develop, test, deploy, maintain, and enhance software solutions.

Responsibilities:
• Write and test product or system development code
• Participate in, or lead design reviews with peers and stakeholders
• Review code developed by other developers and provide feedback
• Contribute to existing documentation or educational content
• Triage product or system issues and debug/track/resolve them
• Mentor junior team members

Minimum Qualifications:
• Bachelor's degree in Computer Science or related field
• 2 years of software development experience
• Experience with data structures, algorithms, and software design

Preferred Qualifications:
• Master's or PhD in Computer Science
• 4 years of experience with software development in one or more languages
• Experience developing accessible technologies`,
                requirements: [
                    "Bachelor's degree in Computer Science or equivalent",
                    "2+ years of software development experience",
                    "Proficiency in one or more programming languages (Python, Java, Go, C++)",
                    "Experience with data structures and algorithms",
                    "Strong problem-solving skills",
                ],
                skills: [
                    "Python",
                    "Java",
                    "Go",
                    "C++",
                    "Algorithms",
                    "Data Structures",
                    "Distributed Systems",
                    "Machine Learning",
                    "Cloud Computing",
                ],
                salary: 185000,
                salaryType: "yearly",
                experienceLevel: 2,
                location: "Mountain View, CA",
                jobType: "Full-time",
                position: 5,
                company: company._id,
                created_by: recruiter._id,
                benefits: [
                    "Health Insurance",
                    "401(k) Matching",
                    "Free Meals",
                    "Gym & Wellness",
                    "Remote Work Option",
                    "Stock Options",
                    "Learning Budget",
                ],
                isRemote: true,
                isActive: true,
                industry: "Technology",
                department: "Engineering",
                educationRequired: "Bachelor",
                urgentHiring: false,
            });
            console.log("✅ Created job:", job.title);
        }

        console.log("\n🎉 Seed data completed successfully!");
        console.log("📋 Summary:");
        console.log("   - Company: Google");
        console.log("   - Job: Software Engineer III");
        console.log("\n👉 Refresh your browser to see the job on the student dashboard!");

    } catch (error) {
        console.error("❌ Seed error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
        process.exit(0);
    }
}

seedData();
