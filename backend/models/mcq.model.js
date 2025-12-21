import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
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
  candidateAnswer: {
    type: Number, // Index of candidate's selected answer
    default: null,
  },
  isCorrect: {
    type: Boolean,
    default: null,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  category: {
    type: String, // e.g., 'technical', 'behavioral', 'logical'
    default: "technical",
  },
  timeSpent: {
    type: Number, // Time spent on this question in seconds
    default: 0,
  },
});

const mcqTestSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Test content
    questions: [questionSchema],
    totalQuestions: {
      type: Number,
      default: 15,
    },

    // Scoring
    score: {
      type: Number,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    passingScore: {
      type: Number,
      default: 60, // 60% to pass
    },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "passed",
        "failed",
        "expired",
        "cancelled",
      ],
      default: "pending",
    },

    // Timing
    duration: {
      type: Number,
      default: 30, // 30 minutes
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },

    // Anti-cheating measures
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    maxTabSwitches: {
      type: Number,
      default: 3, // Warning threshold
    },
    suspiciousActivity: [
      {
        type: {
          type: String,
          enum: [
            "tab_switch",
            "copy_paste",
            "window_blur",
            "rapid_answers",
            "time_anomaly",
          ],
        },
        timestamp: Date,
        details: String,
      },
    ],
    fullscreenExitCount: {
      type: Number,
      default: 0,
    },

    // AI-generated metadata
    generatedBy: {
      type: String,
      default: "gemini-1.5-flash",
    },
    generationPrompt: {
      type: String, // Store the prompt used for reproducibility
    },
    jobSkills: [
      {
        type: String, // Skills the MCQs are based on
      },
    ],

    // Recruiter notes
    recruiterNotes: {
      type: String,
    },

    // Notification tracking
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook to calculate score
mcqTestSchema.pre("save", function (next) {
  if (this.questions && this.questions.length > 0) {
    const answered = this.questions.filter((q) => q.candidateAnswer !== null);
    const correct = this.questions.filter((q) => q.isCorrect === true);

    this.correctAnswers = correct.length;
    this.score = Math.round((correct.length / this.questions.length) * 100);

    // Update status based on score if test is completed
    if (this.completedAt && this.status === "in_progress") {
      this.status = this.score >= this.passingScore ? "passed" : "failed";
    }
  }
  next();
});

// Virtual for time remaining
mcqTestSchema.virtual("timeRemaining").get(function () {
  if (!this.startedAt || this.completedAt) return 0;
  const elapsed = (Date.now() - this.startedAt.getTime()) / 1000 / 60; // in minutes
  return Math.max(0, this.duration - elapsed);
});

// Virtual for pass status
mcqTestSchema.virtual("isPassed").get(function () {
  return this.score >= this.passingScore;
});

// Method to check if test is expired
mcqTestSchema.methods.isExpired = function () {
  if (this.expiresAt && new Date() > this.expiresAt) return true;
  if (this.startedAt) {
    const endTime = new Date(
      this.startedAt.getTime() + this.duration * 60 * 1000,
    );
    return new Date() > endTime;
  }
  return false;
};

// Method to add suspicious activity
mcqTestSchema.methods.logSuspiciousActivity = function (type, details) {
  this.suspiciousActivity.push({
    type,
    timestamp: new Date(),
    details,
  });

  if (type === "tab_switch") {
    this.tabSwitchCount++;
  }
  if (type === "window_blur") {
    this.fullscreenExitCount++;
  }
};

// Index for efficient queries
mcqTestSchema.index({ applicationId: 1, status: 1 });
mcqTestSchema.index({ candidateId: 1, status: 1 });
mcqTestSchema.index({ createdAt: -1 });

export const MCQTest = mongoose.model("MCQTest", mcqTestSchema);
