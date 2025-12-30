import { CompanyReview } from "../models/companyReview.model.js";
import { User } from "../models/user.model.js";

// Submit a review
export const submitReview = async (req, res) => {
    try {
        const userId = req.id;
        const { companyId, ratings, title, pros, cons, advice, isAnonymous, employmentStatus, jobTitle, recommendToFriend } = req.body;

        if (!ratings?.overall || !title || !pros || !cons) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const existing = await CompanyReview.findOne({ company: companyId, reviewer: userId });
        if (existing) {
            return res.status(400).json({ success: false, message: "You've already reviewed this company" });
        }

        const review = await CompanyReview.create({
            company: companyId,
            reviewer: userId,
            ratings,
            title,
            pros,
            cons,
            advice,
            isAnonymous: isAnonymous !== false,
            employmentStatus,
            jobTitle,
            recommendToFriend: recommendToFriend !== false,
        });

        return res.status(201).json({ success: true, message: "Review submitted for moderation", review });
    } catch (error) {
        console.error("Submit review error:", error);
        return res.status(500).json({ success: false, message: "Failed to submit review" });
    }
};

// Get company reviews
export const getCompanyReviews = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 10, sort = "recent" } = req.query;

        const sortOption = sort === "helpful" ? { helpfulCount: -1 } : { createdAt: -1 };

        const reviews = await CompanyReview.find({ company: companyId, status: "approved" })
            .populate("reviewer", "fullname profile.profilePhoto")
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await CompanyReview.countDocuments({ company: companyId, status: "approved" });
        const ratings = await CompanyReview.getCompanyRatings(companyId);

        return res.status(200).json({
            success: true,
            reviews: reviews.map(r => ({
                ...r.toObject(),
                reviewer: r.isAnonymous ? null : r.reviewer,
            })),
            ratings,
            pagination: { page: parseInt(page), limit: parseInt(limit), total },
        });
    } catch (error) {
        console.error("Get reviews error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
};

// Mark review as helpful
export const markHelpful = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.id;

        const review = await CompanyReview.findById(reviewId);
        if (!review) return res.status(404).json({ success: false, message: "Review not found" });

        const idx = review.helpful.indexOf(userId);
        if (idx >= 0) {
            review.helpful.splice(idx, 1);
        } else {
            review.helpful.push(userId);
        }
        await review.save();

        return res.status(200).json({ success: true, helpful: review.helpful.length });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update" });
    }
};

// Moderate review (admin)
export const moderateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { status, rejectReason } = req.body;
        const userId = req.id;

        const review = await CompanyReview.findById(reviewId);
        if (!review) return res.status(404).json({ success: false, message: "Review not found" });

        review.status = status;
        review.moderatedBy = userId;
        review.moderatedAt = new Date();
        if (rejectReason) review.rejectReason = rejectReason;
        await review.save();

        return res.status(200).json({ success: true, message: `Review ${status}` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Moderation failed" });
    }
};

// Company respond to review
export const respondToReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { content } = req.body;
        const userId = req.id;

        const review = await CompanyReview.findById(reviewId);
        if (!review) return res.status(404).json({ success: false, message: "Review not found" });

        // Verify user is company admin
        const user = await User.findById(userId);
        if (!user || review.company.toString() !== user.companyId?.toString()) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        review.companyResponse = { content, respondedBy: userId, respondedAt: new Date() };
        await review.save();

        return res.status(200).json({ success: true, message: "Response added" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to respond" });
    }
};
