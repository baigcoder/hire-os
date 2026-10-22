/**
 * CORS origin allow-list.
 *
 * The API uses SameSite=None auth cookies with credentialed CORS, so every
 * allowed origin can make authenticated requests on a visitor's behalf.
 * Only this project's own frontends may be allowed — never all of
 * *.vercel.app, where anyone can deploy a page.
 *
 * Allowed:
 *   - local dev servers and the production domains below
 *   - FRONTEND_URL and CORS_ORIGINS (comma-separated exact origins)
 *   - this project's Vercel preview deployments, only when both
 *     VERCEL_PREVIEW_PROJECT (e.g. "hire-os") and VERCEL_PREVIEW_SCOPE (the
 *     Vercel team/account slug, e.g. "baigcoders-projects") are set. Preview
 *     hosts look like <project>-<hash>-<scope>.vercel.app or
 *     <project>-git-<branch>-<scope>.vercel.app.
 */

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://hire-os.vercel.app",
  "https://hireos.vercel.app",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeOrigin = (value) => {
  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return null;
  }
};

export const buildOriginChecker = (env = process.env) => {
  const exact = new Set(
    [
      ...DEFAULT_ORIGINS,
      env.FRONTEND_URL,
      ...(env.CORS_ORIGINS || "").split(","),
    ]
      .filter((value) => value && value.trim())
      .map(normalizeOrigin)
      .filter(Boolean),
  );

  const project = env.VERCEL_PREVIEW_PROJECT?.trim().toLowerCase();
  const scope = env.VERCEL_PREVIEW_SCOPE?.trim().toLowerCase();
  const previewHost =
    project && scope
      ? new RegExp(
          `^${escapeRegex(project)}-[a-z0-9-]+-${escapeRegex(scope)}\\.vercel\\.app$`,
        )
      : null;

  return (origin) => {
    if (!origin) return false;
    if (exact.has(origin)) return true;
    if (!previewHost) return false;
    try {
      const url = new URL(origin);
      return (
        url.protocol === "https:" &&
        url.port === "" &&
        url.origin === origin &&
        previewHost.test(url.hostname)
      );
    } catch {
      return false;
    }
  };
};
