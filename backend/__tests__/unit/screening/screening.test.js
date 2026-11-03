import { redactForBlindReview } from "../../../modules/screening/redact.js";
import {
  fetchResumeFile,
  ResumeSourceError,
} from "../../../modules/screening/resumeSource.js";
import { canManageJob } from "../../../utils/jobAccess.js";

describe("redactForBlindReview", () => {
  const resume = `Jordan Reyes
Backend Engineer
jordan.reyes@example.com | +1 555 010 2233 | github.com/jordan-reyes-dev | https://jordanreyes.dev
Date of Birth: 01/02/1995
Gender: Male
EXPERIENCE
Senior Software Engineer — Parcelwise, Mar 2023 – Present
• Reyes led migration to 6 Node.js microservices; we will keep improving
2019 - 2021 · 12,000 users · 40M events`;

  it("removes identity details but keeps job evidence", () => {
    const { text, counts } = redactForBlindReview(resume, {
      names: ["jordan reyes"],
    });

    expect(text).not.toMatch(/jordan/i);
    expect(text).not.toMatch(/Reyes/);
    expect(text).not.toMatch(
      /example\.com|555 010|github\.com|jordanreyes\.dev/,
    );
    expect(text).not.toMatch(/1995|Male/);
    expect(text).toMatch(/\[Candidate\]\nBackend Engineer/);
    // Evidence survives: employer, dates, numbers, ordinary words
    expect(text).toMatch(/Parcelwise, Mar 2023 – Present/);
    expect(text).toMatch(/2019 - 2021 · 12,000 users · 40M events/);
    expect(text).toMatch(/we will keep improving/);
    expect(counts).toMatchObject({ email: 1, phone: 1, link: 2, personal: 2 });
    expect(counts.name).toBeGreaterThanOrEqual(2);
  });

  it("also removes the resume's header name when it differs from the account", () => {
    const { text, counts } = redactForBlindReview(
      "Priya Natarajan\nData Analyst\nPriya built 14 dashboards.",
      { names: ["Priya N. Account-Name"] },
    );
    expect(text).toBe(
      "[Candidate]\nData Analyst\n[Candidate] built 14 dashboards.",
    );
    expect(counts.name).toBe(2);
  });

  it.each(["Senior Software Engineer", "Curriculum Vitae", "Backend Engineer"])(
    "doesn't treat the header %s as a name",
    (header) => {
      const { text } = redactForBlindReview(`${header}\nBuilt things.`, {
        names: [],
      });
      expect(text.startsWith(header)).toBe(true);
    },
  );

  it("matches name parts only as capitalized words", () => {
    const { text } = redactForBlindReview("Will Smith said he will ship it.", {
      names: ["Will Smith"],
    });
    expect(text).toBe("[Candidate] said he will ship it.");
  });
});

describe("fetchResumeFile", () => {
  it.each([
    ["not a url", "INVALID_URL"],
    ["http://169.254.169.254/latest/meta-data", "UNSUPPORTED_SOURCE"],
    ["https://evil.example.com/resume.pdf", "UNSUPPORTED_SOURCE"],
    ["http://res.cloudinary.com/demo/raw/upload/cv.pdf", "UNSUPPORTED_SOURCE"],
  ])("refuses %s", async (url, code) => {
    await expect(fetchResumeFile(url)).rejects.toMatchObject({ code });
    await expect(fetchResumeFile(url)).rejects.toBeInstanceOf(
      ResumeSourceError,
    );
  });
});

describe("canManageJob", () => {
  const job = { created_by: "u1", company: "c1" };

  it.each([
    [{ _id: "u1", role: "recruiter" }, true],
    [{ _id: "u2", role: "recruiter", companyId: "c1" }, true],
    [{ _id: "u3", role: "company_admin", companyId: "c1" }, true],
    [{ _id: "u4", role: "recruiter", companyId: "c2" }, false],
    [{ _id: "u5", role: "recruiter" }, false],
    [{ _id: "u1", role: "student" }, false],
    [null, false],
  ])("user %o → %s", (user, expected) => {
    expect(canManageJob(user, job)).toBe(expected);
  });

  it("accepts a populated company", () => {
    expect(
      canManageJob(
        { _id: "u2", role: "recruiter", companyId: "c1" },
        { created_by: "u1", company: { _id: "c1", name: "Acme" } },
      ),
    ).toBe(true);
  });
});
