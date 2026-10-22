/**
 * Backfill the semantic search index (embeddings collection).
 *
 *   node scripts/reindex-embeddings.js                 # jobs, resumes, applicants
 *   node scripts/reindex-embeddings.js --kinds job     # only jobs
 *
 * New jobs, analyses and screenings are indexed automatically; run this once
 * after enabling GEMINI_API_KEY, or after changing the embedding model.
 * Unchanged documents are skipped without an API call, so re-runs are cheap.
 */
import mongoose from "mongoose";
import connectDB from "../utils/db.js";
import { Job } from "../models/job.model.js";
import { ResumeReport } from "../models/resumeReport.model.js";
import { ApplicantScreening } from "../models/applicantScreening.model.js";
import { embeddingsConfigured } from "../platform/embeddings/index.js";
import {
  indexJob,
  indexResumeReport,
  indexScreening,
} from "../modules/discover/indexing.js";

const args = process.argv.slice(2);
const kinds = (
  args.includes("--kinds")
    ? args[args.indexOf("--kinds") + 1]
    : "job,resume,applicant"
)
  .split(",")
  .map((k) => k.trim());

const tally = () => ({ created: 0, updated: 0, unchanged: 0, failed: 0 });

const run = async (label, items, fn) => {
  const counts = tally();
  for (const item of items) {
    try {
      counts[await fn(item)]++;
    } catch (error) {
      counts.failed++;
      console.warn(`${label} ${item._id}: ${error.message}`);
    }
  }
  console.log(`${label}: ${JSON.stringify(counts)}`);
};

const main = async () => {
  if (!embeddingsConfigured()) {
    console.error("Set GEMINI_API_KEY to build embeddings.");
    process.exit(2);
  }
  await connectDB();

  if (kinds.includes("job")) {
    const jobs = await Job.find().select("_id").lean();
    await run("jobs", jobs, (j) => indexJob(j._id));
  }

  if (kinds.includes("resume")) {
    // Latest completed report per user
    const latest = await ResumeReport.aggregate([
      { $match: { status: "completed" } },
      { $sort: { completedAt: -1 } },
      { $group: { _id: "$userId", reportId: { $first: "$_id" } } },
    ]);
    await run("resumes", latest, async ({ reportId }) => {
      const report = await ResumeReport.findById(reportId)
        .select("userId profile signals")
        .lean();
      return indexResumeReport(report);
    });
  }

  if (kinds.includes("applicant")) {
    const screenings = await ApplicantScreening.find({ status: "completed" })
      .select("applicationId jobId profile signals")
      .lean();
    const jobs = new Map(
      (
        await Job.find({ _id: { $in: screenings.map((s) => s.jobId) } })
          .select("company created_by")
          .lean()
      ).map((j) => [String(j._id), j]),
    );
    await run("applicants", screenings, (s) => {
      const job = jobs.get(String(s.jobId));
      if (!job) throw new Error("job no longer exists");
      return indexScreening(s, {
        companyId: job.company,
        createdBy: job.created_by,
      });
    });
  }

  await mongoose.disconnect();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
