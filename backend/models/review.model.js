import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userRole: {
        type: String,
        enum: ['student', 'recruiter', 'company_admin'],
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        maxlength: 100
    },
    comment: {
        type: String,
        required: true,
        maxlength: 500
    },
    // For company reviews (optional)
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    },
    // For job reviews (optional)
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    },
    // Review type
    type: {
        type: String,
        enum: ['platform', 'company', 'job', 'interview_experience'],
        default: 'platform'
    },
    // Moderation
    isApproved: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    // Helpful votes
    helpfulCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index for fetching public approved reviews with high ratings
reviewSchema.index({ isPublic: 1, isApproved: 1, rating: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ company: 1 });

export const Review = mongoose.model('Review', reviewSchema);
