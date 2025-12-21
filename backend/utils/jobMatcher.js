/**
 * AI Job Matching Utility with RAG Context
 * Uses Gemini AI + RAG for smart context-aware matching
 * Returns match percentage, skill gap analysis, and similar candidate insights
 */

import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { getResumeAnalysisContext } from "./vectorStore.js";
import { callAI, parseAIJson } from "./aiServiceV3.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Calculate match score between a student and a job
 * NOW WITH RAG CONTEXT for smarter matching
 * @param {Object} student - Student user object with profile
 * @param {Object} job - Job object with requirements
 * @returns {Object} Match result with score and analysis
 */
export async function calculateJobMatch(student, job, options = {}) {
  try {
    console.log(`🔍 [RAG] Calculating match for "${job.title}"...`);
    const startTime = Date.now();
    const { useAI = true } = options;

    // Extract student data
    const studentProfile = {
      skills: student.profile?.skills || [],
      experience: student.profile?.experience || [],
      education: student.profile?.education || [],
      bio: student.profile?.bio || "",
      location: student.profile?.location || "",
      resumeText: buildCandidateText(student),
      preferences: {
        locations: student.jobPreferences?.locations || [],
        jobTypes: student.jobPreferences?.jobTypes || [],
        industries: student.jobPreferences?.industries || [],
      },
    };

    // Extract job requirements
    const jobRequirements = {
      title: job.title,
      description: job.description,
      requirements: job.requirements || [],
      skills: job.skills || [],
      experience: job.experienceLevel ?? null,
      salary: job.salary,
      location: job.location,
      jobType: job.jobType,
      educationRequired: job.educationRequired || "Any",
      isRemote:
        !!job.isRemote || (job.jobType || "").toLowerCase() === "remote",
    };

    // Quick match calculation (without AI for speed)
    const quickScore = calculateQuickMatch(studentProfile, jobRequirements);

    // For potential matches (score >= 30), use RAG-enhanced AI analysis
    if (useAI && quickScore.total >= 30) {
      console.log(
        `   📊 [RAG] Quick score: ${quickScore.total}/100 - Running RAG analysis...`,
      );

      // Get RAG context for similar candidates
      const ragContext = await getRAGContext(studentProfile, jobRequirements);

      // Get AI analysis with RAG context
      const aiAnalysis = await getAIMatchAnalysisWithRAG(
        studentProfile,
        jobRequirements,
        ragContext,
      );

      const latency = Date.now() - startTime;
      const aiScore =
        typeof aiAnalysis.matchScore === "number"
          ? aiAnalysis.matchScore
          : null;
      const finalScore =
        aiScore === null
          ? quickScore.total
          : Math.round(quickScore.total * 0.35 + aiScore * 0.65);
      console.log(
        `   ✅ [RAG] Match complete: ${finalScore}/100 (${latency}ms)`,
      );

      return {
        ...quickScore,
        ...aiAnalysis,
        total: Math.min(100, Math.max(0, finalScore)),
        ragContext: ragContext.summary,
        jobId: job._id,
        studentId: student._id,
        analysisMethod: "rag-enhanced",
        latency,
      };
    }

    console.log(
      `   ⚡ [QUICK] Low match: ${quickScore.total}/100 - Skipping RAG`,
    );
    return {
      ...quickScore,
      jobId: job._id,
      studentId: student._id,
      recommendation: "Low Match - Consider upskilling",
      analysisMethod: "quick-only",
    };
  } catch (error) {
    console.error("❌ [RAG] Job matching error:", error.message);
    return {
      total: 50,
      breakdown: {},
      error: error.message,
      analysisMethod: "fallback",
    };
  }
}

/**
 * Get RAG context for smarter matching
 */
async function getRAGContext(student, job) {
  try {
    const resumeText = [
      student.bio,
      `Skills: ${student.skills.join(", ")}`,
      `Experience: ${JSON.stringify(student.experience).substring(0, 500)}`,
    ].join("\n");

    const jobText = `${job.title}: ${job.description?.substring(0, 500) || ""}`;

    // Get similar candidates and insights from vector store
    const context = await getResumeAnalysisContext(resumeText, jobText);

    return {
      similarCandidates: context.similarCandidates || [],
      insights: context.insights || [],
      summary: `Found ${context.similarCandidates?.length || 0} similar profiles`,
    };
  } catch (error) {
    console.log("   ⚠️ [RAG] Context retrieval skipped:", error.message);
    return { similarCandidates: [], insights: [], summary: "No RAG context" };
  }
}

/**
 * Quick rule-based matching (fast, no API call)
 */
function calculateQuickMatch(student, job) {
  let score = 0;
  const breakdown = {
    skills: 0,
    experience: 0,
    education: 0,
    location: 0,
    industry: 0,
  };
  const matchedSkills = [];
  const missingSkills = [];

  // Skills matching
  const studentSkills = normalizeSkills(student.skills || []);
  const jobSkills = normalizeSkills(
    uniqStrings([
      ...(job.skills || []),
      ...extractSkillsFromText(
        `${job.title}\n${job.requirements?.join("\n") || ""}\n${job.description || ""}`,
      ),
    ]),
  );

  jobSkills.forEach((skill) => {
    if (studentSkills.has(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const skillsRatio =
    jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0.45;
  breakdown.skills = Math.round(Math.min(50, skillsRatio * 50));
  score += breakdown.skills;

  const studentYears = estimateExperienceYears(student.experience || []);
  const jobYears = typeof job.experience === "number" ? job.experience : null;
  if (jobYears === null) {
    breakdown.experience = studentYears > 0 ? 14 : 7;
  } else if (jobYears <= 0) {
    breakdown.experience = 14;
  } else {
    breakdown.experience = Math.round(
      Math.min(20, (studentYears / jobYears) * 20),
    );
  }
  score += breakdown.experience;

  const studentEduRank = getStudentEducationRank(student.education);
  const jobEduRank = getJobEducationRank(job.educationRequired);
  if (jobEduRank === null) {
    breakdown.education = studentEduRank === null ? 6 : 10;
  } else if (studentEduRank === null) {
    breakdown.education = 2;
  } else if (studentEduRank >= jobEduRank) {
    breakdown.education = 10;
  } else if (studentEduRank === jobEduRank - 1) {
    breakdown.education = 7;
  } else {
    breakdown.education = 3;
  }
  score += breakdown.education;

  const jobLocation = (job.location || "").toLowerCase();
  const studentLocation = (student.location || "").toLowerCase();
  const jobRemote =
    job.isRemote ||
    jobLocation.includes("remote") ||
    jobLocation.includes("work from home");
  if (jobRemote) {
    breakdown.location = 10;
  } else if (
    studentLocation &&
    jobLocation &&
    (jobLocation.includes(studentLocation) ||
      studentLocation.includes(jobLocation))
  ) {
    breakdown.location = 10;
  } else {
    breakdown.location = 5;
  }
  score += breakdown.location;

  breakdown.industry = calculateIndustryScore(student, job);
  score += breakdown.industry;

  const profileScore =
    (studentSkills.size > 0 ? 2 : 0) +
    (student.bio ? 2 : 0) +
    (Array.isArray(student.experience) && student.experience.length > 0
      ? 1
      : 0);
  score += profileScore;

  return {
    total: Math.min(100, Math.round(score)),
    breakdown,
    matchedSkills,
    missingSkills,
    rating: getRating(score),
  };
}

/**
 * Get detailed AI analysis with RAG context for smarter matches
 * Uses GPT-4o-mini via aiServiceV3 for better results
 */
async function getAIMatchAnalysisWithRAG(student, job, ragContext) {
  try {
    console.log("   🤖 [AI] Calling GPT-4o-mini with RAG context...");

    // Build RAG context string
    const ragInsights =
      ragContext.similarCandidates.length > 0
        ? `\nSIMILAR CANDIDATES HIRED FOR THIS ROLE:\n${ragContext.similarCandidates
            .slice(0, 3)
            .map(
              (c, i) =>
                `${i + 1}. Score: ${c.similarity}% - ${c.metadata?.skills?.slice(0, 3).join(", ") || "N/A"}`,
            )
            .join(
              "\n",
            )}\n\nINSIGHTS:\n${ragContext.insights.slice(0, 3).join("\n")}`
        : "";

    const result = await callAI(
      [
        {
          role: "system",
          content: `You are an expert job matcher. Analyze candidate-job fit with precision. Consider past hiring patterns when available.`,
        },
        {
          role: "user",
          content: `Analyze this job match and provide precise scoring and a short, actionable explanation. Do not invent skills; only use skills that appear in the job or candidate data.

CANDIDATE:
- Skills: ${student.skills.join(", ") || "Not specified"}
- Experience: ${JSON.stringify(student.experience).substring(0, 400) || "Not specified"}
- Education: ${JSON.stringify(student.education).substring(0, 200) || "Not specified"}
- Bio: ${student.bio?.substring(0, 200) || "Not provided"}
- Location: ${student.location || "Not specified"}

JOB:
- Title: ${job.title}
- Description: ${(job.description || "").substring(0, 400)}
- Required Skills: ${(job.skills || []).join(", ") || "Not specified"}
- Experience Level: ${job.experience || "Any"}
${ragInsights}

Return ONLY valid JSON:
{
    "matchScore": <50-100>,
    "rating": "<Excellent|Strong|Good|Fair>",
    "whyGoodFit": "<One sentence, concrete reason>",
    "keySkillsMatch": ["<skill>", "<skill>", "<skill>"],
    "topStrengths": ["<strength 1>", "<strength 2>"],
    "skillGaps": ["<gap 1>", "<gap 2>"],
    "recommendedNextSteps": ["<step 1>", "<step 2>"],
    "recommendation": "<One sentence action item>",
    "interviewTip": "<One interview preparation tip>",
    "confidenceLevel": "<High|Medium|Low>"
}`,
        },
      ],
      {
        temperature: 0.3,
        maxTokens: 500,
        feature: "JOB_MATCHING",
      },
    );

    console.log(
      `   ✅ [AI] Response from ${result.model} (${result.latency}ms)`,
    );

    const parsed = parseAIJson(result.content);
    return {
      ...parsed,
      aiModel: result.model,
      aiLatency: result.latency,
    };
  } catch (error) {
    console.log(
      "   ⚠️ [AI] Analysis failed, using Gemini fallback:",
      error.message,
    );
    // Fallback to direct Gemini
    return await getAIMatchAnalysis(student, job);
  }
}

/**
 * Fallback: Direct Gemini analysis (no RAG)
 */
async function getAIMatchAnalysis(student, job) {
  try {
    const prompt = `Analyze job match between candidate and position. Be concise.

CANDIDATE:
- Skills: ${student.skills.join(", ") || "Not specified"}
- Experience: ${JSON.stringify(student.experience).substring(0, 500) || "Not specified"}
- Education: ${JSON.stringify(student.education).substring(0, 300) || "Not specified"}

JOB:
- Title: ${job.title}
- Description: ${(job.description || "").substring(0, 500)}
- Required Skills: ${(job.skills || []).join(", ") || "Not specified"}
- Experience Level: ${job.experience || "Any"}

Provide JSON only:
{
  "matchScore": <50-100>,
  "rating": "<Excellent|Strong|Good|Fair>",
  "topStrengths": ["strength1", "strength2"],
  "skillGaps": ["skill1", "skill2"],
  "recommendation": "One sentence advice",
  "interviewTip": "One interview preparation tip"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        }),
      },
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.log("AI analysis skipped:", error.message);
  }

  return {};
}

/**
 * Get rating based on score
 */
function getRating(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 40) return "Fair";
  return "Low";
}

/**
 * Get matched jobs for a student
 * @param {string} studentId - Student user ID
 * @param {Object} options - Filter options
 * @returns {Array} Matched jobs with scores
 */
export async function getMatchedJobsForStudent(studentId, options = {}) {
  try {
    const student = await User.findById(studentId).lean();
    if (!student) {
      throw new Error("Student not found");
    }

    const desiredLimit = options.limit || 50;

    const baseQuery = { isActive: true };
    const preferredQuery = { ...baseQuery };

    if (!options.location) {
      const locations = Array.isArray(student.jobPreferences?.locations)
        ? student.jobPreferences.locations
        : [];
      if (locations.length > 0) {
        preferredQuery.$or = locations
          .map((loc) => (typeof loc === "string" ? loc.trim() : ""))
          .filter(Boolean)
          .slice(0, 5)
          .map((loc) => ({ location: new RegExp(loc, "i") }));
      }
    }

    if (!options.jobType) {
      const jobTypes = Array.isArray(student.jobPreferences?.jobTypes)
        ? student.jobPreferences.jobTypes
        : [];
      if (jobTypes.length > 0) {
        preferredQuery.jobType = { $in: jobTypes };
      }
    }

    const industries = Array.isArray(student.jobPreferences?.industries)
      ? student.jobPreferences.industries
      : [];
    if (industries.length > 0) {
      const rx = industries
        .map((i) => (typeof i === "string" ? i.trim() : ""))
        .filter(Boolean)
        .slice(0, 5)
        .map((i) => new RegExp(i, "i"));
      if (rx.length > 0) {
        preferredQuery.industry = { $in: rx };
      }
    }

    if (options.location)
      preferredQuery.location = new RegExp(options.location, "i");
    if (options.jobType) preferredQuery.jobType = options.jobType;

    const jobs = await Job.find(preferredQuery)
      .populate("company", "name logo")
      .sort({ createdAt: -1 })
      .limit(desiredLimit)
      .lean();

    if (jobs.length < desiredLimit) {
      const additionalJobs = await Job.find({
        ...baseQuery,
        _id: { $nin: jobs.map((j) => j._id) },
      })
        .populate("company", "name logo")
        .sort({ createdAt: -1 })
        .limit(desiredLimit - jobs.length)
        .lean();
      jobs.push(...additionalJobs);
    }

    const quickJobs = await Promise.all(
      jobs.map(async (job) => {
        const match = await calculateJobMatch(student, job, { useAI: false });
        return { job, match };
      }),
    );

    quickJobs.sort((a, b) => (b.match.total || 0) - (a.match.total || 0));

    const aiTop = Math.max(0, Math.min(8, quickJobs.length));
    const top = quickJobs.slice(0, aiTop);
    const rest = quickJobs.slice(aiTop);

    const enhancedTop = await Promise.all(
      top.map(async ({ job }) => {
        const match = await calculateJobMatch(student, job, { useAI: true });
        return { job, match };
      }),
    );

    const merged = [...enhancedTop, ...rest];

    const matchedJobs = merged.map(({ job, match }) => ({
      ...job,
      match: {
        score: match.total || match.matchScore || 50,
        rating: match.rating || "Fair",
        matchedSkills: match.matchedSkills || match.keySkillsMatch || [],
        missingSkills: match.missingSkills || match.skillGaps || [],
        recommendation: match.recommendation || match.whyGoodFit || "",
        interviewTip: match.interviewTip || "",
        confidenceLevel: match.confidenceLevel || "",
        breakdown: match.breakdown || {},
        analysisMethod: match.analysisMethod || "",
        ragContext: match.ragContext || "",
        whyGoodFit: match.whyGoodFit || "",
        topStrengths: match.topStrengths || [],
        recommendedNextSteps: match.recommendedNextSteps || [],
        aiModel: match.aiModel || "",
      },
    }));

    matchedJobs.sort((a, b) => (b.match.score || 0) - (a.match.score || 0));

    return matchedJobs;
  } catch (error) {
    console.error("Get matched jobs error:", error);
    throw error;
  }
}

function buildCandidateText(student) {
  const skills = Array.isArray(student.profile?.skills)
    ? student.profile.skills
    : [];
  const bio = student.profile?.bio || "";
  const location = student.profile?.location || "";
  const exp = Array.isArray(student.profile?.experience)
    ? student.profile.experience
    : [];
  const edu = Array.isArray(student.profile?.education)
    ? student.profile.education
    : [];

  const expLines = exp
    .map((e) => {
      const parts = [e.title, e.company, e.location, e.description].filter(
        Boolean,
      );
      return parts.join(" | ");
    })
    .filter(Boolean);

  const eduLines = edu
    .map((e) => {
      const parts = [e.school, e.degree, e.fieldOfStudy, e.description].filter(
        Boolean,
      );
      return parts.join(" | ");
    })
    .filter(Boolean);

  return [
    bio,
    location ? `Location: ${location}` : "",
    skills.length ? `Skills: ${skills.join(", ")}` : "",
    expLines.length ? `Experience:\n${expLines.join("\n")}` : "",
    eduLines.length ? `Education:\n${eduLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getJobEducationRank(educationRequired) {
  const v = (educationRequired || "").toString().trim().toLowerCase();
  if (!v || v === "any") return null;
  if (v.includes("high")) return 0;
  if (v.includes("associate")) return 1;
  if (v.includes("bachelor")) return 2;
  if (v.includes("master")) return 3;
  if (v.includes("phd") || v.includes("doctor")) return 4;
  return null;
}

function getStudentEducationRank(education) {
  if (!Array.isArray(education) || education.length === 0) return null;

  let best = null;
  for (const e of education) {
    const degree = (e?.degree || e?.fieldOfStudy || "")
      .toString()
      .toLowerCase();
    const r =
      degree.includes("phd") || degree.includes("doctor")
        ? 4
        : degree.includes("master") ||
            degree.includes("msc") ||
            degree.includes("mba")
          ? 3
          : degree.includes("bachelor") ||
              degree.includes("bsc") ||
              degree.includes("bs") ||
              degree.includes("be") ||
              degree.includes("b.e")
            ? 2
            : degree.includes("associate") || degree.includes("diploma")
              ? 1
              : degree.includes("high school") || degree.includes("secondary")
                ? 0
                : null;
    if (r === null) continue;
    best = best === null ? r : Math.max(best, r);
  }
  return best;
}

function normalizeIndustry(raw) {
  return (raw || "").toString().trim().toLowerCase();
}

function calculateIndustryScore(student, job) {
  const jobIndustry = normalizeIndustry(job.industry);
  if (!jobIndustry) return 2;

  const prefs = Array.isArray(student.preferences?.industries)
    ? student.preferences.industries
    : [];
  const prefHit = prefs.some(
    (p) => normalizeIndustry(p) && jobIndustry.includes(normalizeIndustry(p)),
  );
  if (prefHit) return 5;

  const resumeText = (student.resumeText || "").toString().toLowerCase();
  if (resumeText && resumeText.includes(jobIndustry)) return 4;

  return 1;
}

function uniqStrings(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function normalizeSkill(raw) {
  const v = (raw || "").toString().toLowerCase().trim();
  if (!v) return "";
  const cleaned = v
    .replace(/[()]/g, " ")
    .replace(/[+]/g, " + ")
    .replace(/[./_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aliases = new Map([
    ["node js", "node"],
    ["nodejs", "node"],
    ["react js", "react"],
    ["reactjs", "react"],
    ["next js", "nextjs"],
    ["next", "nextjs"],
    ["mongo db", "mongodb"],
    ["postgre sql", "postgresql"],
    ["ts", "typescript"],
    ["js", "javascript"],
  ]);

  return aliases.get(cleaned) || cleaned;
}

function normalizeSkills(skills) {
  const set = new Set();
  for (const s of Array.isArray(skills) ? skills : []) {
    const n = normalizeSkill(s);
    if (n) set.add(n);
  }
  return set;
}

function extractSkillsFromText(text) {
  const t = (text || "").toLowerCase();
  if (!t) return [];

  const known = [
    "react",
    "next.js",
    "vue",
    "angular",
    "svelte",
    "javascript",
    "typescript",
    "node",
    "express",
    "nestjs",
    "python",
    "django",
    "flask",
    "java",
    "spring",
    "c#",
    "dotnet",
    "go",
    "golang",
    "rust",
    "php",
    "laravel",
    "graphql",
    "rest",
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "tailwind",
    "html",
    "css",
    "git",
    "github",
    "sql",
    "firebase",
    "supabase",
  ];

  const found = [];
  for (const skill of known) {
    const needle = skill.toLowerCase();
    const normalizedNeedle = needle.replace(".", "\\.");
    const rx = new RegExp(
      `\\b${normalizedNeedle.replace(/\s+/g, "\\s+")}\\b`,
      "i",
    );
    if (rx.test(t)) found.push(skill);
  }
  return found;
}

function estimateExperienceYears(experience) {
  if (!Array.isArray(experience) || experience.length === 0) return 0;
  let months = 0;
  for (const item of experience) {
    const from = item?.from ? new Date(item.from) : null;
    const to = item?.to ? new Date(item.to) : null;
    const current = !!item?.current;
    const end = current ? new Date() : to;
    if (
      from instanceof Date &&
      !Number.isNaN(from.valueOf()) &&
      end instanceof Date &&
      !Number.isNaN(end.valueOf()) &&
      end >= from
    ) {
      months += Math.max(
        1,
        Math.round((end - from) / (1000 * 60 * 60 * 24 * 30)),
      );
    } else {
      months += 6;
    }
  }
  return Math.min(20, Math.round((months / 12) * 10) / 10);
}

/**
 * Get match score for a specific job application
 */
export async function getApplicationMatchScore(studentId, jobId) {
  try {
    const student = await User.findById(studentId).lean();
    const job = await Job.findById(jobId).lean();

    if (!student || !job) {
      return { total: 0, error: "Student or Job not found" };
    }

    return await calculateJobMatch(student, job);
  } catch (error) {
    console.error("Application match error:", error);
    return { total: 0, error: error.message };
  }
}

export default {
  calculateJobMatch,
  getMatchedJobsForStudent,
  getApplicationMatchScore,
};
