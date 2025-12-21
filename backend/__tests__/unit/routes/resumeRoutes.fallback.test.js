import { describe, test, expect } from "@jest/globals";
import * as resumeRoutesModule from "../../../routes/resumeRoutes.js";

describe("fallbackResumeAnalysis", () => {
  const { fallbackResumeAnalysis } = resumeRoutesModule;

  test("detects matched and missing skills based on resume content", () => {
    const resumeText = `
          I have 3 years of experience with JavaScript and React.
          Strong knowledge of HTML and CSS for frontend development.
        `;

    const result = fallbackResumeAnalysis(resumeText);

    expect(result.skills.matched).toEqual(
      expect.arrayContaining(["javascript", "react", "html", "css"]),
    );
    expect(result.skills.missing).toEqual(
      expect.arrayContaining(["python", "node", "sql", "git"]),
    );
    expect(result.skills.missing).not.toEqual(
      expect.arrayContaining(["javascript", "react", "html", "css"]),
    );
  });

  test("generates targeted suggestions when important sections are missing", () => {
    const resumeText = `
          JavaScript, React, HTML, CSS
          This is a very short resume without explicit sections.
        `;

    const result = fallbackResumeAnalysis(resumeText);
    const suggestions = result.suggestions || [];

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("skills section"),
        expect.stringContaining("work experience"),
        expect.stringContaining("projects section"),
        expect.stringContaining("education section"),
      ]),
    );
  });

  test("includes link suggestion when no GitHub or LinkedIn is present", () => {
    const resumeText = `
          JavaScript developer with experience in React and Node.
          Contact: candidate@example.com
        `;

    const { suggestions } = fallbackResumeAnalysis(resumeText);

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("GitHub"),
        expect.stringContaining("LinkedIn"),
      ]),
    );
  });

  test("returns non-empty suggestions array and reasonable score bounds", () => {
    const resumeText = "Junior developer familiar with HTML and CSS.";

    const result = fallbackResumeAnalysis(resumeText);

    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
