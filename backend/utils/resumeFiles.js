/**
 * Private resume files: links, access rules and storage paths.
 * Served by routes/resumeFile.route.js.
 */
import { Application } from "../models/application.model.js";
import { canManageJob } from "./jobAccess.js";
import { RESUME_BUCKET, parseStorageUrl } from "./supabase.js";

/**
 * Link stored in user.profile.resume: our authenticated endpoint, which
 * redirects to a short-lived signed URL. API_PUBLIC_URL overrides the host
 * taken from the request (useful behind proxies or for migrations).
 */
export const resumeLinkFor = (req, userId, { base } = {}) => {
  const origin =
    base?.replace(/\/$/, "") ||
    process.env.API_PUBLIC_URL?.replace(/\/$/, "") ||
    `${req.protocol}://${req.get("host")}`;
  // Version suffix busts browser caches after a re-upload
  return `${origin}/api/v1/resumes/${userId}?v=${Date.now()}`;
};

/**
 * May `viewer` open `ownerId`'s resume? The owner, or a recruiter / company
 * admin who can manage a job the owner applied to.
 */
export const canViewResume = async (viewer, ownerId) => {
  if (!viewer) return false;
  if (String(viewer._id) === String(ownerId)) return true;
  if (!["recruiter", "company_admin"].includes(viewer.role)) return false;

  const applications = await Application.find({ applicant: ownerId })
    .select("job")
    .populate("job", "created_by company")
    .lean();
  return applications.some((a) => a.job && canManageJob(viewer, a.job));
};

/** Bucket path of a user's resume, including legacy public-URL records. */
export const resumeObjectPath = (profile = {}) => {
  if (profile?.resumePath) return profile.resumePath;
  const legacy = profile?.resume && parseStorageUrl(profile.resume);
  return legacy?.bucket === RESUME_BUCKET ? legacy.path : null;
};
