/**
 * Recruiter Analytics Routes
 * Provides real-time analytics endpoints for recruiter dashboards
 */

import express from "express";
import isAuthenticated, {
  isRecruiter,
} from "../middlewares/isAuthenticated.js";
import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { Interview } from "../models/interview.model.js";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";

const router = express.Router();

/**
 * GET /api/v1/recruiter-analytics/overview
 * Dashboard overview with real-time stats
 */
router.get("/overview", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all company jobs
    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Current month stats
    const applicationsThisMonth = await Application.countDocuments({
      job: { $in: jobIds },
      createdAt: { $gte: startOfMonth },
    });

    const applicationsLastMonth = await Application.countDocuments({
      job: { $in: jobIds },
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });

    // Calculate growth percentage
    const applicationGrowth =
      applicationsLastMonth > 0
        ? Math.round(
            ((applicationsThisMonth - applicationsLastMonth) /
              applicationsLastMonth) *
              100,
          )
        : applicationsThisMonth > 0
          ? 100
          : 0;

    // Interview stats
    const interviewsThisMonth = await Interview.countDocuments({
      company: company._id,
      scheduledAt: { $gte: startOfMonth },
      status: "completed",
    });

    const interviewsScheduled = await Interview.countDocuments({
      company: company._id,
      status: "scheduled",
    });

    // Hiring stats
    const hiresThisMonth = await Application.countDocuments({
      job: { $in: jobIds },
      status: "hired",
      updatedAt: { $gte: startOfMonth },
    });

    const hiresLastMonth = await Application.countDocuments({
      job: { $in: jobIds },
      status: "hired",
      updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });

    const hireGrowth =
      hiresLastMonth > 0
        ? Math.round(((hiresThisMonth - hiresLastMonth) / hiresLastMonth) * 100)
        : hiresThisMonth > 0
          ? 100
          : 0;

    // Active jobs
    const activeJobs = await Job.countDocuments({
      company: company._id,
      status: "open",
      $or: [{ expiryDate: { $exists: false } }, { expiryDate: { $gte: now } }],
    });

    // Pending applications
    const pendingApplications = await Application.countDocuments({
      job: { $in: jobIds },
      status: "pending",
    });

    // Total applications
    const totalApplications = await Application.countDocuments({
      job: { $in: jobIds },
    });

    // Response rate (applications reviewed / total)
    const reviewedApplications = await Application.countDocuments({
      job: { $in: jobIds },
      status: { $nin: ["pending"] },
    });
    const responseRate =
      totalApplications > 0
        ? Math.round((reviewedApplications / totalApplications) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      overview: {
        activeJobs,
        totalApplications,
        pendingApplications,
        applicationsThisMonth,
        applicationGrowth,
        interviewsThisMonth,
        interviewsScheduled,
        hiresThisMonth,
        hireGrowth,
        responseRate,
        teamSize: company.recruiters.filter((r) => r.status === "active")
          .length,
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching analytics" });
  }
});

/**
 * GET /api/v1/recruiter-analytics/funnel
 * Application funnel data
 */
router.get("/funnel", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Funnel stages
    const stages = [
      {
        name: "Applied",
        status: [
          "pending",
          "reviewing",
          "shortlisted",
          "interview",
          "offered",
          "hired",
          "rejected",
        ],
      },
      {
        name: "Reviewed",
        status: [
          "reviewing",
          "shortlisted",
          "interview",
          "offered",
          "hired",
          "rejected",
        ],
      },
      {
        name: "Shortlisted",
        status: ["shortlisted", "interview", "offered", "hired"],
      },
      { name: "Interview", status: ["interview", "offered", "hired"] },
      { name: "Offered", status: ["offered", "hired"] },
      { name: "Hired", status: ["hired"] },
    ];

    const funnel = await Promise.all(
      stages.map(async (stage) => {
        const count = await Application.countDocuments({
          job: { $in: jobIds },
          status: { $in: stage.status },
        });
        return { stage: stage.name, count };
      }),
    );

    // Calculate conversion rates
    const funnelWithRates = funnel.map((stage, idx) => {
      const prevCount = idx > 0 ? funnel[idx - 1].count : stage.count;
      const conversionRate =
        prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;
      return { ...stage, conversionRate };
    });

    return res.status(200).json({
      success: true,
      funnel: funnelWithRates,
    });
  } catch (error) {
    console.error("Funnel analytics error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching funnel data" });
  }
});

/**
 * GET /api/v1/recruiter-analytics/time-to-hire
 * Average time to hire metrics
 */
router.get("/time-to-hire", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Get hired applications with dates
    const hiredApplications = await Application.find({
      job: { $in: jobIds },
      status: "hired",
    })
      .select("createdAt updatedAt job")
      .populate("job", "title");

    if (hiredApplications.length === 0) {
      return res.status(200).json({
        success: true,
        timeToHire: {
          average: 0,
          median: 0,
          fastest: 0,
          slowest: 0,
          byJob: [],
        },
      });
    }

    // Calculate days to hire for each
    const daysToHire = hiredApplications.map((app) => {
      const days = Math.ceil(
        (new Date(app.updatedAt) - new Date(app.createdAt)) /
          (1000 * 60 * 60 * 24),
      );
      return { days, jobTitle: app.job?.title || "Unknown" };
    });

    const sortedDays = daysToHire.map((d) => d.days).sort((a, b) => a - b);
    const average = Math.round(
      sortedDays.reduce((a, b) => a + b, 0) / sortedDays.length,
    );
    const median = sortedDays[Math.floor(sortedDays.length / 2)];
    const fastest = sortedDays[0];
    const slowest = sortedDays[sortedDays.length - 1];

    // Group by job
    const byJob = Object.values(
      daysToHire.reduce((acc, item) => {
        if (!acc[item.jobTitle]) {
          acc[item.jobTitle] = { job: item.jobTitle, days: [], count: 0 };
        }
        acc[item.jobTitle].days.push(item.days);
        acc[item.jobTitle].count++;
        return acc;
      }, {}),
    ).map((job) => ({
      job: job.job,
      averageDays: Math.round(
        job.days.reduce((a, b) => a + b, 0) / job.days.length,
      ),
      hires: job.count,
    }));

    return res.status(200).json({
      success: true,
      timeToHire: {
        average,
        median,
        fastest,
        slowest,
        totalHires: hiredApplications.length,
        byJob,
      },
    });
  } catch (error) {
    console.error("Time to hire error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error calculating time to hire" });
  }
});

/**
 * GET /api/v1/recruiter-analytics/source
 * Application source breakdown
 */
router.get("/source", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Aggregate by source
    const sourceStats = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      {
        $group: {
          _id: { $ifNull: ["$source", "direct"] },
          total: { $sum: 1 },
          hired: {
            $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const sources = sourceStats.map((s) => ({
      source: s._id,
      applications: s.total,
      hires: s.hired,
      conversionRate: s.total > 0 ? Math.round((s.hired / s.total) * 100) : 0,
    }));

    return res.status(200).json({
      success: true,
      sources,
    });
  } catch (error) {
    console.error("Source analytics error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching source data" });
  }
});

/**
 * GET /api/v1/recruiter-analytics/recruiter-performance
 * Per-recruiter performance metrics
 */
router.get(
  "/recruiter-performance",
  isAuthenticated,
  isRecruiter,
  async (req, res) => {
    try {
      const userId = req.id;
      const user = await User.findById(userId);

      if (user.role !== "company_admin") {
        return res
          .status(403)
          .json({
            success: false,
            message: "Only admins can view team performance",
          });
      }

      const company = await Company.findOne({ adminUser: userId }).populate(
        "recruiters.userId",
        "fullname email profile.profilePhoto",
      );

      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      const activeRecruiters = company.recruiters.filter(
        (r) => r.status === "active" && r.userId,
      );

      const performance = await Promise.all(
        activeRecruiters.map(async (recruiter) => {
          const recruiterId = recruiter.userId._id;

          // Jobs posted by this recruiter
          const jobsPosted = await Job.countDocuments({
            company: company._id,
            createdBy: recruiterId,
          });

          // Interviews conducted
          const interviewsConducted = await Interview.countDocuments({
            conductedBy: recruiterId,
            status: "completed",
          });

          // Applications reviewed
          const applicationsReviewed = await Application.countDocuments({
            "recruiterReview.reviewedBy": recruiterId,
          });

          // Successful hires (passed by recruiter and hired)
          const successfulHires = await Application.countDocuments({
            "recruiterReview.reviewedBy": recruiterId,
            status: "hired",
          });

          return {
            _id: recruiter._id,
            user: {
              _id: recruiter.userId._id,
              fullname: recruiter.userId.fullname,
              email: recruiter.userId.email,
              profilePhoto: recruiter.userId.profile?.profilePhoto,
            },
            joinedAt: recruiter.joinedAt,
            stats: {
              jobsPosted,
              interviewsConducted,
              applicationsReviewed,
              successfulHires,
              hireRate:
                applicationsReviewed > 0
                  ? Math.round((successfulHires / applicationsReviewed) * 100)
                  : 0,
            },
          };
        }),
      );

      return res.status(200).json({
        success: true,
        recruiters: performance,
      });
    } catch (error) {
      console.error("Recruiter performance error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching performance data" });
    }
  },
);

/**
 * GET /api/v1/recruiter-analytics/job-performance/:jobId
 * Performance metrics for a specific job
 */
router.get(
  "/job-performance/:jobId",
  isAuthenticated,
  isRecruiter,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const userId = req.id;

      const job = await Job.findById(jobId).populate("company", "adminUser");
      if (!job) {
        return res
          .status(404)
          .json({ success: false, message: "Job not found" });
      }

      // Get application stats
      const applications = await Application.find({ job: jobId });

      const statusCounts = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      // Daily applications over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyApplications = await Application.aggregate([
        {
          $match: {
            job: job._id,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return res.status(200).json({
        success: true,
        jobPerformance: {
          job: {
            _id: job._id,
            title: job.title,
            createdAt: job.createdAt,
            views: job.views || 0,
          },
          applications: {
            total: applications.length,
            byStatus: statusCounts,
          },
          dailyApplications,
          daysActive: Math.ceil(
            (new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24),
          ),
          applicationRate:
            job.views > 0
              ? ((applications.length / job.views) * 100).toFixed(2)
              : 0,
        },
      });
    } catch (error) {
      console.error("Job performance error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching job performance" });
    }
  },
);

/**
 * GET /api/v1/recruiter-analytics/activity
 * Recent activity feed
 */
router.get("/activity", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Get recent applications
    const recentApplications = await Application.find({
      job: { $in: jobIds },
    })
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .populate("applicant", "fullname profile.profilePhoto")
      .populate("job", "title")
      .select("status createdAt updatedAt applicant job");

    const activities = recentApplications.map((app) => ({
      type: app.status === "pending" ? "new_application" : "status_change",
      applicant: {
        name: app.applicant?.fullname,
        photo: app.applicant?.profile?.profilePhoto,
      },
      job: app.job?.title,
      status: app.status,
      timestamp: app.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Activity feed error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching activity" });
  }
});

/**
 * GET /api/v1/recruiter-analytics/source-stats
 * Application source distribution
 */
router.get("/source-stats", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Aggregate applications by source
    const sourceAggregation = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      {
        $group: {
          _id: { $ifNull: ["$source", "direct"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Calculate total for percentages
    const total = sourceAggregation.reduce((sum, s) => sum + s.count, 0);

    // Source colors mapping
    const sourceColors = {
      linkedin: "#0A66C2",
      indeed: "#2164F3",
      referral: "#FFD700",
      direct: "#10B981",
      glassdoor: "#0CAA41",
      company_website: "#8B5CF6",
      job_board: "#F59E0B",
      other: "#6B7280",
    };

    const sources = sourceAggregation.map((s) => ({
      name: s._id.charAt(0).toUpperCase() + s._id.slice(1).replace("_", " "),
      value: total > 0 ? Math.round((s.count / total) * 100) : 0,
      count: s.count,
      color: sourceColors[s._id.toLowerCase()] || "#6B7280",
    }));

    return res.status(200).json({
      success: true,
      sources,
      total,
    });
  } catch (error) {
    console.error("Source stats error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching source stats" });
  }
});

/**
 * GET /api/v1/recruiter-analytics/trends
 * Month-over-month growth percentages
 */
router.get("/trends", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    // Date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Applicants trend
    const applicantsThisMonth = await Application.countDocuments({
      job: { $in: jobIds },
      createdAt: { $gte: startOfMonth },
    });
    const applicantsLastMonth = await Application.countDocuments({
      job: { $in: jobIds },
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const applicantsTrend =
      applicantsLastMonth > 0
        ? Math.round(
            ((applicantsThisMonth - applicantsLastMonth) /
              applicantsLastMonth) *
              100,
          )
        : applicantsThisMonth > 0
          ? 100
          : 0;

    // Jobs trend
    const jobsThisMonth = await Job.countDocuments({
      company: company._id,
      createdAt: { $gte: startOfMonth },
    });
    const jobsLastMonth = await Job.countDocuments({
      company: company._id,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const jobsTrend =
      jobsLastMonth > 0
        ? Math.round(((jobsThisMonth - jobsLastMonth) / jobsLastMonth) * 100)
        : jobsThisMonth > 0
          ? 100
          : 0;

    // Interviews trend
    const interviewsThisMonth = await Interview.countDocuments({
      company: company._id,
      createdAt: { $gte: startOfMonth },
    });
    const interviewsLastMonth = await Interview.countDocuments({
      company: company._id,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const interviewsTrend =
      interviewsLastMonth > 0
        ? Math.round(
            ((interviewsThisMonth - interviewsLastMonth) /
              interviewsLastMonth) *
              100,
          )
        : interviewsThisMonth > 0
          ? 100
          : 0;

    // Hire rate trend
    const hiresThisMonth = await Application.countDocuments({
      job: { $in: jobIds },
      status: "hired",
      updatedAt: { $gte: startOfMonth },
    });
    const hiresLastMonth = await Application.countDocuments({
      job: { $in: jobIds },
      status: "hired",
      updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });

    const hireRateThis =
      applicantsThisMonth > 0
        ? (hiresThisMonth / applicantsThisMonth) * 100
        : 0;
    const hireRateLast =
      applicantsLastMonth > 0
        ? (hiresLastMonth / applicantsLastMonth) * 100
        : 0;
    const hireRateTrend =
      hireRateLast > 0
        ? Math.round(((hireRateThis - hireRateLast) / hireRateLast) * 100)
        : hireRateThis > 0
          ? 100
          : 0;

    return res.status(200).json({
      success: true,
      trends: {
        applicants: applicantsTrend,
        jobs: jobsTrend,
        interviews: interviewsTrend,
        hireRate: hireRateTrend,
      },
    });
  } catch (error) {
    console.error("Trends error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching trends" });
  }
});

export default router;
