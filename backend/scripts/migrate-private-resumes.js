/**
 * One-off migration for S11: point existing resume records at the private
 * flow. For every user whose profile.resume is a Supabase public URL in the
 * "resumes" bucket, store the object path in profile.resumePath and replace
 * profile.resume with the authenticated /api/v1/resumes/:userId link.
 *
 *   node scripts/migrate-private-resumes.js --api-base https://api.example.com          # dry run
 *   node scripts/migrate-private-resumes.js --api-base https://api.example.com --apply  # write
 *
 * Run it after deploying the new API and before making the bucket private
 * (docs/supabase/private-resumes.sql). Safe to re-run: migrated users are
 * skipped.
 */
import mongoose from "mongoose";
import connectDB from "../utils/db.js";
import { User } from "../models/user.model.js";
import { RESUME_BUCKET, parseStorageUrl } from "../utils/supabase.js";
import { resumeLinkFor } from "../utils/resumeFiles.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const apiBase = args[args.indexOf("--api-base") + 1];

if (!args.includes("--api-base") || !/^https?:\/\//.test(apiBase || "")) {
  console.error("Usage: --api-base https://your-api-host [--apply]");
  process.exit(2);
}

const main = async () => {
  await connectDB();
  const users = await User.find({
    "profile.resume": { $regex: "/storage/v1/object/" },
    "profile.resumePath": { $in: [null, ""] },
  }).select("profile.resume");

  let migrated = 0;
  let skipped = 0;
  for (const user of users) {
    const stored = parseStorageUrl(user.profile.resume);
    if (stored?.bucket !== RESUME_BUCKET) {
      skipped++;
      continue;
    }
    const link = resumeLinkFor(null, user._id, { base: apiBase });
    console.log(
      `${apply ? "migrate" : "would migrate"} ${user._id}: ${stored.path}`,
    );
    if (apply) {
      await User.updateOne(
        { _id: user._id },
        { $set: { "profile.resumePath": stored.path, "profile.resume": link } },
      );
    }
    migrated++;
  }

  console.log(
    `\n${apply ? "Migrated" : "Would migrate"} ${migrated} user(s); skipped ${skipped} not in the "${RESUME_BUCKET}" bucket.${apply ? "" : " Re-run with --apply to write."}`,
  );
  await mongoose.disconnect();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
