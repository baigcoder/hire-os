import { Interview, Application, Job, Company, User, Notification, Message } from "../models/index.js";
import crypto from "crypto";

// ========== INTERVIEW CRUD ==========

// Create new interview
export const createInterview = async (req, res) => {
  try {
    const recruiterId = req.id;
    const {
      applicationId,
      scheduledAt,
      mcqEnabled,
      videoEnabled,
      mcqTimeLimit,
      mcqPassingScore,
      personalMessage, // Optional message to candidate
    } = req.body;

    if (!applicationId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: "Application ID and scheduled time are required",
      });
    }

    // Get application with job and company details
    const application = await Application.findById(applicationId)
      .populate("job")
      .populate("applicant");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Get recruiter's company
    const recruiter = await User.findById(recruiterId);
    const company = await Company.findById(recruiter.companyId);

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Recruiter must be associated with a company",
      });
    }

    // Check if company has interview features
    if (mcqEnabled && !company.features.mcqTests) {
      return res.status(403).json({
        success: false,
        message: "MCQ tests not available in your subscription plan",
        upgradeRequired: true,
      });
    }

    if (videoEnabled && !company.features.videoInterviews) {
      return res.status(403).json({
        success: false,
        message: "Video interviews not available in your subscription plan",
        upgradeRequired: true,
      });
    }

    // Create interview
    const interview = new Interview({
      applicationId,
      jobId: application.job._id,
      companyId: company._id,
      studentId: application.applicant._id,
      recruiterId,
      scheduledAt: new Date(scheduledAt),
      status: mcqEnabled ? "mcq_pending" : "video_scheduled",
      mcqTest: {
        enabled: mcqEnabled !== false,
        status: "not_started",
        totalQuestions: 10,
        passingScore: mcqPassingScore || 60,
        timeLimit: mcqTimeLimit || 15,
        questions: [], // Will be generated when student starts
      },
      videoInterview: {
        enabled: videoEnabled !== false,
        status: "not_started",
        scheduledAt: new Date(scheduledAt),
      },
    });

    // Generate room ID for video interview
    interview.generateRoomId();

    await interview.save();

    // Update application status
    application.status = mcqEnabled ? "mcq_pending" : "video_scheduled";
    application.interviewId = interview._id;
    application.interviewDetails = {
      date: new Date(scheduledAt),
      details: `Interview scheduled. ${mcqEnabled ? "MCQ test required before video interview." : ""}`,
      completed: false,
      viewed: false,
    };
    await application.save();

    // Send notification to student
    await Notification.createNotification({
      userId: application.applicant._id,
      type: "interview_scheduled",
      title: "Interview Scheduled! 🎉",
      message: `Your interview for ${application.job.title} at ${company.name} is scheduled for ${new Date(scheduledAt).toLocaleString()}.${mcqEnabled ? " Complete the MCQ test first." : ""}`,
      relatedEntities: {
        jobId: application.job._id,
        applicationId: application._id,
        interviewId: interview._id,
        companyId: company._id,
      },
      actionUrl: `/interview/${interview._id}`,
      priority: "high",
    });

    // Always send a message to candidate (use personalMessage or default)
    const messageContent = personalMessage && personalMessage.trim()
      ? personalMessage
      : `Hi ${application.applicant.fullname},\n\nGreat news! Your interview for ${application.job.title} has been scheduled.\n\n📅 Date: ${new Date(scheduledAt).toLocaleDateString()}\n⏰ Time: ${new Date(scheduledAt).toLocaleTimeString()}\n${mcqEnabled ? "\n⚠️ Please complete the MCQ test before the video interview." : ""}\n\nBest of luck!\n- The ${company.name} Team`;

    await Message.create({
      senderId: recruiterId,
      senderRole: recruiter.role,
      receiverId: application.applicant._id,
      receiverRole: "student",
      subject: `Interview Scheduled: ${application.job.title} at ${company.name}`,
      content: messageContent,
      type: "interview",
      priority: "high",
      relatedTo: {
        applicationId: application._id,
        jobId: application.job._id,
        interviewId: interview._id,
        companyId: company._id,
      },
    });
    console.log(`📨 Interview message sent to ${application.applicant.fullname}`);

    // ========== AUTO-ADD MESSAGING CONNECTIONS ==========
    // 1. Send message from CEO to student (creates CEO ↔ Student connection)
    if (company.adminUser && company.adminUser.toString() !== recruiterId) {
      const ceo = await User.findById(company.adminUser);
      if (ceo) {
        await Message.create({
          senderId: company.adminUser,
          senderRole: "company_admin",
          receiverId: application.applicant._id,
          receiverRole: "student",
          subject: `Welcome from ${company.name} Leadership`,
          content: `Dear ${application.applicant.fullname},\n\nWelcome to the interview process for ${application.job.title}!\n\nI'm the CEO of ${company.name} and wanted to personally welcome you. Our team is excited to learn more about you.\n\nFeel free to reach out if you have any questions.\n\nBest regards,\n${ceo.fullname || "Company Leadership"}\n${company.name}`,
          type: "interview",
          priority: "normal",
          relatedTo: {
            applicationId: application._id,
            jobId: application.job._id,
            interviewId: interview._id,
            companyId: company._id,
          },
        });
        console.log(`📨 CEO welcome message sent to ${application.applicant.fullname}`);
      }
    }

    // 2. Notify student they can message back (for UI purposes, student now has these contacts)
    // The student can now reply to both recruiter and CEO in their messages

    // Broadcast real-time update to student dashboard via Supabase
    try {
      const { broadcastInterviewScheduled } = await import("../utils/supabaseBroadcast.js");
      await broadcastInterviewScheduled(application.applicant._id.toString(), {
        interviewId: interview._id,
        applicationId: application._id,
        jobTitle: application.job.title,
        companyName: company.name,
        scheduledAt: scheduledAt,
        mcqEnabled: mcqEnabled,
        videoEnabled: videoEnabled,
        status: interview.status,
      });
      console.log(`📡 Real-time broadcast sent to student ${application.applicant._id}`);
    } catch (broadcastError) {
      console.warn("Supabase broadcast failed (non-critical):", broadcastError.message);
    }

    // Send email notification to student
    try {
      const { sendInterviewScheduledEmail } = await import("../utils/emailService.js");
      await sendInterviewScheduledEmail({
        candidateName: application.applicant.fullname,
        candidateEmail: application.applicant.email,
        companyName: company.name,
        jobTitle: application.job.title,
        scheduledAt: scheduledAt,
        mcqEnabled: mcqEnabled,
        videoEnabled: videoEnabled,
        interviewUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/applied-jobs`,
      });
      console.log(`📧 Interview email sent to ${application.applicant.email}`);
    } catch (emailError) {
      console.warn("Email sending failed (non-critical):", emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      interview,
      messageSent: true,
    });
  } catch (error) {
    console.error("Create interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating interview",
    });
  }
};

// Get interview by ID
export const getInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const interview = await Interview.findById(id)
      .populate("applicationId")
      .populate("jobId", "title description requirements skills")
      .populate("companyId", "name logo")
      .populate("studentId", "fullname email profile.profilePhoto")
      .populate("recruiterId", "fullname email profile.profilePhoto")
      .lean();

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check if user has access
    // Handle cases where populated fields might be null (e.g. deleted users)
    const studentId = interview.studentId?._id?.toString();
    const recruiterId = interview.recruiterId?._id?.toString();

    const isStudent = studentId === userId;
    const isRecruiter = recruiterId === userId;

    if (!isStudent && !isRecruiter) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Hide correct answers from student
    if (isStudent && interview.mcqTest?.questions) {
      interview.mcqTest.questions = interview.mcqTest.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    return res.status(200).json({
      success: true,
      interview,
      userRole: isStudent ? "student" : "recruiter",
    });
  } catch (error) {
    console.error("Get interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching interview",
    });
  }
};

// Get interviews by job (for recruiter)
export const getInterviewsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const recruiterId = req.id;

    const interviews = await Interview.find({ jobId, recruiterId })
      .populate("studentId", "fullname email profile.profilePhoto")
      .populate("applicationId")
      .sort({ scheduledAt: -1 });

    return res.status(200).json({
      success: true,
      interviews,
      total: interviews.length,
    });
  } catch (error) {
    console.error("Get interviews by job error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching interviews",
    });
  }
};

// Get interviews for student
export const getInterviewsByStudent = async (req, res) => {
  try {
    const studentId = req.id;

    const interviews = await Interview.find({ studentId })
      .populate("jobId", "title company")
      .populate("companyId", "name logo")
      .populate("recruiterId", "fullname")
      .sort({ scheduledAt: -1 });

    // Categorize interviews
    const upcoming = interviews.filter((i) =>
      ["scheduled", "mcq_pending", "mcq_passed", "video_scheduled"].includes(
        i.status,
      ),
    );
    const completed = interviews.filter((i) =>
      ["completed", "video_completed"].includes(i.status),
    );
    const cancelled = interviews.filter((i) =>
      ["cancelled", "no_show", "mcq_failed"].includes(i.status),
    );

    return res.status(200).json({
      success: true,
      interviews: { upcoming, completed, cancelled },
      total: interviews.length,
    });
  } catch (error) {
    console.error("Get student interviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching interviews",
    });
  }
};

// Get interviews for recruiter
export const getInterviewsByRecruiter = async (req, res) => {
  try {
    const recruiterId = req.id;

    // Verify recruiter exists
    const recruiter = await User.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({ success: false, message: "Recruiter not found" });
    }

    const interviews = await Interview.find({ recruiterId })
      .populate("jobId", "title")
      .populate("studentId", "fullname email profile.profilePhoto")
      .populate("companyId", "name")
      .sort({ scheduledAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      interviews,
      total: interviews.length,
    });
  } catch (error) {
    console.error("Get recruiter interviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching interviews",
    });
  }
};

// Update interview status
export const updateInterviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    interview.status = status;
    if (notes) {
      interview.notes.push({
        content: notes,
        createdBy: req.id,
        createdAt: new Date(),
      });
    }

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Interview status updated",
      interview,
    });
  } catch (error) {
    console.error("Update interview status error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating interview status",
    });
  }
};

// ========== MCQ TEST ==========

// Generate MCQ questions using AI (simplified version)
const generateMCQQuestions = async (job, count = 10) => {
  // In production, this would call Gemini API
  // For now, return sample questions based on job skills

  const skills = job.skills || job.requirements || [];
  const questions = [];

  // Sample questions template
  const sampleQuestions = [
    {
      category: "technical",
      difficulty: "medium",
      template: (skill) => ({
        question: `What is the primary purpose of ${skill} in software development?`,
        options: [
          `To improve code performance`,
          `To enhance user interface`,
          `To manage data storage`,
          `To handle network requests`,
        ],
        correctAnswer: 0,
      }),
    },
    {
      category: "technical",
      difficulty: "easy",
      template: (skill) => ({
        question: `Which of the following is a key feature of ${skill}?`,
        options: [
          `Scalability`,
          `All of the above`,
          `Performance`,
          `Maintainability`,
        ],
        correctAnswer: 1,
      }),
    },
    {
      category: "aptitude",
      difficulty: "medium",
      template: () => ({
        question: `If a project takes 6 developers 4 months to complete, how long would it take 8 developers assuming linear scaling?`,
        options: [`2 months`, `3 months`, `4 months`, `5 months`],
        correctAnswer: 1,
      }),
    },
    {
      category: "situational",
      difficulty: "medium",
      template: () => ({
        question: `A team member consistently misses deadlines. What is the best approach?`,
        options: [
          `Report to management immediately`,
          `Have a private conversation to understand the issue`,
          `Ignore and do their work yourself`,
          `Criticize them in team meetings`,
        ],
        correctAnswer: 1,
      }),
    },
  ];

  // Generate questions
  for (let i = 0; i < count; i++) {
    const template = sampleQuestions[i % sampleQuestions.length];
    const skill = skills[i % skills.length] || "programming";
    const q = template.template(skill);

    questions.push({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      category: template.category,
      difficulty: template.difficulty,
    });
  }

  return questions;
};

// Get MCQ questions
export const getMCQQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const interview = await Interview.findById(id).populate("jobId");

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Verify student access
    if (interview.studentId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Check if MCQ is enabled
    if (!interview.mcqTest.enabled) {
      return res.status(400).json({
        success: false,
        message: "MCQ test is not enabled for this interview",
      });
    }

    // Check if already completed
    if (["completed", "passed", "failed"].includes(interview.mcqTest.status)) {
      return res.status(400).json({
        success: false,
        message: "MCQ test already completed",
        result: {
          score: interview.mcqTest.score,
          passed: interview.mcqTest.status === "passed",
        },
      });
    }

    // Generate questions if not already generated
    if (
      !interview.mcqTest.questions ||
      interview.mcqTest.questions.length === 0
    ) {
      interview.mcqTest.questions = await generateMCQQuestions(
        interview.jobId,
        interview.mcqTest.totalQuestions,
      );
      await interview.save();
    }

    // Return questions without correct answers
    const questions = interview.mcqTest.questions.map((q, index) => ({
      index,
      question: q.question,
      options: q.options,
      category: q.category,
      difficulty: q.difficulty,
    }));

    return res.status(200).json({
      success: true,
      questions,
      totalQuestions: interview.mcqTest.totalQuestions,
      timeLimit: interview.mcqTest.timeLimit,
      passingScore: interview.mcqTest.passingScore,
      status: interview.mcqTest.status,
    });
  } catch (error) {
    console.error("Get MCQ questions error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching MCQ questions",
    });
  }
};

// Start MCQ test
export const startMCQTest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const interview = await Interview.findById(id);

    if (!interview || interview.studentId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.mcqTest.status !== "not_started") {
      return res.status(400).json({
        success: false,
        message: "MCQ test already started or completed",
      });
    }

    // Check if can start (within time window)
    if (!interview.canStartMCQ()) {
      return res.status(400).json({
        success: false,
        message:
          "MCQ test is not yet available. Please wait until the scheduled time.",
      });
    }

    interview.mcqTest.status = "in_progress";
    interview.mcqTest.startedAt = new Date();
    interview.status = "mcq_in_progress";

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "MCQ test started",
      startedAt: interview.mcqTest.startedAt,
      expiresAt: new Date(
        interview.mcqTest.startedAt.getTime() +
        interview.mcqTest.timeLimit * 60 * 1000,
      ),
    });
  } catch (error) {
    console.error("Start MCQ test error:", error);
    return res.status(500).json({
      success: false,
      message: "Error starting MCQ test",
    });
  }
};

// Submit MCQ answers
export const submitMCQAnswers = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of { questionIndex, selectedAnswer }
    const userId = req.id;

    const interview = await Interview.findById(id);

    if (!interview || interview.studentId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.mcqTest.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "MCQ test is not in progress",
      });
    }

    // Check time limit
    const elapsedMinutes =
      (Date.now() - interview.mcqTest.startedAt.getTime()) / (1000 * 60);
    if (elapsedMinutes > interview.mcqTest.timeLimit + 1) {
      // 1 min grace period
      interview.mcqTest.status = "failed";
      interview.status = "mcq_failed";
      await interview.save();

      return res.status(400).json({
        success: false,
        message: "Time limit exceeded",
      });
    }

    // Record answers
    answers.forEach(({ questionIndex, selectedAnswer }) => {
      if (interview.mcqTest.questions[questionIndex]) {
        interview.mcqTest.questions[questionIndex].selectedAnswer =
          selectedAnswer;
      }
    });

    // Calculate score
    const score = interview.calculateMCQScore();
    interview.mcqTest.completedAt = new Date();
    interview.mcqTest.timeTaken = Math.round(elapsedMinutes * 60);

    // Determine pass/fail
    const passed = score >= interview.mcqTest.passingScore;
    interview.mcqTest.status = passed ? "passed" : "failed";
    interview.status = passed ? "mcq_passed" : "mcq_failed";

    // Update application status
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.status = passed ? "mcq_passed" : "mcq_failed";
      await application.save();
    }

    await interview.save();

    // Notify recruiter
    await Notification.createNotification({
      userId: interview.recruiterId,
      type: passed ? "mcq_passed" : "mcq_failed",
      title: passed ? "Candidate Passed MCQ Test" : "Candidate Failed MCQ Test",
      message: `${passed ? "✅" : "❌"} MCQ Result: Score ${score}% (${interview.mcqTest.correctAnswers}/${interview.mcqTest.totalQuestions} correct)`,
      relatedEntities: {
        interviewId: interview._id,
        applicationId: interview.applicationId,
      },
      priority: passed ? "normal" : "low",
    });

    // If passed, notify student about video interview
    if (passed) {
      await Notification.createNotification({
        userId: interview.studentId,
        type: "video_interview_ready",
        title: "Congratulations! 🎉",
        message: `You passed the MCQ test with ${score}%! Your video interview is now available.`,
        relatedEntities: { interviewId: interview._id },
        priority: "high",
      });
    }

    return res.status(200).json({
      success: true,
      message: passed
        ? "Congratulations! You passed the MCQ test!"
        : "Unfortunately, you did not meet the passing score.",
      result: {
        score,
        correctAnswers: interview.mcqTest.correctAnswers,
        totalQuestions: interview.mcqTest.totalQuestions,
        passingScore: interview.mcqTest.passingScore,
        passed,
        timeTaken: interview.mcqTest.timeTaken,
      },
    });
  } catch (error) {
    console.error("Submit MCQ answers error:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting MCQ answers",
    });
  }
};

// Get MCQ result
export const getMCQResult = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check access
    const isStudent = interview.studentId.toString() === userId;
    const isRecruiter = interview.recruiterId.toString() === userId;

    if (!isStudent && !isRecruiter) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!["completed", "passed", "failed"].includes(interview.mcqTest.status)) {
      return res.status(400).json({
        success: false,
        message: "MCQ test not yet completed",
      });
    }

    const result = {
      score: interview.mcqTest.score,
      correctAnswers: interview.mcqTest.correctAnswers,
      wrongAnswers: interview.mcqTest.wrongAnswers,
      unanswered: interview.mcqTest.unanswered,
      totalQuestions: interview.mcqTest.totalQuestions,
      passingScore: interview.mcqTest.passingScore,
      passed: interview.mcqTest.status === "passed",
      timeTaken: interview.mcqTest.timeTaken,
      startedAt: interview.mcqTest.startedAt,
      completedAt: interview.mcqTest.completedAt,
    };

    // Include detailed breakdown for recruiter
    if (isRecruiter) {
      result.questions = interview.mcqTest.questions;
    }

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Get MCQ result error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching MCQ result",
    });
  }
};

// ========== VIDEO INTERVIEW ==========

// Start video interview (recruiter initiates)
export const startVideoInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const recruiterId = req.id;

    const interview = await Interview.findById(id);

    if (!interview || interview.recruiterId.toString() !== recruiterId) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (!interview.canStartVideoInterview()) {
      return res.status(400).json({
        success: false,
        message:
          "Video interview cannot be started. Check if MCQ is required and passed.",
      });
    }

    interview.videoInterview.status = "waiting";
    interview.videoInterview.recruiterJoinedAt = new Date();
    interview.status = "video_scheduled";

    if (!interview.videoInterview.roomId) {
      interview.generateRoomId();
    }

    await interview.save();

    // Notify student
    await Notification.createNotification({
      userId: interview.studentId,
      type: "interview_started",
      title: "Interview Started!",
      message: "The recruiter is waiting. Join the video interview now!",
      relatedEntities: { interviewId: interview._id },
      actionUrl: `/interview/live/${interview._id}`,
      priority: "urgent",
    });

    return res.status(200).json({
      success: true,
      message: "Video interview room ready",
      roomId: interview.videoInterview.roomId,
    });
  } catch (error) {
    console.error("Start video interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error starting video interview",
    });
  }
};

// Join video interview
export const joinVideoInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const isStudent = interview.studentId.toString() === userId;
    const isRecruiter = interview.recruiterId.toString() === userId;

    if (!isStudent && !isRecruiter) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (isStudent) {
      interview.videoInterview.studentJoinedAt = new Date();
    }

    // If both joined, mark as in progress
    if (
      interview.videoInterview.studentJoinedAt &&
      interview.videoInterview.recruiterJoinedAt
    ) {
      interview.videoInterview.status = "in_progress";
      interview.videoInterview.startedAt = new Date();
      interview.status = "video_in_progress";
    }

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Joined video interview",
      roomId: interview.videoInterview.roomId,
      status: interview.videoInterview.status,
    });
  } catch (error) {
    console.error("Join video interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error joining video interview",
    });
  }
};

// End video interview
export const endVideoInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    interview.videoInterview.status = "completed";
    interview.videoInterview.endedAt = new Date();
    interview.status = "video_completed";

    // Calculate duration
    if (interview.videoInterview.startedAt) {
      interview.videoInterview.duration = Math.round(
        (interview.videoInterview.endedAt -
          interview.videoInterview.startedAt) /
        1000,
      );
    }

    await interview.save();

    // Update application
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.status = "video_completed";
      await application.save();
    }

    return res.status(200).json({
      success: true,
      message: "Video interview ended",
      duration: interview.videoInterview.duration,
    });
  } catch (error) {
    console.error("End video interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error ending video interview",
    });
  }
};

// Report fraud alert
export const reportFraudAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, details, severity, screenshot } = req.body;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const alert = {
      type,
      details,
      severity: severity || "medium",
      screenshot,
      timestamp: new Date(),
    };

    // Add to appropriate section based on current phase
    if (interview.mcqTest.status === "in_progress") {
      interview.mcqTest.fraudAlerts.push(alert);
    } else {
      interview.videoInterview.fraudAlerts.push(alert);
    }

    await interview.save();

    // Notify recruiter for high/critical alerts
    if (["high", "critical"].includes(severity)) {
      await Notification.createNotification({
        userId: interview.recruiterId,
        type: "fraud_alert",
        title: "⚠️ Fraud Alert Detected",
        message: `${type}: ${details}`,
        relatedEntities: { interviewId: interview._id },
        priority: "urgent",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fraud alert recorded",
    });
  } catch (error) {
    console.error("Report fraud alert error:", error);
    return res.status(500).json({
      success: false,
      message: "Error recording fraud alert",
    });
  }
};

// Send chat message during interview
export const sendChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.id;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const isStudent = interview.studentId.toString() === userId;
    const isRecruiter = interview.recruiterId.toString() === userId;

    if (!isStudent && !isRecruiter) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    interview.videoInterview.chatMessages.push({
      sender: userId,
      senderRole: isStudent ? "student" : "recruiter",
      message,
      timestamp: new Date(),
    });

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Message sent",
    });
  } catch (error) {
    console.error("Send chat message error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending message",
    });
  }
};

// ========== REPORT & OFFER ==========

import {
  generateInterviewReport,
  generateQuickSummary,
} from "../utils/reportGenerator.js";

// Generate AI report (recruiter generates during/after interview)
export const generateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { recruiterNotes } = req.body;
    const recruiterId = req.id;

    const interview = await Interview.findById(id)
      .populate("studentId", "fullname email")
      .populate("jobId", "title skills requirements")
      .populate("companyId", "name")
      .populate("recruiterId", "fullname");

    if (!interview || interview.recruiterId._id.toString() !== recruiterId) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Prepare data for AI report generation
    const reportData = {
      candidateName: interview.studentId.fullname,
      candidateEmail: interview.studentId.email,
      jobTitle: interview.jobId.title,
      jobId: interview.jobId._id,
      companyName: interview.companyId?.name || "Company",
      recruiterName: interview.recruiterId.fullname,
      interviewDate: interview.scheduledAt,
      interviewDuration: interview.videoInterview?.duration
        ? Math.round(interview.videoInterview.duration / 60)
        : 0,
      mcqScore: interview.mcqTest?.correctAnswers || 0,
      mcqTotal: interview.mcqTest?.totalQuestions || 0,
      videoScores: interview.videoInterview?.aiAnalysis || null,
      resumeScore: interview.resumeScore || null,
      fraudRiskScore:
        interview.totalFraudAlerts > 5
          ? "high"
          : interview.totalFraudAlerts > 2
            ? "medium"
            : "low",
      behaviorNotes: JSON.stringify(interview.mcqTest?.fraudAlerts || []),
      recruiterNotes: recruiterNotes || "",
      aiAnalysis: interview.videoInterview?.aiAnalysis?.notes?.join(". ") || "",
    };

    // Generate AI-powered report
    const aiReport = await generateInterviewReport(reportData);

    // Save to interview
    interview.finalReport = {
      status: "draft",
      generatedBy: recruiterId,
      generatedAt: new Date(),
      overallScore: aiReport.overallScore,
      technicalScore: aiReport.technicalScore,
      communicationScore: aiReport.communicationScore,
      cultureFitScore: aiReport.cultureFitScore,
      problemSolvingScore: aiReport.technicalScore, // Use technical as fallback
      aiSummary: aiReport.summary,
      aiRecommendation: aiReport.recommendation,
      strengths: aiReport.strengths,
      weaknesses: aiReport.concerns,
      notes: recruiterNotes,
      hiringRisk: aiReport.hiringRisk,
      suggestedSalary: aiReport.suggestedSalary,
      nextSteps: aiReport.nextSteps,
    };

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "AI Report generated successfully",
      report: {
        ...interview.finalReport,
        rawScores: aiReport.rawScores,
        generatedBy: aiReport.generatedBy,
      },
    });
  } catch (error) {
    console.error("Generate report error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
    });
  }
};

// Submit report to CEO for approval
export const submitReportToCEO = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalNotes } = req.body;
    const recruiterId = req.id;

    const interview = await Interview.findById(id)
      .populate("studentId", "fullname")
      .populate("jobId", "title")
      .populate("companyId", "adminUser name");

    if (!interview || interview.recruiterId.toString() !== recruiterId) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (!interview.finalReport || interview.finalReport.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Please generate a report first",
      });
    }

    // Update report status
    interview.finalReport.status = "submitted";
    if (finalNotes) {
      interview.finalReport.notes = finalNotes;
    }

    // Update application status
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.status = "pending_ceo_approval";
      application.recruiterReview = {
        decision: "passed",
        notes: interview.finalReport.notes,
        reviewedBy: recruiterId,
        reviewedAt: new Date(),
      };
      await application.save();
    }

    interview.status = "pending_ceo_approval";
    await interview.save();

    // Notify CEO (company admin)
    const ceoId = interview.companyId?.adminUser;
    if (ceoId) {
      await Notification.createNotification({
        userId: ceoId,
        type: "interview_report_submitted",
        title: "📋 New Interview Report for Review",
        message: `Recruiter submitted report for ${interview.studentId.fullname} - ${interview.jobId.title}. Score: ${interview.finalReport.overallScore}%. Recommendation: ${interview.finalReport.aiRecommendation}`,
        relatedEntities: {
          interviewId: interview._id,
          applicationId: interview.applicationId,
        },
        actionUrl: `/ceo/reports/${interview._id}`,
        priority: "high",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report submitted to CEO for approval",
      report: generateQuickSummary(interview.finalReport),
    });
  } catch (error) {
    console.error("Submit to CEO error:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting report to CEO",
    });
  }
};

// CEO reviews and decides on candidate
export const ceoDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comments } = req.body;
    const ceoId = req.id;

    // Validate decision
    if (!["approved", "rejected", "on_hold"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Invalid decision. Must be: approved, rejected, or on_hold",
      });
    }

    const interview = await Interview.findById(id)
      .populate("studentId", "fullname email")
      .populate("jobId", "title")
      .populate("companyId", "adminUser name");

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Verify CEO access (must be company admin)
    if (interview.companyId?.adminUser?.toString() !== ceoId) {
      return res.status(403).json({
        success: false,
        message: "Only company admin can make final decision",
      });
    }

    // Record decision
    interview.finalReport.adminDecision = {
      decision,
      decidedBy: ceoId,
      decidedAt: new Date(),
      comments,
    };

    interview.finalReport.status =
      decision === "approved"
        ? "approved"
        : decision === "rejected"
          ? "rejected"
          : "pending";

    // Update application based on decision
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.ceoReview = {
        decision,
        notes: comments,
        reviewedBy: ceoId,
        reviewedAt: new Date(),
      };

      if (decision === "approved") {
        application.status = "offer_pending";
        interview.status = "approved";
      } else if (decision === "rejected") {
        application.status = "rejected";
        interview.status = "rejected";
      } else {
        application.status = "under_review";
      }

      await application.save();
    }

    await interview.save();

    // Notify recruiter about decision
    await Notification.createNotification({
      userId: interview.recruiterId,
      type:
        decision === "approved" ? "candidate_approved" : "candidate_rejected",
      title:
        decision === "approved"
          ? "✅ Candidate Approved by CEO!"
          : decision === "rejected"
            ? "❌ Candidate Rejected"
            : "⏳ Decision On Hold",
      message: `CEO decision for ${interview.studentId.fullname}: ${decision.toUpperCase()}. ${comments || ""}`,
      relatedEntities: { interviewId: interview._id },
      priority: "high",
    });

    // If approved, prompt for offer letter
    if (decision === "approved") {
      await Notification.createNotification({
        userId: interview.recruiterId,
        type: "prepare_offer",
        title: "📝 Prepare Offer Letter",
        message: `${interview.studentId.fullname} has been approved! Please prepare the offer letter.`,
        relatedEntities: { interviewId: interview._id },
        actionUrl: `/interview/${interview._id}/offer`,
        priority: "high",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Candidate ${decision}`,
      decision: interview.finalReport.adminDecision,
    });
  } catch (error) {
    console.error("CEO decision error:", error);
    return res.status(500).json({
      success: false,
      message: "Error recording decision",
    });
  }
};

// Get pending reports for CEO
export const getPendingReportsForCEO = async (req, res) => {
  try {
    const ceoId = req.id;

    // Find companies where this user is admin
    const companies = await Company.find({ adminUser: ceoId }).select("_id");
    const companyIds = companies.map((c) => c._id);

    // Get interviews pending CEO approval
    const interviews = await Interview.find({
      companyId: { $in: companyIds },
      "finalReport.status": "submitted",
    })
      .populate("studentId", "fullname email profile.profilePhoto")
      .populate("jobId", "title")
      .populate("recruiterId", "fullname")
      .sort({ "finalReport.generatedAt": -1 });

    const reports = interviews.map((interview) => ({
      interviewId: interview._id,
      candidate: {
        name: interview.studentId.fullname,
        email: interview.studentId.email,
        photo: interview.studentId.profile?.profilePhoto,
      },
      job: interview.jobId.title,
      recruiter: interview.recruiterId.fullname,
      report: {
        overallScore: interview.finalReport.overallScore,
        recommendation: interview.finalReport.aiRecommendation,
        summary: interview.finalReport.aiSummary,
        strengths: interview.finalReport.strengths,
        concerns: interview.finalReport.weaknesses,
        hiringRisk: interview.finalReport.hiringRisk,
        generatedAt: interview.finalReport.generatedAt,
      },
      scores: {
        technical: interview.finalReport.technicalScore,
        communication: interview.finalReport.communicationScore,
        cultureFit: interview.finalReport.cultureFitScore,
        mcq: interview.mcqTest?.score,
      },
    }));

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get pending reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pending reports",
    });
  }
};

// Submit final report
export const submitReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      technicalScore,
      communicationScore,
      problemSolvingScore,
      cultureFitScore,
      recommendation,
      strengths,
      weaknesses,
      notes,
    } = req.body;
    const recruiterId = req.id;

    const interview = await Interview.findById(id);

    if (!interview || interview.recruiterId.toString() !== recruiterId) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    interview.finalReport = {
      ...interview.finalReport,
      status: "submitted",
      generatedBy: recruiterId,
      generatedAt: new Date(),
      technicalScore,
      communicationScore,
      problemSolvingScore,
      cultureFitScore,
      overallScore: Math.round(
        (technicalScore +
          communicationScore +
          problemSolvingScore +
          cultureFitScore) /
        4,
      ),
      recommendation,
      strengths,
      weaknesses,
      notes,
    };

    interview.status = "completed";
    await interview.save();

    // Update application
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.status = "offer_pending";
      await application.save();
    }

    return res.status(200).json({
      success: true,
      message: "Report submitted",
      report: interview.finalReport,
    });
  } catch (error) {
    console.error("Submit report error:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting report",
    });
  }
};

// Create offer letter
export const createOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      position,
      department,
      salary,
      joiningDate,
      benefits,
      additionalTerms,
    } = req.body;
    const recruiterId = req.id;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    interview.offerLetter = {
      status: "drafted",
      createdBy: recruiterId,
      position,
      department,
      salary: {
        amount: salary,
        currency: "PKR",
        period: "monthly",
      },
      joiningDate: new Date(joiningDate),
      benefits,
      additionalTerms,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Offer letter created",
      offer: interview.offerLetter,
    });
  } catch (error) {
    console.error("Create offer letter error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating offer letter",
    });
  }
};

// Send offer letter
export const sendOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findById(id)
      .populate("studentId", "fullname email")
      .populate("companyId", "name")
      .populate("jobId", "title");

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (!interview.offerLetter || interview.offerLetter.status !== "drafted") {
      return res.status(400).json({
        success: false,
        message: "Please create an offer letter first",
      });
    }

    interview.offerLetter.status = "sent";
    interview.offerLetter.sentAt = new Date();

    // Update application
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.status = "offer_sent";
      await application.save();
    }

    await interview.save();

    // Send email with offer details
    try {
      const { sendOfferLetterEmail } = await import("../utils/emailService.js");
      await sendOfferLetterEmail({
        candidateName: interview.studentId.fullname,
        candidateEmail: interview.studentId.email,
        companyName: interview.companyId.name,
        position: interview.offerLetter.position || interview.jobId?.title,
        department: interview.offerLetter.department,
        salary: interview.offerLetter.salary?.amount,
        joiningDate: interview.offerLetter.joiningDate,
        benefits: interview.offerLetter.benefits,
        expiresAt: interview.offerLetter.expiresAt,
        viewOfferUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/interview/${interview._id}/offer`,
      });
      console.log(`📧 Offer letter email sent to ${interview.studentId.email}`);
    } catch (emailError) {
      console.error("Offer email sending failed (non-critical):", emailError);
    }

    // Notify student in-app
    await Notification.createNotification({
      userId: interview.studentId._id,
      type: "offer_received",
      title: "🎉 You Received an Offer!",
      message: `Congratulations! ${interview.companyId.name} has sent you an offer letter. Review and respond within 7 days.`,
      relatedEntities: { interviewId: interview._id },
      actionUrl: `/interview/${interview._id}/offer`,
      priority: "urgent",
    });

    // Broadcast real-time update to student
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${interview.studentId._id}`).emit("offer-received", {
          interviewId: interview._id,
          companyName: interview.companyId.name,
          position: interview.offerLetter.position,
        });
      }
    } catch (socketError) {
      console.log(
        "Socket broadcast failed (non-critical):",
        socketError.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Offer letter sent to candidate",
      emailSent: true,
    });
  } catch (error) {
    console.error("Send offer letter error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending offer letter",
    });
  }
};

// Respond to offer (student)
export const respondToOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { accepted, negotiationNotes, counterOffer } = req.body;
    const studentId = req.id;

    const interview = await Interview.findById(id);

    if (!interview || interview.studentId.toString() !== studentId) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.offerLetter.status !== "sent") {
      return res.status(400).json({
        success: false,
        message: "No pending offer to respond to",
      });
    }

    interview.offerLetter.studentResponse = {
      accepted,
      respondedAt: new Date(),
      negotiationNotes,
      counterOffer,
    };

    if (accepted) {
      interview.offerLetter.status = "accepted";

      // Update application
      const application = await Application.findById(interview.applicationId);
      if (application) {
        application.status = "hired";
        await application.save();
      }
    } else if (counterOffer) {
      interview.offerLetter.status = "negotiating";
    } else {
      interview.offerLetter.status = "rejected";
    }

    interview.offerLetter.respondedAt = new Date();
    await interview.save();

    // Notify recruiter
    await Notification.createNotification({
      userId: interview.recruiterId,
      type: accepted ? "offer_accepted" : "offer_rejected",
      title: accepted ? "Offer Accepted! 🎉" : "Offer Declined",
      message: accepted
        ? "The candidate has accepted your offer!"
        : `The candidate has ${counterOffer ? "submitted a counter-offer" : "declined the offer"}.`,
      relatedEntities: { interviewId: interview._id },
      priority: "high",
    });

    return res.status(200).json({
      success: true,
      message: accepted
        ? "Congratulations on your new position!"
        : "Response recorded",
    });
  } catch (error) {
    console.error("Respond to offer error:", error);
    return res.status(500).json({
      success: false,
      message: "Error responding to offer",
    });
  }
};

// Cancel interview
export const cancelInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.id;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    interview.status = "cancelled";
    interview.cancellation = {
      cancelledBy: userId,
      cancelledAt: new Date(),
      reason,
    };

    await interview.save();

    // Notify student
    await Notification.createNotification({
      userId: interview.studentId,
      type: "interview_cancelled",
      title: "Interview Cancelled",
      message: `Your interview has been cancelled. Reason: ${reason || "Not specified"}`,
      relatedEntities: { interviewId: interview._id },
    });

    return res.status(200).json({
      success: true,
      message: "Interview cancelled",
    });
  } catch (error) {
    console.error("Cancel interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error cancelling interview",
    });
  }
};

// Reschedule interview
export const rescheduleInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDateTime, reason } = req.body;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const oldDate = interview.scheduledAt;
    interview.scheduledAt = new Date(newDateTime);
    interview.videoInterview.scheduledAt = new Date(newDateTime);

    interview.notes.push({
      content: `Rescheduled from ${oldDate.toLocaleString()} to ${new Date(newDateTime).toLocaleString()}. Reason: ${reason}`,
      createdBy: req.id,
      createdAt: new Date(),
    });

    await interview.save();

    // Notify student
    await Notification.createNotification({
      userId: interview.studentId,
      type: "interview_scheduled",
      title: "Interview Rescheduled",
      message: `Your interview has been rescheduled to ${new Date(newDateTime).toLocaleString()}.`,
      relatedEntities: { interviewId: interview._id },
      priority: "high",
    });

    return res.status(200).json({
      success: true,
      message: "Interview rescheduled",
      newDateTime: interview.scheduledAt,
    });
  } catch (error) {
    console.error("Reschedule interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error rescheduling interview",
    });
  }
};
