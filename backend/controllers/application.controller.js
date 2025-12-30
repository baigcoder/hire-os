import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { analyzeResume } from "../utils/resumeAnalyzer.js";
import { ResumeAnalysis } from "../models/ResumeAnalysis.js";
import {
  rankApplicantsForJob,
  getBulkRecommendations,
} from "../utils/applicantRanker.js";

export const applyJob = async (req, res) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;
    const { coverLetter, resumePath } = req.body;

    if (!jobId) {
      return res.status(400).json({
        message: "Job id is required.",
        success: false,
      });
    }

    // Check if user already applied to this job
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: userId,
    });
    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job.",
        success: false,
      });
    }

    // Analyze resume using the AI model (only if resumePath provided)
    let resumeAnalysis = null;
    if (resumePath) {
      const analysisResult = await analyzeResume(resumePath, jobId);

      // Create resume analysis record
      resumeAnalysis = await ResumeAnalysis.create({
        userId,
        jobId,
        resumePath,
        analysisScore: analysisResult.score,
        keySkillsMatch: analysisResult.keySkillsMatch,
        experienceMatch: analysisResult.experienceMatch,
        educationMatch: analysisResult.educationMatch,
        overallFit: analysisResult.overallFit,
      });
    }

    // Create application with optional resume analysis
    const newApplication = await Application.create({
      job: jobId,
      applicant: userId,
      coverLetter: coverLetter || "",
      resumeAnalysis: resumeAnalysis?._id,
    });

    // Update job applications
    const job = await Job.findById(jobId).populate("company", "name _id");
    if (!job) {
      return res.status(404).json({
        message: "Job not found.",
        success: false,
      });
    }
    job.applications.push(newApplication._id);
    await job.save();

    // Broadcast real-time update to company dashboard
    try {
      const { User } = await import("../models/user.model.js");
      const applicant = await User.findById(userId).select("fullname");

      const applicationPayload = {
        applicantName: applicant?.fullname || "New Applicant",
        jobTitle: job.title,
        jobId: job._id,
        applicationId: newApplication._id,
      };

      // Socket.IO broadcast (legacy)
      const io = req.app.get("io");
      if (io && job.company?._id) {
        const { broadcastNewApplication } =
          await import("../utils/dashboardSocket.js");
        broadcastNewApplication(io, job.company._id.toString(), applicationPayload);
      }

      // Supabase Realtime broadcast (new)
      if (job.company?._id) {
        const { broadcastNewApplication: supabaseBroadcast } =
          await import("../utils/supabaseBroadcast.js");
        await supabaseBroadcast(job.company._id.toString(), applicationPayload);
      }
    } catch (socketError) {
      console.log(
        "Dashboard broadcast failed (non-critical):",
        socketError.message,
      );
    }

    return res.status(201).json({
      message: "Job applied successfully with AI analysis.",
      success: true,
      application: newApplication,
      analysis: resumeAnalysis,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Server error occurred",
      success: false,
    });
  }
};
export const getAppliedJobs = async (req, res) => {
  try {
    const userId = req.id;
    const application = await Application.find({ applicant: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "job",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "company",
          options: { sort: { createdAt: -1 } },
        },
      });

    // Return empty array if no applications found (this is valid, not an error)
    return res.status(200).json({
      application: application || [],
      success: true,
    });
  } catch (error) {
    console.log("Get applied jobs error:", error);
    return res.status(500).json({
      message: "Failed to load application data",
      success: false,
    });
  }
};
// admin dekhega kitna user ne apply kiya hai
export const getApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId).populate({
      path: "applications",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "applicant",
      },
    });
    if (!job) {
      return res.status(404).json({
        message: "Job not found.",
        success: false,
      });
    }
    return res.status(200).json({
      job,
      success: true,
    });
  } catch (error) {
    console.log("Get applicants error:", error);
    return res.status(500).json({
      message: "Failed to load applicants",
      success: false,
    });
  }
};
export const updateStatus = async (req, res) => {
  try {
    const { status, interviewDate, interviewDetails } = req.body;
    const applicationId = req.params.id;

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        success: false,
      });
    }

    const application = await Application.findById(applicationId)
      .populate({
        path: "job",
        populate: {
          path: "company",
        },
      })
      .populate("applicant");

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
        success: false,
      });
    }

    application.status = status;

    // If status is "interview", add interview details
    if (status === "interview" && interviewDate) {
      application.interviewDetails = {
        date: new Date(interviewDate),
        details: interviewDetails || "Please be prepared for your interview",
        completed: false,
        viewed: false, // Set viewed to false to show as unread notification
      };

      // Log interview scheduling
      console.log(
        `Interview scheduled for ${application.applicant.fullname} for job ${application.job.title} at ${application.job.company.name}`,
      );
    }

    await application.save();

    return res.status(200).json({
      message: `Application ${status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : "updated for interview"}`,
      success: true,
      application,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Server error occurred",
      success: false,
    });
  }
};

export const completeInterview = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.id;

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
        success: false,
      });
    }

    // Check if the user is the applicant
    if (application.applicant.toString() !== userId) {
      return res.status(403).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    // Check if interview is scheduled
    if (!application.interviewDetails || application.status !== "interview") {
      return res.status(400).json({
        message: "No interview is scheduled for this application",
        success: false,
      });
    }

    // Mark interview as completed
    application.interviewDetails.completed = true;
    await application.save();

    return res.status(200).json({
      message: "Interview marked as completed",
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error occurred",
      success: false,
    });
  }
};

// New endpoint to get interview notifications for a student
export const getInterviewNotifications = async (req, res) => {
  try {
    const userId = req.id;

    // Find all applications with interview status for this user
    const interviews = await Application.find({
      applicant: userId,
      status: "interview",
      "interviewDetails.date": { $exists: true },
    })
      .sort({ "interviewDetails.date": -1 }) // Sort by interview date, newest first
      .populate({
        path: "job",
        populate: {
          path: "company",
        },
      });

    return res.status(200).json({
      success: true,
      interviews,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to fetch interview notifications",
      success: false,
    });
  }
};

// Mark an interview notification as viewed
export const markInterviewAsViewed = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.id;

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
        success: false,
      });
    }

    // Check if the user is the applicant
    if (application.applicant.toString() !== userId) {
      return res.status(403).json({
        message: "Unauthorized access",
        success: false,
      });
    }

    // Mark interview notification as viewed
    if (application.interviewDetails) {
      application.interviewDetails.viewed = true;
      await application.save();
    }

    return res.status(200).json({
      message: "Interview notification marked as viewed",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to mark interview as viewed",
      success: false,
    });
  }
};

// Recruiter passes candidate to CEO for final approval
export const passToCEO = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const recruiterId = req.id;
    const { notes, recommendation } = req.body;

    // Import models
    const { User } = await import("../models/user.model.js");
    const { Company } = await import("../models/company.model.js");
    const { Notification } = await import("../models/notification.model.js");

    const recruiter = await User.findById(recruiterId);

    // Verify recruiter role
    if (recruiter.role !== "recruiter" && recruiter.role !== "company_admin") {
      return res.status(403).json({
        message: "Only recruiters can pass candidates to CEO",
        success: false,
      });
    }

    const application = await Application.findById(applicationId)
      .populate("job")
      .populate("applicant", "fullname email");

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
        success: false,
      });
    }

    // Get company and verify recruiter belongs to it
    const company = await Company.findById(
      recruiter.companyId || application.job.company,
    );
    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    // Verify job belongs to recruiter's company
    if (application.job.company.toString() !== company._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized to process this application",
        success: false,
      });
    }

    // Update application status and add recruiter review
    application.status = "pending_ceo_approval";
    application.recruiterReview = {
      decision: "passed",
      notes: notes || "",
      reviewedBy: recruiterId,
      reviewedAt: new Date(),
    };

    // Add to status history
    application.statusHistory.push({
      status: "pending_ceo_approval",
      changedBy: recruiterId,
      changedAt: new Date(),
      notes: `Passed to CEO by ${recruiter.fullname}. ${recommendation ? "Recommendation: " + recommendation : ""}`,
    });

    await application.save();

    // Notify the CEO (company admin)
    if (company.adminUser) {
      await Notification.create({
        userId: company.adminUser,
        type: "application",
        title: "📋 Candidate Ready for Final Review",
        message: `${recruiter.fullname} has passed ${application.applicant.fullname} for ${application.job.title} to you for final approval.`,
        relatedJob: application.job._id,
        relatedApplication: application._id,
      });
    }

    // Broadcast real-time update to CEO dashboard
    try {
      const io = req.app.get("io");
      if (io && company._id) {
        const { broadcastNewApproval } =
          await import("../utils/dashboardSocket.js");
        broadcastNewApproval(io, company._id.toString(), {
          applicantName: application.applicant.fullname,
          jobTitle: application.job.title,
          applicationId: application._id,
          recruiterName: recruiter.fullname,
          recommendation: recommendation || "Hire",
        });
      }
    } catch (socketError) {
      console.log(
        "Dashboard socket broadcast failed (non-critical):",
        socketError.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Candidate passed to CEO for final approval",
      application: {
        _id: application._id,
        status: application.status,
        applicant: application.applicant.fullname,
        job: application.job.title,
        recruiterReview: application.recruiterReview,
      },
    });
  } catch (error) {
    console.error("Pass to CEO error:", error);
    return res.status(500).json({
      message: "Error passing candidate to CEO",
      success: false,
    });
  }
};

// Get new application notifications for recruiter
export const getRecruiterNotifications = async (req, res) => {
  try {
    const recruiterId = req.id;

    const { User } = await import("../models/user.model.js");
    const recruiter = await User.findById(recruiterId);

    if (recruiter.role !== "recruiter" && recruiter.role !== "company_admin") {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    // Get jobs for the recruiter's company
    const { Job } = await import("../models/job.model.js");
    const companyJobs = await Job.find({ company: recruiter.companyId }).select(
      "_id",
    );
    const jobIds = companyJobs.map((j) => j._id);

    // Get recent applications to company's jobs
    const recentApplications = await Application.find({
      job: { $in: jobIds },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    })
      .populate("job", "title")
      .populate("applicant", "fullname email profile.profilePhoto")
      .sort({ createdAt: -1 })
      .populate("applicant", "fullname email profile.profilePhoto")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Get count of unviewed applications
    const unviewedCount = await Application.countDocuments({
      job: { $in: jobIds },
      viewedAt: { $exists: false },
    });

    return res.status(200).json({
      success: true,
      notifications: recentApplications,
      unviewedCount,
    });
  } catch (error) {
    console.error("Get recruiter notifications error:", error);
    return res.status(500).json({
      message: "Error fetching notifications",
      success: false,
    });
  }
};

// ========== ATS RANKING SYSTEM ==========

// Get ranked applicants for a job with ATS scores
export const getRankedApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;
    const recruiterId = req.id;

    const { User } = await import("../models/user.model.js");
    const recruiter = await User.findById(recruiterId);

    if (recruiter.role !== "recruiter" && recruiter.role !== "company_admin") {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    // Get ranked applicants
    const rankedData = await rankApplicantsForJob(jobId);
    const recommendations = getBulkRecommendations(rankedData.applicants);

    return res.status(200).json({
      success: true,
      data: {
        ...rankedData,
        recommendations: {
          fastTrack: recommendations.fastTrack.length,
          interview: recommendations.interview.length,
          review: recommendations.review.length,
          reject: recommendations.reject.length,
        },
      },
    });
  } catch (error) {
    console.error("Get ranked applicants error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to rank applicants",
    });
  }
};

// Bulk update application status based on score threshold
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { jobId, action, threshold, applicationIds } = req.body;
    const recruiterId = req.id;

    const { User } = await import("../models/user.model.js");
    const recruiter = await User.findById(recruiterId);

    if (recruiter.role !== "recruiter" && recruiter.role !== "company_admin") {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    let query = { job: jobId };

    // If specific IDs provided, use those
    if (applicationIds && applicationIds.length > 0) {
      query._id = { $in: applicationIds };
    }

    const applications = await Application.find(query);

    // Map action to status
    const statusMap = {
      reject: "rejected",
      interview: "interview",
      shortlist: "shortlisted",
      hold: "pending",
    };

    const newStatus = statusMap[action] || "pending";
    let updated = 0;

    for (const app of applications) {
      app.status = newStatus;
      app.statusHistory.push({
        status: newStatus,
        changedBy: recruiterId,
        changedAt: new Date(),
        notes: `Bulk action: ${action}`,
      });
      await app.save();
      updated++;
    }

    return res.status(200).json({
      success: true,
      message: `${updated} applications updated to ${newStatus}`,
      updated,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk update applications",
    });
  }
};

export const getCompanyApplications = async (req, res) => {
  try {
    const userId = req.id;

    const { User } = await import("../models/user.model.js");
    const { Job } = await import("../models/job.model.js");

    const user = await User.findById(userId);

    if (!user || (user.role !== "recruiter" && user.role !== "company_admin")) {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    if (!user.companyId) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    // Get jobs for the company
    const jobs = await Job.find({ company: user.companyId });
    const jobIds = jobs.map((j) => j._id);

    // Get applications
    const applications = await Application.find({ job: { $in: jobIds } })
      .populate("applicant")
      .populate("job")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      applications,
      success: true,
    });
  } catch (error) {
    console.error("Get company applications error:", error);
    return res.status(500).json({
      message: "Failed to fetch applications",
      success: false,
    });
  }
};
