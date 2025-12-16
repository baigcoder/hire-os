/**
 * Interview Feedback Model
 * For collecting structured feedback from interviews
 */

import mongoose from 'mongoose';

const scorecardItemSchema = new mongoose.Schema({
    score: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
}, { _id: false });

const interviewFeedbackSchema = new mongoose.Schema({
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interview',
        required: true,
        index: true
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        required: true,
        index: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scorecard: {
        technicalSkills: scorecardItemSchema,
        communication: scorecardItemSchema,
        problemSolving: scorecardItemSchema,
        cultureFit: scorecardItemSchema,
        experience: scorecardItemSchema,
        enthusiasm: scorecardItemSchema
    },
    overallScore: {
        type: Number,
        min: 1,
        max: 5
    },
    recommendation: {
        type: String,
        enum: ['strong_hire', 'hire', 'no_hire', 'strong_no_hire', 'undecided'],
        required: true
    },
    strengths: [{
        type: String
    }],
    weaknesses: [{
        type: String
    }],
    notes: {
        type: String,
        default: ''
    },
    privateNotes: {
        type: String,
        default: ''
    },
    isSubmitted: {
        type: Boolean,
        default: false
    },
    submittedAt: {
        type: Date
    }
}, { timestamps: true });

// Calculate overall score before saving
interviewFeedbackSchema.pre('save', function (next) {
    if (this.scorecard) {
        const scores = [];
        Object.values(this.scorecard).forEach(item => {
            if (item && item.score) {
                scores.push(item.score);
            }
        });

        if (scores.length > 0) {
            this.overallScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        }
    }
    next();
});

// Index for efficient queries
interviewFeedbackSchema.index({ applicationId: 1, reviewerId: 1 }, { unique: true });
interviewFeedbackSchema.index({ jobId: 1, recommendation: 1 });

// Static method to get average scores for a candidate
interviewFeedbackSchema.statics.getCandidateAverageScores = async function (applicationId) {
    const feedbacks = await this.find({ applicationId, isSubmitted: true });

    if (feedbacks.length === 0) return null;

    const aggregated = {
        technicalSkills: 0,
        communication: 0,
        problemSolving: 0,
        cultureFit: 0,
        experience: 0,
        enthusiasm: 0,
        overall: 0
    };

    let count = 0;
    feedbacks.forEach(fb => {
        if (fb.scorecard) {
            Object.keys(fb.scorecard).forEach(key => {
                if (fb.scorecard[key]?.score) {
                    aggregated[key] = (aggregated[key] || 0) + fb.scorecard[key].score;
                }
            });
        }
        if (fb.overallScore) {
            aggregated.overall += fb.overallScore;
            count++;
        }
    });

    // Calculate averages
    Object.keys(aggregated).forEach(key => {
        aggregated[key] = Math.round((aggregated[key] / feedbacks.length) * 10) / 10;
    });

    // Recommendation summary
    const recommendations = feedbacks.reduce((acc, fb) => {
        acc[fb.recommendation] = (acc[fb.recommendation] || 0) + 1;
        return acc;
    }, {});

    return {
        averages: aggregated,
        recommendations,
        totalReviews: feedbacks.length
    };
};

export const InterviewFeedback = mongoose.model('InterviewFeedback', interviewFeedbackSchema);
