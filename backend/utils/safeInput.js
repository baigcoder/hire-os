// Small validators for user input that is stored and later used in links, regexes or queries.

/** Escape a string for literal use inside a RegExp. */
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** http(s) URL (normalised) or undefined. Blocks javascript:/data: links. */
export const safeHttpUrl = (value) => {
  if (typeof value !== "string" || value.length > 300) return undefined;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : undefined;
  } catch {
    return undefined;
  }
};

/** Array of at most `max` non-empty strings, each cut to `len` characters. */
export const cleanStringList = (value, max = 5, len = 60) =>
  Array.isArray(value)
    ? value
        .filter((v) => typeof v === "string")
        .map((v) => v.trim().slice(0, len))
        .filter(Boolean)
        .slice(0, max)
    : [];
