// Links stored by users (company website, social profiles) are untrusted: only http(s)
// may be rendered as a href / opened, so javascript: and data: URLs can't run script.
export const safeHttpUrl = (value) => {
  if (typeof value !== "string") return undefined;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : undefined;
  } catch {
    return undefined;
  }
};

// Server-pushed navigation targets must be same-origin app paths ("/x", not "//host" or "javascript:").
export const safeInternalPath = (value) =>
  typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : undefined;
