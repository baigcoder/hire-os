import mongoose from "mongoose";

const companyReviewSchema = new mongoose.Schema(
    {
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Anonymity
        isAnonymous: {
            type: Boolean,
            default: true,
        },
        // Ratings (1-5 scale)
        ratings: {
            overall: { type: Number, min: 1, max: 5, required: true },
            workLifeBalance: { type: Number, min: 1, max: 5 },
            culture: { type: Number, min: 1, max: 5 },
            compensation: { type: Number, min: 1, max: 5 },
            management: { type: Number, min: 1, max: 5 },
            careerGrowth: { type: Number, min: 1, max: 5 },
        },
        // Review content
        title: {
            type: String,
            required: true,
            maxlength: 200,
        },
        pros: {
            type: String,
            required: true,
            maxlength: 2000,
        },
        cons: {
            type: String,
            required: true,
            maxlength: 2000,
        },
        advice: {
            type: String,
            maxlength: 1000,
        },
        // Employment info
        employmentStatus: {
            type: String,
            enum: ["current", "former"],
            required: true,
        },
        jobTitle: String,
        department: String,
        employmentType: {
            type: String,
            enum: ["full-time", "part-time", "contract", "internship"],
        },
        yearsAtCompany: Number,
        // Recommendations
        recommendToFriend: { type: Boolean, default: true },
        approveOfCEO: Boolean,
        businessOutlook: {
            type: String,
            enum: ["positive", "neutral", "negative"],
        },
        // Moderation
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "flagged"],
            default: "pending",
            index: true,
        },
        moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        moderatedAt: Date,
        rejectReason: String,
        // Engagement
        helpful: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        reported: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            reason: String,
            createdAt: { type: Date, default: Date.now },
        }],
        // Company response
        companyResponse: {
            content: String,
            respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            respondedAt: Date,
        },
    },
    { timestamps: true }
);

// Indexes
companyReviewSchema.index({ company: 1, status: 1 });
companyReviewSchema.index({ reviewer: 1 });
companyReviewSchema.index({ createdAt: -1 });
companyReviewSchema.index({ "ratings.overall": -1 });

// Virtual for helpful count
companyReviewSchema.virtual("helpfulCount").get(function () {
    return this.helpful?.length || 0;
});

// Static: Get company average ratings
companyReviewSchema.statics.getCompanyRatings = async function (companyId) {
    const result = await this.aggregate([
        { $match: { company: companyId, status: "approved" } },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                overall: { $avg: "$ratings.overall" },
                workLifeBalance: { $avg: "$ratings.workLifeBalance" },
                culture: { $avg: "$ratings.culture" },
                compensation: { $avg: "$ratings.compensation" },
                management: { $avg: "$ratings.management" },
                careerGrowth: { $avg: "$ratings.careerGrowth" },
                recommendPercent: { $avg: { $cond: ["$recommendToFriend", 1, 0] } },
            },
        },
    ]);
    return result[0] || null;
};

companyReviewSchema.set("toJSON", { virtuals: true });
companyReviewSchema.set("toObject", { virtuals: true });

export const CompanyReview = mongoose.model("CompanyReview", companyReviewSchema);
