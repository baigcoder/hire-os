/**
 * Blind-review redaction: remove identity details from resume text before
 * any LLM scores it, so name, contact details, photo links and protected
 * characteristics can't influence screening.
 *
 * Deterministic and conservative: it removes the candidate's known name,
 * contact details, profile links and lines that state personal attributes.
 * Skills, roles, employers, schools and dates stay — they are job evidence.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const URL =
  /\b(?:https?:\/\/|www\.)\S+|\b(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|twitter\.com|x\.com|instagram\.com|facebook\.com)\/\S*/gi;
const PERSONAL_LINE =
  /^\s*(date of birth|dob|d\.o\.b|birth ?date|age|gender|sex|marital status|nationality|religion|ethnicity|race|citizenship|passport|cnic|national id|father'?s name|husband'?s name|address|home address|photo)\b\s*[:\-–]/i;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const NAME_LINE = /^[A-Z][a-zA-Z'’.-]+(?:\s+[A-Z][a-zA-Z'’.-]+){1,3}$/;
const NOT_A_NAME =
  /^(resume|curriculum vitae|cv|profile|summary|software|senior|junior|data|full stack|backend|frontend)\b/i;

/** The resume's first line, when it looks like a person's name. */
export const headerName = (text) => {
  const first =
    text
      .split("\n")
      .find((line) => line.trim())
      ?.trim() ?? "";
  return NAME_LINE.test(first) && !NOT_A_NAME.test(first) ? first : null;
};

/**
 * @param {string} text
 * @param {{ names?: string[] }} known  identity values from the user record
 * @returns {{ text: string, counts: Record<string, number> }}
 */
export const redactForBlindReview = (text, { names = [] } = {}) => {
  const counts = { name: 0, email: 0, phone: 0, link: 0, personal: 0 };
  const count = (key) => () => {
    counts[key]++;
    return `[${key === "link" ? "link" : key}]`;
  };

  let out = text
    .split("\n")
    .map((line) => {
      if (PERSONAL_LINE.test(line)) {
        counts.personal++;
        return "[personal details removed]";
      }
      return line;
    })
    .join("\n");

  out = out.replace(EMAIL, count("email"));
  out = out.replace(URL, count("link"));
  out = out.replace(PHONE, (match) => {
    // Keep years and year ranges ("2019 - 2021"); phones have 8+ digits
    const digits = match.replace(/\D/g, "");
    if (digits.length < 8 || /^(19|20)\d{2}(19|20)\d{2}$/.test(digits)) {
      return match;
    }
    counts.phone++;
    return "[phone]";
  });

  // Full name first, then individual name parts of 3+ letters. The resume's
  // own header name is included because it often differs from the account
  // name (nicknames, maiden names, transliterations).
  const fullNames = [...names, headerName(text)]
    .filter(Boolean)
    .map((n) => n.trim())
    .filter(Boolean);
  const parts = [
    ...new Set(
      fullNames.flatMap((n) => n.split(/\s+/)).filter((p) => p.length >= 3),
    ),
  ];
  // Full names match case-insensitively; single parts only as capitalized
  // words, so a name like "Will" doesn't erase the verb "will".
  const patterns = [
    ...fullNames.map((n) => new RegExp(`\\b${escapeRegex(n)}\\b`, "gi")),
    ...parts.map((p) => {
      const capitalized = p[0].toUpperCase() + p.slice(1).toLowerCase();
      return new RegExp(
        `\\b(${escapeRegex(capitalized)}|${escapeRegex(p.toUpperCase())})\\b`,
        "g",
      );
    }),
  ];
  for (const re of patterns) {
    out = out.replace(re, () => {
      counts.name++;
      return "[Candidate]";
    });
  }

  return { text: out, counts };
};
