import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        index: true
    },
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        index: true
    },

    // Application Status
    status: {
        type: String,
        enum: [
            "pending",           // Just applied
            "under_review",      // Being reviewed by recruiter
            "shortlisted",       // Shortlisted for next round
            "interview",         // Interview scheduled
            "mcq_pending",       // Waiting for MCQ test
            "mcq_passed",        // Passed MCQ, video interview next
            "mcq_failed",        // Failed MCQ
            "video_scheduled",   // Video interview scheduled
            "video_completed",   // Video interview done
            "pending_ceo_approval", // Passed by recruiter, waiting for CEO final approval
            "offer_pending",     // Waiting for offer decision
            "offer_sent",        // Offer letter sent
            "offer_accepted",    // Candidate accepted offer
            "offer_rejected",    // Candidate rejected offer
            "hired",             // Successfully hired
            "rejected",          // Application rejected
            "withdrawn"          // Candidate withdrew application
        ],
        default: "pending",
        index: true
    },

    // Recruiter Review (before passing to CEO)
    recruiterReview: {
        decision: {
            type: String,
            enum: ['pending', 'passed', 'rejected']
        },
        notes: String,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        reviewedAt: Date
    },

    // CEO Final Review
    ceoReview: {
        decision: {
            type: String,
            enum: ['approved', 'rejected']
        },
        notes: String,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        reviewedAt: Date
    },

    // Cover Letter
    coverLetter: {
        type: String,
        default: "",
        maxlength: 5000
    },
    aiGeneratedCoverLetter: {
        type: String
    },

    // Resume Analysis
    resumeAnalysis: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ResumeAnalysis"
    },
    resumeScore: {
        type: Number,
        min: 0,
        max: 100,
        index: true
    },
    resumeUrl: {
        type: String
    },

    // Interview Reference
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview"
    },

    // Legacy interview details (for backward compatibility)
    interviewDetails: {
        date: {
            type: Date
        },
        details: {
            type: String
        },
        completed: {
            type: Boolean,
            default: false
        },
        viewed: {
            type: Boolean,
            default: false
        }
    },

    // Status History
    statusHistory: [{
        status: String,
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        notes: String
    }],

    // Recruiter Notes
    recruiterNotes: [{
        note: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        isPrivate: {
            type: Boolean,
            default: true
        }
    }],

    // Rating by recruiter
    rating: {
        overall: {
            type: Number,
            min: 1,
            max: 5
        },
        skills: {
            type: Number,
            min: 1,
            max: 5
        },
        experience: {
            type: Number,
            min: 1,
            max: 5
        },
        communication: {
            type: Number,
            min: 1,
            max: 5
        },
        ratedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        ratedAt: Date
    },

    // Application Tracking
    viewedAt: Date,
    viewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    firstViewedAt: Date,
    viewCount: {
        type: Number,
        default: 0
    },

    // Source tracking
    source: {
        type: String,
        enum: ['direct', 'email', 'referral', 'job_board', 'social', 'other'],
        default: 'direct'
    },
    referralCode: String,

    // Flags
    isStarred: {
        type: Boolean,
        default: false
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReason: String,

    // Withdrawal
    withdrawnAt: Date,
    withdrawnReason: String,

    // Tags for organization
    tags: [{
        type: String,
        trim: true
    }],

    // Activity Timeline
    timeline: [{
        action: {
            type: String,
            required: true
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        metadata: mongoose.Schema.Types.Mixed
    }],

    // Priority for sorting
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    // Assigned recruiter for this application
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Expected salary from candidate
    expectedSalary: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'PKR' }
    },

    // Availability
    noticePeriod: String,
    availableFrom: Date

}, {
    timestamps: true
});

// Indexes for performance
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ company: 1, status: 1 });
applicationSchema.index({ resumeScore: -1 });

// Virtual for days since application
applicationSchema.virtual('daysSinceApplication').get(function () {
    const diff = new Date() - this.createdAt;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Method to add status history entry
applicationSchema.methods.addStatusHistory = function (status, userId, notes = '') {
    this.statusHistory.push({
        status,
        changedBy: userId,
        changedAt: new Date(),
        notes
    });
    this.status = status;
};

// Method to add recruiter note
applicationSchema.methods.addNote = function (note, userId, isPrivate = true) {
    this.recruiterNotes.push({
        note,
        createdBy: userId,
        createdAt: new Date(),
        isPrivate
    });
};

// Pre-save hook to update status history
applicationSchema.pre('save', function (next) {
    if (this.isModified('status') && !this.isNew) {
        // Status history is added manually via addStatusHistory method
    }
    next();
});

// Ensure virtuals are included in JSON
applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

export const Application = mongoose.model("Application", applicationSchema);