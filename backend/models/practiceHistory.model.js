import mongoose from 'mongoose';

const practiceHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['mock_test', 'mock_interview'],
        required: true
    },
    // Common fields
    score: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    grade: {
        type: String,
        default: 'N/A'
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },

    // Mock Test specific data
    testData: {
        topic: String,
        difficulty: String,
        totalQuestions: Number,
        correctAnswers: Number,
        wrongAnswers: Number,
        questions: [{
            question: String,
            userAnswer: String,
            correctAnswer: String,
            isCorrect: Boolean,
            explanation: String
        }]
    },

    // Mock Interview specific data
    interviewData: {
        interviewType: String, // behavioral, technical, hr
        voiceUsed: String,
        language: String,
        questionsAnswered: Number,
        responses: [{
            question: String,
            answer: String,
            feedback: String
        }],
        summary: {
            overallScore: Number,
            communicationScore: Number,
            confidenceScore: Number,
            strengths: [String],
            improvements: [String],
            tips: [String],
            readyForRealInterview: Boolean
        }
    },

    // Session metadata
    sessionId: String,
    completedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
practiceHistorySchema.index({ user: 1, createdAt: -1 });
practiceHistorySchema.index({ user: 1, type: 1, createdAt: -1 });

// Virtual for formatted duration
practiceHistorySchema.virtual('formattedDuration').get(function () {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Static method to get user's practice stats
practiceHistorySchema.statics.getUserStats = async function (userId) {
    const stats = await this.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: '$type',
                totalSessions: { $sum: 1 },
                avgScore: { $avg: '$score' },
                totalDuration: { $sum: '$duration' },
                bestScore: { $max: '$score' }
            }
        }
    ]);

    return stats.reduce((acc, stat) => {
        acc[stat._id] = {
            totalSessions: stat.totalSessions,
            avgScore: Math.round(stat.avgScore || 0),
            totalDuration: stat.totalDuration,
            bestScore: stat.bestScore || 0
        };
        return acc;
    }, {});
};

const PracticeHistory = mongoose.model('PracticeHistory', practiceHistorySchema);

export default PracticeHistory;
