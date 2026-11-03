/** What an interview is waiting on, in the words a recruiter would use. */
export const interviewState = (i, now = Date.now()) => {
  const video = i.videoInterview?.status;
  const report = i.finalReport?.status;
  if (["cancelled", "no_show"].includes(i.status)) return { key: "cancelled", label: i.status === "no_show" ? "No-show" : "Cancelled", tab: "cancelled" };
  if (report === "approved" || i.status === "approved") return { key: "approved", label: "Approved", tab: "done", pill: "app-pill-positive" };
  if (report === "rejected" || i.status === "rejected") return { key: "rejected", label: "Not hired", tab: "done" };
  if (report === "submitted") return { key: "owner", label: "With owner", tab: "done", pill: "app-pill-warning" };
  if (video === "completed") return { key: "report", label: report === "draft" ? "Report drafted" : "Report to send", tab: "report", pill: "app-pill-warning" };
  if (video === "in_progress" || video === "waiting") return { key: "live", label: "Live now", tab: "upcoming", pill: "app-pill-positive" };
  if (new Date(i.scheduledAt) < now - 2 * 3600e3) return { key: "missed", label: "Not held", tab: "upcoming" };
  return { key: "scheduled", label: "Scheduled", tab: "upcoming" };
};
