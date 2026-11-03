/** Formatting shared by the app screens (plain module so tests can import it). */

export const plural = (n, word, many = `${word}s`) => `${n.toLocaleString()} ${n === 1 ? word : many}`;

export const daysAgo = (days) => (days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`);

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

/** "Today, 3:30 PM" / "Tomorrow, 10:00 AM" / "Thu 6 Nov, 9:00 AM" */
export const when = (date, now = new Date()) => {
  const d = new Date(date);
  const days = Math.round((new Date(d.toDateString()) - new Date(now.toDateString())) / 864e5);
  const day = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days === -1 ? "Yesterday" : dayFmt.format(d);
  return `${day}, ${timeFmt.format(d)}`;
};
