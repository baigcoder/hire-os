import request from "supertest";
import { buildOriginChecker } from "../../../utils/corsOrigins.js";
import { app } from "../../../index.js";

describe("buildOriginChecker", () => {
  const previewEnv = {
    VERCEL_PREVIEW_PROJECT: "hire-os",
    VERCEL_PREVIEW_SCOPE: "baigcoders-projects",
  };

  it.each([
    "http://localhost:5173",
    "https://hire-os.vercel.app",
    "https://hireos.vercel.app",
  ])("allows built-in origin %s", (origin) => {
    expect(buildOriginChecker({})(origin)).toBe(true);
  });

  it("allows FRONTEND_URL and CORS_ORIGINS, normalizing trailing slashes", () => {
    const allowed = buildOriginChecker({
      FRONTEND_URL: "https://app.example.com/",
      CORS_ORIGINS: " https://a.example.com , https://b.example.com",
    });
    expect(allowed("https://app.example.com")).toBe(true);
    expect(allowed("https://a.example.com")).toBe(true);
    expect(allowed("https://b.example.com")).toBe(true);
  });

  it.each([
    "https://evil.vercel.app",
    "https://hire-os-evil.vercel.app",
    "https://evil-vercel.app",
    "https://hire-os.vercel.app.attacker.com",
    "http://hire-os.vercel.app",
    "null",
    "",
  ])("rejects %s without preview config", (origin) => {
    expect(buildOriginChecker({})(origin || undefined)).toBe(false);
  });

  it.each([
    "https://hire-os-abc123xyz-baigcoders-projects.vercel.app",
    "https://hire-os-git-feature-login-baigcoders-projects.vercel.app",
  ])("allows this project's preview %s when configured", (origin) => {
    expect(buildOriginChecker(previewEnv)(origin)).toBe(true);
  });

  it.each([
    // Other projects / other accounts
    "https://other-app-abc123-baigcoders-projects.vercel.app",
    "https://hire-os-abc123-attacker.vercel.app",
    "https://hire-os-abc123-baigcoders-projects-x.vercel.app",
    // Lookalikes and non-https
    "https://hire-os-abc123-baigcoders-projects.vercel.app.evil.com",
    "http://hire-os-abc123-baigcoders-projects.vercel.app",
    "https://hire-os-abc123-baigcoders-projects.vercel.app:8443",
    "https://evil.vercel.app",
  ])("rejects %s even with preview config", (origin) => {
    expect(buildOriginChecker(previewEnv)(origin)).toBe(false);
  });
});

describe("CORS on the app", () => {
  it("returns CORS headers for an allowed origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://hire-os.vercel.app");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "https://hire-os.vercel.app",
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("refuses an arbitrary vercel.app origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://attacker.vercel.app");
    expect(res.status).toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
