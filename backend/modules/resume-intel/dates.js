/**
 * Deterministic date-range parsing for resume roles, so years of experience
 * come from the actual dates ("Jan 2021 – Present") rather than a regex on
 * "N years experience" or an LLM's estimate.
 */

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const PRESENT = /\b(present|current|now|ongoing|today|till date|to date)\b/i;

// One date token: "Jan 2021", "January, 2021", "01/2021", "2021-01", "2021"
const TOKEN =
  /\b(?:(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s*((?:19|20)\d{2})|(0?[1-9]|1[0-2])\s*[/.-]\s*((?:19|20)\d{2})|((?:19|20)\d{2})\s*[/.-]\s*(0?[1-9]|1[0-2])\b|((?:19|20)\d{2}))\b/gi;

const toYm = (match) => {
  if (match[1]) return { y: +match[2], m: MONTHS[match[1].toLowerCase()] };
  if (match[3]) return { y: +match[4], m: +match[3] };
  if (match[5]) return { y: +match[5], m: +match[6] };
  return { y: +match[7], m: null };
};

/** "YYYY-MM" -> {y, m} */
export const fromIsoMonth = (value) => {
  const m = /^((?:19|20)\d{2})(?:-(0[1-9]|1[0-2]))?$/.exec(value || "");
  return m ? { y: +m[1], m: m[2] ? +m[2] : null } : null;
};

/**
 * Parse a range like "Jan 2021 – Present" or "2019 - 2021".
 * Returns { start, end, current } with {y, m} months, or null if no start.
 * A year without a month is treated as January for starts and December for
 * ends, so "2019 - 2021" spans three calendar years.
 */
export const parseDateRange = (text) => {
  if (!text) return null;
  const tokens = [...String(text).matchAll(TOKEN)].map(toYm);
  if (tokens.length === 0) return null;
  const current = PRESENT.test(text);
  const start = { y: tokens[0].y, m: tokens[0].m ?? 1 };
  let end = null;
  if (tokens.length > 1) {
    end = { y: tokens[1].y, m: tokens[1].m ?? 12 };
  } else if (!current && tokens[0].m === null) {
    // A single bare year ("2020") means within that year
    end = { y: tokens[0].y, m: 12 };
  } else if (!current) {
    end = { ...start };
  }
  return { start, end, current: current && tokens.length === 1 };
};

const index = ({ y, m }) => y * 12 + (m - 1);

/** Inclusive months between two {y, m}; `end` null means `now`. */
export const monthsBetween = (start, end, now = new Date()) => {
  const endYm = end || { y: now.getFullYear(), m: now.getMonth() + 1 };
  return Math.max(0, index(endYm) - index(start) + 1);
};

/**
 * Merge overlapping intervals and return total months plus gaps longer than
 * minGapMonths between consecutive (sorted) intervals.
 * intervals: [{ id, start, end }] with end null = ongoing.
 */
export const summarizeIntervals = (
  intervals,
  { now = new Date(), minGapMonths = 6 } = {},
) => {
  const nowYm = { y: now.getFullYear(), m: now.getMonth() + 1 };
  const spans = intervals
    .filter((i) => i.start)
    .map((i) => ({
      id: i.id,
      from: index(i.start),
      to: index(i.end || nowYm),
    }))
    .filter((s) => s.to >= s.from)
    .sort((a, b) => a.from - b.from);

  let total = 0;
  const gaps = [];
  let current = null;
  for (const span of spans) {
    if (!current) {
      current = { ...span };
      continue;
    }
    if (span.from <= current.to + 1) {
      current.to = Math.max(current.to, span.to);
      current.id = span.to >= current.to ? span.id : current.id;
    } else {
      total += current.to - current.from + 1;
      const gap = span.from - current.to - 1;
      if (gap >= minGapMonths) {
        gaps.push({ afterId: current.id, beforeId: span.id, months: gap });
      }
      current = { ...span };
    }
  }
  if (current) total += current.to - current.from + 1;
  return { totalMonths: total, gaps };
};
