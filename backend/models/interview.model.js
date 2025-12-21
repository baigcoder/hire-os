import mongoose from "mongoose";

// MCQ Question Schema
const mcqQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        type: String,
        required: true,
      },
    ],
    correctAnswer: {
      type: Number, // Index of correct option (0-3)
      required: true,
    },
    selectedAnswer: {
      type: Number,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    category: {
      type: String,
      enum: ["technical", "aptitude", "situational", "domain"],
      default: "technical",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    timeSpent: {
      type: Number, // Seconds spent on this question
      default: 0,
    },
  },
  { _id: true },
);

// Fraud Alert Schema
const fraudAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "tab_switch", // Candidate switched tabs
        "window_blur", // Window lost focus
        "face_not_visible", // Face not detected
        "multiple_faces", // Multiple faces detected
        "suspicious_audio", // Background voices detected
        "screen_share_stop", // Screen sharing stopped
        "copy_paste", // Copy-paste detected
        "right_click", // Right click detected
        "dev_tools", // Developer tools opened
        "network_issue", // Suspicious network activity
        "time_anomaly", // Unusual time patterns
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    screenshot: {
      type: String, // URL to screenshot if captured
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledgedAt: Date,
  },
  { _id: true },
);

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["student", "recruiter"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ["text", "system", "alert"],
      default: "text",
    },
  },
  { _id: true },
);

// Main Interview Schema
const interviewSchema = new mongoose.Schema(
  {
    // References
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Overall Status
    status: {
      type: String,
      enum: [
        "scheduled", // Interview scheduled, waiting for MCQ
        "mcq_pending", // MCQ test available
        "mcq_in_progress", // Currently taking MCQ
        "mcq_completed", // MCQ done, waiting for review
        "mcq_passed", // Passed MCQ, video interview enabled
        "mcq_failed", // Failed MCQ
        "video_scheduled", // Video interview scheduled
        "video_in_progress", // Currently in video interview
        "video_completed", // Video interview done
        "report_pending", // Waiting for report generation
        "completed", // All done, report generated
        "cancelled", // Cancelled
        "no_show", // Candidate didn't show up
      ],
      default: "scheduled",
    },

    // Scheduling
    scheduledAt: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: "Asia/Karachi",
    },
    remindersSent: {
      type: [Date],
      default: [],
    },

    // MCQ Test Section
    mcqTest: {
      enabled: {
        type: Boolean,
        default: true,
      },
      status: {
        type: String,
        enum: ["not_started", "in_progress", "completed", "passed", "failed"],
        default: "not_started",
      },
      totalQuestions: {
        type: Number,
        default: 10,
      },
      passingScore: {
        type: Number,
        default: 60, // Percentage
      },
      timeLimit: {
        type: Number,
        default: 15, // Minutes
      },
      questions: [mcqQuestionSchema],
      score: {
        type: Number,
        default: null,
      },
      correctAnswers: {
        type: Number,
        default: 0,
      },
      wrongAnswers: {
        type: Number,
        default: 0,
      },
      unanswered: {
        type: Number,
        default: 0,
      },
      startedAt: Date,
      completedAt: Date,
      timeTaken: {
        type: Number, // Seconds
        default: 0,
      },
      // Fraud detection during MCQ
      fraudAlerts: [fraudAlertSchema],
    },

    // Video Interview Section
    videoInterview: {
      enabled: {
        type: Boolean,
        default: true,
      },
      status: {
        type: String,
        enum: [
          "not_started",
          "waiting",
          "in_progress",
          "completed",
          "cancelled",
        ],
        default: "not_started",
      },
      roomId: {
        type: String,
        unique: true,
        sparse: true,
      },
      scheduledAt: Date,
      startedAt: Date,
      endedAt: Date,
      duration: {
        type: Number, // Seconds
        default: 0,
      },
      maxDuration: {
        type: Number,
        default: 3600, // 1 hour in seconds
      },
      // Participants
      studentJoinedAt: Date,
      recruiterJoinedAt: Date,
      // Recording (if enabled)
      recordingEnabled: {
        type: Boolean,
        default: false,
      },
      recordingUrl: String,
      // Chat messages
      chatMessages: [chatMessageSchema],
      // Fraud detection during video
      fraudAlerts: [fraudAlertSchema],
      // AI Analysis during interview
      aiAnalysis: {
        confidenceScore: Number,
        communicationScore: Number,
        technicalScore: Number,
        bodyLanguageScore: Number,
        eyeContactScore: Number,
        notes: [String],
      },
    },

    // Final Report
    finalReport: {
      status: {
        type: String,
        enum: ["pending", "draft", "submitted", "approved", "rejected"],
        default: "pending",
      },
      generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      generatedAt: Date,

      // Scores
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      technicalScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      communicationScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      problemSolvingScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      cultureFitScore: {
        type: Number,
        min: 0,
        max: 100,
      },

      // Recommendation
      recommendation: {
        type: String,
        enum: ["strong_hire", "hire", "consider", "no_hire", "strong_no_hire"],
      },

      // Written feedback
      strengths: [String],
      weaknesses: [String],
      notes: String,

      // AI Generated Summary
      aiSummary: String,
      aiRecommendation: String,

      // Company Admin Decision
      adminDecision: {
        decision: {
          type: String,
          enum: ["pending", "approved", "rejected", "on_hold"],
        },
        decidedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        decidedAt: Date,
        comments: String,
      },
    },

    // Offer Letter
    offerLetter: {
      status: {
        type: String,
        enum: [
          "not_applicable",
          "pending",
          "drafted",
          "sent",
          "accepted",
          "rejected",
          "negotiating",
        ],
        default: "not_applicable",
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      sentAt: Date,
      respondedAt: Date,
      expiresAt: Date,

      // Offer Details
      position: String,
      department: String,
      salary: {
        amount: Number,
        currency: {
          type: String,
          default: "PKR",
        },
        period: {
          type: String,
          enum: ["monthly", "yearly"],
          default: "monthly",
        },
      },
      joiningDate: Date,
      benefits: [String],
      additionalTerms: String,

      // Document
      documentUrl: String,
      signedDocumentUrl: String,

      // Student Response
      studentResponse: {
        accepted: Boolean,
        respondedAt: Date,
        negotiationNotes: String,
        counterOffer: {
          salary: Number,
          joiningDate: Date,
          notes: String,
        },
      },
    },

    // Metadata
    notes: [
      {
        content: String,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isPrivate: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Cancellation
    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      cancelledAt: Date,
      reason: String,
      refundProcessed: Boolean,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
interviewSchema.index({ applicationId: 1 });
interviewSchema.index({ jobId: 1 });
interviewSchema.index({ studentId: 1 });
interviewSchema.index({ recruiterId: 1 });
interviewSchema.index({ companyId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ scheduledAt: 1 });
// // interviewSchema.index({ 'videoInterview.roomId': 1 }); // Removed to prevent duplicate index warning
interviewSchema.index({ createdAt: -1 });

// Virtual for total fraud alerts count
interviewSchema.virtual("totalFraudAlerts").get(function () {
  const mcqAlerts = this.mcqTest?.fraudAlerts?.length || 0;
  const videoAlerts = this.videoInterview?.fraudAlerts?.length || 0;
  return mcqAlerts + videoAlerts;
});

// Virtual for high severity alerts count
interviewSchema.virtual("criticalAlertsCount").get(function () {
  const mcqCritical =
    this.mcqTest?.fraudAlerts?.filter(
      (a) => a.severity === "critical" || a.severity === "high",
    ).length || 0;
  const videoCritical =
    this.videoInterview?.fraudAlerts?.filter(
      (a) => a.severity === "critical" || a.severity === "high",
    ).length || 0;
  return mcqCritical + videoCritical;
});

// Method to check if MCQ test is available
interviewSchema.methods.canStartMCQ = function () {
  if (!this.mcqTest.enabled) return false;
  if (this.mcqTest.status !== "not_started") return false;

  const now = new Date();
  const scheduledTime = new Date(this.scheduledAt);
  const bufferMinutes = 15; // Can start 15 minutes before scheduled time

  scheduledTime.setMinutes(scheduledTime.getMinutes() - bufferMinutes);
  return now >= scheduledTime;
};

// Method to check if video interview can start
interviewSchema.methods.canStartVideoInterview = function () {
  if (!this.videoInterview.enabled) return false;
  if (this.mcqTest.enabled && this.mcqTest.status !== "passed") return false;
  if (
    this.videoInterview.status === "completed" ||
    this.videoInterview.status === "cancelled"
  )
    return false;
  return true;
};

// Method to calculate MCQ score
interviewSchema.methods.calculateMCQScore = function () {
  const questions = this.mcqTest.questions;
  if (!questions || questions.length === 0) return 0;

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  questions.forEach((q) => {
    if (q.selectedAnswer === null || q.selectedAnswer === undefined) {
      unanswered++;
    } else if (q.selectedAnswer === q.correctAnswer) {
      correct++;
      q.isCorrect = true;
    } else {
      wrong++;
      q.isCorrect = false;
    }
  });

  this.mcqTest.correctAnswers = correct;
  this.mcqTest.wrongAnswers = wrong;
  this.mcqTest.unanswered = unanswered;
  this.mcqTest.score = Math.round((correct / questions.length) * 100);

  return this.mcqTest.score;
};

// Method to generate room ID
interviewSchema.methods.generateRoomId = function () {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  this.videoInterview.roomId = `interview-${this._id}-${timestamp}-${random}`;
  return this.videoInterview.roomId;
};

// Ensure virtuals are included in JSON
interviewSchema.set("toJSON", { virtuals: true });
interviewSchema.set("toObject", { virtuals: true });

export const Interview = mongoose.model("Interview", interviewSchema);
