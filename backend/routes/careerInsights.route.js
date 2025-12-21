/**
 * Career Insights Routes
 * AI-powered career analysis: Skill Gap, Salary Insights, Learning Resources
 */

import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { callAI, parseAIJson } from "../utils/aiServiceV3.js";
import { getCache, setCache, getCacheKey } from "../utils/apiCache.js";

const router = express.Router();

// Cache TTL: 10 minutes for AI responses
const AI_CACHE_TTL = 10 * 60 * 1000;

/**
 * Get Skill Gap Analysis
 * GET /api/v1/career-insights/skill-gap
 */
router.get("/skill-gap", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;

    // Check cache first
    const cacheKey = getCacheKey("skill-gap", userId);
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache HIT: skill-gap for user ${userId}`);
      return res.status(200).json(cached);
    }

    const user = await User.findById(userId).select(
      "profile.skills profile.experience fullname",
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userSkills = user.profile?.skills || [];

    // Get trending job requirements from recent jobs
    const recentJobs = await Job.find({ status: "active" })
      .select("requirements title company")
      .limit(50)
      .lean();

    // Extract all required skills from jobs
    const allRequiredSkills = recentJobs.flatMap(
      (job) => job.requirements || [],
    );
    const skillFrequency = {};
    allRequiredSkills.forEach((skill) => {
      const normalized = skill.toLowerCase().trim();
      skillFrequency[normalized] = (skillFrequency[normalized] || 0) + 1;
    });

    // Sort by frequency
    const trendingSkills = Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, demand: count }));

    // AI Analysis
    const aiResult = await callAI(
      [
        {
          role: "system",
          content:
            "You are a career advisor analyzing skill gaps. Provide actionable insights.",
        },
        {
          role: "user",
          content: `Analyze skill gap for this candidate.

CANDIDATE SKILLS: ${userSkills.join(", ") || "None listed"}

TOP IN-DEMAND SKILLS IN MARKET:
${trendingSkills
  .slice(0, 10)
  .map((s) => `- ${s.skill} (${s.demand} jobs)`)
  .join("\n")}

Return JSON:
{
    "overallReadiness": <0-100>,
    "strongSkills": ["<skills candidate has that are in demand>"],
    "skillGaps": ["<critical skills candidate is missing>"],
    "recommendations": ["<3 specific action items>"],
    "careerAdvice": "<1 paragraph personalized advice>",
    "prioritySkills": [{"skill": "<name>", "priority": "<High|Medium|Low>", "reason": "<why>"}]
}`,
        },
      ],
      {
        temperature: 0.4,
        maxTokens: 800,
        feature: "RECOMMENDATION",
      },
    );

    const analysis = parseAIJson(aiResult.content);

    const responseData = {
      success: true,
      userSkills,
      trendingSkills,
      analysis: {
        ...analysis,
        analyzedAt: new Date().toISOString(),
        model: aiResult.model,
      },
    };

    // Cache the response
    setCache(cacheKey, responseData, AI_CACHE_TTL);
    console.log(`💾 Cached: skill-gap for user ${userId}`);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Skill gap analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze skill gap",
      error: error.message,
    });
  }
});

/**
 * Get Salary Insights
 * GET /api/v1/career-insights/salary
 */
router.get("/salary", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;

    // Check cache first
    const cacheKey = getCacheKey("salary", userId);
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache HIT: salary for user ${userId}`);
      return res.status(200).json(cached);
    }

    const user = await User.findById(userId).select(
      "profile.skills profile.experience profile.location jobPreferences",
    );

    const userSkills = user?.profile?.skills || [];
    const experienceYears = user?.profile?.experience?.length || 0;
    const userLocation =
      user?.profile?.location?.city ||
      user?.jobPreferences?.locations?.[0] ||
      null;
    const userCountry = user?.profile?.location?.country || "Pakistan";

    // Build job query - prioritize location-matched jobs
    let jobQuery = { status: "active", salary: { $exists: true } };

    // Get location-matched jobs first, then general jobs
    let jobs = [];
    if (userLocation) {
      // Find jobs matching user's location
      const locationJobs = await Job.find({
        ...jobQuery,
        location: { $regex: userLocation, $options: "i" },
      })
        .select("salary title requirements location jobType")
        .limit(50)
        .lean();
      jobs = locationJobs;
    }

    // If not enough location-matched jobs, add general jobs
    if (jobs.length < 30) {
      const generalJobs = await Job.find(jobQuery)
        .select("salary title requirements location jobType")
        .limit(100 - jobs.length)
        .lean();
      jobs = [...jobs, ...generalJobs];
    }

    // Extract salary ranges
    const salaryData = jobs
      .map((job) => {
        const salaryStr = String(job.salary);
        const numbers = salaryStr.match(/\d+/g);
        if (numbers) {
          return {
            title: job.title,
            location: job.location,
            min:
              parseInt(numbers[0]) * (salaryStr.includes("LPA") ? 100000 : 1),
            max: numbers[1]
              ? parseInt(numbers[1]) * (salaryStr.includes("LPA") ? 100000 : 1)
              : parseInt(numbers[0]) * (salaryStr.includes("LPA") ? 100000 : 1),
          };
        }
        return null;
      })
      .filter(Boolean);

    // AI Analysis
    const aiResult = await callAI(
      [
        {
          role: "system",
          content:
            "You are a salary analyst. Provide realistic salary expectations based on skills and market data.",
        },
        {
          role: "user",
          content: `Analyze salary potential for this candidate.

CANDIDATE SKILLS: ${userSkills.join(", ") || "General"}
EXPERIENCE ENTRIES: ${experienceYears}
LOCATION: ${userLocation || userCountry}
COUNTRY: ${userCountry}

MARKET DATA (from ${userLocation || userCountry} region):
${salaryData
  .slice(0, 10)
  .map((s) => `- ${s.title} (${s.location || "Remote"}): ${s.min}-${s.max}`)
  .join("\n")}

Provide salary data in ${userCountry === "Pakistan" ? "PKR" : userCountry === "India" ? "INR" : "USD"} currency.

Return JSON:
{
    "expectedSalaryRange": {"min": <number>, "max": <number>, "currency": "${userCountry === "Pakistan" ? "PKR" : userCountry === "India" ? "INR" : "USD"}"},
    "marketPosition": "<Below Average|Average|Above Average|Top Tier>",
    "growthPotential": "<percentage increase possible with upskilling>",
    "topPayingRoles": ["<3 high-paying roles matching skills in ${userLocation || userCountry}>"],
    "negotiationTips": ["<3 salary negotiation tips for ${userCountry} market>"],
    "byExperience": [
        {"years": "0-2", "range": "<salary range>"},
        {"years": "2-5", "range": "<salary range>"},
        {"years": "5+", "range": "<salary range>"}
    ],
    "locationInsight": "<brief insight about ${userLocation || userCountry} job market>"
}`,
        },
      ],
      {
        temperature: 0.4,
        maxTokens: 700,
        feature: "RECOMMENDATION",
      },
    );

    const insights = parseAIJson(aiResult.content);

    const responseData = {
      success: true,
      userSkills,
      experienceLevel: experienceYears,
      marketDataPoints: salaryData.length,
      userLocation: userLocation || userCountry,
      currency:
        userCountry === "Pakistan"
          ? "PKR"
          : userCountry === "India"
            ? "INR"
            : "USD",
      insights: {
        ...insights,
        userLocation: userLocation || userCountry,
        analyzedAt: new Date().toISOString(),
      },
    };

    // Cache the response
    setCache(cacheKey, responseData, AI_CACHE_TTL);
    console.log(`💾 Cached: salary for user ${userId}`);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Salary insights error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get salary insights",
    });
  }
});

/**
 * Get Learning Resources
 * GET /api/v1/career-insights/learning
 */
router.get("/learning", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;

    // Check cache first
    const cacheKey = getCacheKey("learning", userId);
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache HIT: learning for user ${userId}`);
      return res.status(200).json(cached);
    }

    const user = await User.findById(userId).select("profile.skills");
    const userSkills = user?.profile?.skills || [];

    // Get trending skills from job market
    const jobs = await Job.find({ status: "active" })
      .select("requirements")
      .limit(50)
      .lean();

    const allSkills = jobs.flatMap((job) => job.requirements || []);
    const skillFrequency = {};
    allSkills.forEach((skill) => {
      const normalized = skill.toLowerCase().trim();
      skillFrequency[normalized] = (skillFrequency[normalized] || 0) + 1;
    });

    const inDemandSkills = Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    // AI-powered learning recommendations
    const aiResult = await callAI(
      [
        {
          role: "system",
          content:
            "You are a learning advisor. Recommend specific courses and resources with real platforms like Udemy, Coursera, YouTube, freeCodeCamp.",
        },
        {
          role: "user",
          content: `Suggest learning resources for career growth.

CURRENT SKILLS: ${userSkills.join(", ") || "Beginner"}
IN-DEMAND SKILLS: ${inDemandSkills.join(", ")}

Return JSON:
{
    "recommendedCourses": [
        {
            "title": "<course name>",
            "platform": "<Udemy|Coursera|YouTube|freeCodeCamp|Pluralsight>",
            "skill": "<skill it teaches>",
            "duration": "<estimated hours>",
            "level": "<Beginner|Intermediate|Advanced>",
            "isFree": <true|false>,
            "priority": "<High|Medium|Low>"
        }
    ],
    "learningPath": ["<step 1>", "<step 2>", "<step 3>"],
    "quickWins": ["<3 things to learn in a week>"],
    "certifications": ["<valuable certifications to pursue>"],
    "projectIdeas": ["<3 projects to build for portfolio>"]
}`,
        },
      ],
      {
        temperature: 0.6,
        maxTokens: 1000,
        feature: "RECOMMENDATION",
      },
    );

    const resources = parseAIJson(aiResult.content);

    const responseData = {
      success: true,
      userSkills,
      inDemandSkills,
      resources: {
        ...resources,
        generatedAt: new Date().toISOString(),
      },
    };

    // Cache the response
    setCache(cacheKey, responseData, AI_CACHE_TTL);
    console.log(`💾 Cached: learning for user ${userId}`);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Learning resources error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get learning resources",
    });
  }
});

/**
 * Get Career Timeline/Milestones
 * GET /api/v1/career-insights/timeline
 */
router.get("/timeline", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId)
      .select(
        "profile.experience profile.education profile.skills createdAt fullname",
      )
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Build timeline from user data
    const timeline = [];

    // Add education milestones
    (user.profile?.education || []).forEach((edu) => {
      timeline.push({
        type: "education",
        title: edu.degree || "Education",
        subtitle: edu.school || "",
        description: edu.fieldOfStudy || "",
        date: edu.to || edu.from,
        icon: "GraduationCap",
      });
    });

    // Add experience milestones
    (user.profile?.experience || []).forEach((exp) => {
      timeline.push({
        type: "experience",
        title: exp.title || "Work Experience",
        subtitle: exp.company || "",
        description: exp.description || "",
        date: exp.from,
        endDate: exp.current ? null : exp.to,
        icon: "Briefcase",
        isCurrent: exp.current,
      });
    });

    // Add profile creation
    timeline.push({
      type: "milestone",
      title: "Joined Platform",
      subtitle: "Career journey started",
      date: user.createdAt,
      icon: "Rocket",
    });

    // Add skill achievements
    const skillCount = user.profile?.skills?.length || 0;
    if (skillCount >= 5) {
      timeline.push({
        type: "achievement",
        title: "Skill Builder",
        subtitle: `Added ${skillCount} skills to profile`,
        date: new Date(),
        icon: "Award",
      });
    }

    // Sort by date (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      timeline,
      stats: {
        totalMilestones: timeline.length,
        educationCount: user.profile?.education?.length || 0,
        experienceCount: user.profile?.experience?.length || 0,
        skillCount,
      },
    });
  } catch (error) {
    console.error("Career timeline error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get career timeline",
    });
  }
});

export default router;
