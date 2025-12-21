const getBaseUrl = () => {
  let base = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
  if (base.endsWith("/")) base = base.slice(0, -1);
  // If base doesn't end with /api/v1 but starts with http, append it (unless it's already got another version)
  if (!base.endsWith("/api/v1") && base.startsWith("http") && !base.includes("/api/v")) {
    base = `${base}/api/v1`;
  }
  return base;
};

const API_BASE_URL = getBaseUrl();

export const USER_API_END_POINT = `${API_BASE_URL}/user`;
export const JOB_API_END_POINT = `${API_BASE_URL}/job`;
export const APPLICATION_API_END_POINT = `${API_BASE_URL}/application`;
export const COMPANY_API_END_POINT = `${API_BASE_URL}/company`;
export const RESUME_API_END_POINT = `${API_BASE_URL}/resume`;
export const OTP_API_END_POINT = `${API_BASE_URL}/otp`;
export const SUBSCRIPTION_API_END_POINT = `${API_BASE_URL}/subscription`;
export const PAYMENT_API_END_POINT = `${API_BASE_URL}/payment`;
export const NOTIFICATION_API_END_POINT = `${API_BASE_URL}/notification`;
export const INTERVIEW_API_END_POINT = `${API_BASE_URL}/interview`;
export const MCQ_API_END_POINT = `${API_BASE_URL}/mcq`;
export const STATS_API_END_POINT = `${API_BASE_URL}/stats`;
export const TRIAL_API_END_POINT = `${API_BASE_URL}/trial`;
export const MOCK_INTERVIEW_API_END_POINT = `${API_BASE_URL}/mock-interview`;

// Student Dashboard Features
export const SAVED_JOBS_API_END_POINT = `${API_BASE_URL}/saved-jobs`;
export const CAREER_INSIGHTS_API_END_POINT = `${API_BASE_URL}/career-insights`;
export const CONNECTIONS_API_END_POINT = `${API_BASE_URL}/connections`;
export const JOB_ALERTS_API_END_POINT = `${API_BASE_URL}/job-alerts`;

// Recruiter Dashboard Features
export const RECRUITER_ANALYTICS_API_END_POINT = `${API_BASE_URL}/recruiter-analytics`;
export const EMAIL_TEMPLATES_API_END_POINT = `${API_BASE_URL}/email-templates`;
export const INTERVIEW_FEEDBACK_API_END_POINT = `${API_BASE_URL}/interview-feedback`;

// Messaging
export const MESSAGE_API_END_POINT = `${API_BASE_URL}/message`;
