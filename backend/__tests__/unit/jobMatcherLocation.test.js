import { calculateJobMatch, locationText } from "../../utils/jobMatcher.js";

describe("job matching with structured profile locations", () => {
  it("reads both location shapes", () => {
    expect(locationText({ city: "Lahore", country: "Pakistan" })).toBe("Lahore, Pakistan");
    expect(locationText({ country: "Pakistan" })).toBe("Pakistan");
    expect(locationText("Karachi")).toBe("Karachi");
    expect(locationText(undefined)).toBe("");
  });

  it("scores a candidate whose location is an object instead of failing to a flat 50", async () => {
    const student = {
      _id: "s1",
      profile: { skills: ["Node.js", "PostgreSQL", "AWS"], location: { city: "Lahore", country: "Pakistan" } },
    };
    const job = {
      _id: "j1",
      title: "Backend engineer",
      description: "Build APIs.",
      requirements: ["Node.js", "PostgreSQL", "AWS"],
      location: "Lahore",
      jobType: "Full-time",
      experienceLevel: 0,
    };
    const match = await calculateJobMatch(student, job, { useAI: false });
    expect(match.analysisMethod).not.toBe("fallback");
    expect(match.error).toBeUndefined();
    expect(match.matchedSkills.map((s) => s.toLowerCase())).toEqual(expect.arrayContaining(["postgresql", "aws"]));
    expect(match.breakdown.location).toBe(10); // same city
    expect(match.total).toBeGreaterThan(50);
  });
});
