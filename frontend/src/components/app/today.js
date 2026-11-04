import { daysAgo, when } from "./format.js";

// Joinable from 15 minutes before the start, or while the room is open
const joinable = (i, now) => i.live || new Date(i.scheduledAt) - now < 15 * 60 * 1000;
const isToday = (d, now) => new Date(d).toDateString() === now.toDateString();

/**
 * Today for a recruiter: everything that needs them, most urgent first,
 * each with the one action that clears it. What's later sits beside it.
 */
export const recruiterTasks = (data, now = new Date()) => {
  if (!data) return { tasks: [], later: [] };
  const interviews = data.upcoming.rows;
  const tasks = [
    ...interviews
      .filter((i) => joinable(i, now) || isToday(i.scheduledAt, now))
      .map((i) => ({
        key: `iv-${i.id}`,
        rank: joinable(i, now) ? 0 : 2,
        title: `Interview ${i.candidate}`,
        sub: i.job,
        meta: when(i.scheduledAt, now),
        action: joinable(i, now) ? { label: "Join", to: `/interview/${i.id}/video`, primary: true } : { label: "Prepare", to: `/interview/${i.id}/scorecard` },
      })),
    ...data.reportsToSend.rows.map((r) => ({
      key: `rp-${r.id}`,
      rank: 1,
      title: `Send ${r.candidate}'s report`,
      sub: r.job,
      action: { label: "Finish", to: `/interview/${r.id}/scorecard` },
    })),
    ...data.toReview.rows.map((a) => ({
      key: `rv-${a.id}`,
      rank: 3,
      title: `Review ${a.candidate}`,
      sub: a.job,
      meta: daysAgo(a.waitingDays),
      late: a.waitingDays >= 7,
      waiting: a.waitingDays,
      action: { label: "Review", to: a.jobId ? `/recruiter/job/${a.jobId}/applications` : "/recruiter/applicants" },
    })),
  ].sort((a, b) => a.rank - b.rank || (b.waiting ?? 0) - (a.waiting ?? 0));
  const later = interviews
    .filter((i) => !joinable(i, now) && !isToday(i.scheduledAt, now))
    .map((i) => ({ key: `l-${i.id}`, title: i.candidate, sub: i.job, meta: when(i.scheduledAt, now), to: `/interview/${i.id}/scorecard` }));
  return { tasks, later, more: data.toReview.total - data.toReview.rows.length };
};
