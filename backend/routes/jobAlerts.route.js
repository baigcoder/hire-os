/**
 * Job Alerts Routes
 * Daily personalized job alerts and notification preferences
 */

import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { callAI, parseAIJson } from "../utils/aiServiceV3.js";

const router = express.Router();

/**
 * Get/Update alert preferences
 * GET /api/v1/job-alerts/preferences
 * PUT /api/v1/job-alerts/preferences
 */
router.get("/preferences", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId).select(
      "notifications jobPreferences",
    );

    res.status(200).json({
      success: true,
      preferences: {
        emailAlerts: user.notifications?.jobAlerts ?? true,
        locations: user.jobPreferences?.locations || [],
        jobTypes: user.jobPreferences?.jobTypes || [],
        salaryMin: user.jobPreferences?.salaryMin,
        salaryMax: user.jobPreferences?.salaryMax,
        industries: user.jobPreferences?.industries || [],
      },
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get preferences",
    });
  }
});

router.put("/preferences", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const {
      emailAlerts,
      locations,
      jobTypes,
      salaryMin,
      salaryMax,
      industries,
    } = req.body;

    const updateData = {
      "notifications.jobAlerts": emailAlerts,
      "jobPreferences.locations": locations,
      "jobPreferences.jobTypes": jobTypes,
      "jobPreferences.salaryMin": salaryMin,
      "jobPreferences.salaryMax": salaryMax,
      "jobPreferences.industries": industries,
    };

    await User.findByIdAndUpdate(userId, updateData);

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update preferences",
    });
  }
});

/**
 * Get daily job matches
 * GET /api/v1/job-alerts/daily
 */
router.get("/daily", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId)
      .select("profile.skills jobPreferences savedJobs")
      .lean();

    const userSkills = user.profile?.skills || [];
    const preferences = user.jobPreferences || {};
    const savedJobIds = (user.savedJobs || []).map((id) => id.toString());

    // Build query based on preferences
    const query = { status: "active" };

    // Filter by location if specified
    if (preferences.locations?.length > 0) {
      query.location = {
        $in: preferences.locations.map((l) => new RegExp(l, "i")),
      };
    }

    // Filter by job type if specified
    if (preferences.jobTypes?.length > 0) {
      query.jobType = { $in: preferences.jobTypes };
    }

    // Get recent jobs (last 7 days prioritized)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const jobs = await Job.find(query)
      .populate("company", "name logo location")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Score jobs based on skill match
    const scoredJobs = jobs.map((job) => {
      const jobRequirements = (job.requirements || []).map((r) =>
        r.toLowerCase(),
      );
      const userSkillsLower = userSkills.map((s) => s.toLowerCase());

      const matchedSkills = jobRequirements.filter((r) =>
        userSkillsLower.some((s) => r.includes(s) || s.includes(r)),
      );

      const matchScore =
        jobRequirements.length > 0
          ? Math.round((matchedSkills.length / jobRequirements.length) * 100)
          : 50;

      const isNew = new Date(job.createdAt) >= sevenDaysAgo;
      const isSaved = savedJobIds.includes(job._id.toString());

      return {
        ...job,
        matchScore,
        matchedSkills,
        missingSkills: jobRequirements.filter(
          (r) => !userSkillsLower.some((s) => r.includes(s) || s.includes(r)),
        ),
        isNew,
        isSaved,
        alertReason:
          matchScore >= 70
            ? "Great skill match!"
            : isNew
              ? "New job posted"
              : "Matches your preferences",
      };
    });

    // Sort by match score, then by date
    scoredJobs.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Get top matches
    const topMatches = scoredJobs.slice(0, 20);
    const newJobsCount = topMatches.filter((j) => j.isNew).length;
    const avgMatchScore =
      topMatches.length > 0
        ? Math.round(
            topMatches.reduce((sum, j) => sum + j.matchScore, 0) /
              topMatches.length,
          )
        : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalMatches: topMatches.length,
        newJobs: newJobsCount,
        avgMatchScore,
        lastUpdated: new Date().toISOString(),
      },
      jobs: topMatches,
    });
  } catch (error) {
    console.error("Daily alerts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get daily job alerts",
    });
  }
});

/**
 * Unsubscribe from alerts
 * DELETE /api/v1/job-alerts/unsubscribe
 */
router.delete("/unsubscribe", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;

    await User.findByIdAndUpdate(userId, {
      "notifications.jobAlerts": false,
    });

    res.status(200).json({
      success: true,
      message: "Unsubscribed from job alerts",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unsubscribe",
    });
  }
});

export default router;
