/**
 * Who may see and act on a job's applicants: the recruiter who posted it,
 * or a recruiter / company admin belonging to the job's company.
 */

// Applicant fields a recruiter may see. Never the whole User document: it
// holds the password hash, refresh tokens and session data.
export const APPLICANT_PUBLIC_FIELDS =
  "fullname email phoneNumber profile.profilePhoto profile.resume profile.resumeOriginalName profile.skills profile.bio createdAt";

export const canManageJob = (user, job) => {
  if (!user || !job) return false;
  if (!["recruiter", "company_admin"].includes(user.role)) return false;
  if (String(job.created_by) === String(user._id)) return true;
  const jobCompany = job.company?._id ?? job.company;
  return Boolean(
    user.companyId &&
    jobCompany &&
    String(user.companyId) === String(jobCompany),
  );
};
