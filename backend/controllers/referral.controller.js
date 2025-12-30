import { Referral } from "../models/referral.model.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";

// Generate a new referral code for the user
export const generateReferralCode = async (req, res) => {
    try {
        const userId = req.id;
        const { jobId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check if user already has an active referral code (without job)
        if (!jobId) {
            const existingReferral = await Referral.findOne({
                referrer: userId,
                job: null,
                status: "pending",
            });

            if (existingReferral) {
                return res.status(200).json({
                    success: true,
                    message: "Existing referral code found",
                    referral: existingReferral,
                });
            }
        }

        // Generate unique code
        const code = await Referral.generateCode(user.fullname);

        // Create referral
        const referral = await Referral.create({
            referrer: userId,
            code,
            job: jobId || null,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        });

        return res.status(201).json({
            success: true,
            message: "Referral code generated successfully",
            referral,
            shareUrl: `${process.env.FRONTEND_URL}/signup?ref=${code}`,
        });
    } catch (error) {
        console.error("Generate referral error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate referral code",
            error: error.message,
        });
    }
};

// Send referral invitation via email
export const sendReferralInvite = async (req, res) => {
    try {
        const userId = req.id;
        const { email, message, jobId } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check if already referred this email
        const existingReferral = await Referral.findOne({
            referrer: userId,
            refereeEmail: email.toLowerCase(),
        });

        if (existingReferral) {
            return res.status(400).json({
                success: false,
                message: "You have already invited this email",
            });
        }

        // Generate code
        const code = await Referral.generateCode(user.fullname);

        // Create referral
        const referral = await Referral.create({
            referrer: userId,
            refereeEmail: email.toLowerCase(),
            code,
            job: jobId || null,
            metadata: {
                source: "email",
            },
            invitation: {
                sentAt: new Date(),
                message: message || "",
            },
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        // Prepare job info if job-specific
        let jobInfo = null;
        if (jobId) {
            jobInfo = await Job.findById(jobId).populate("company", "name logo");
        }

        // TODO: Send invitation email when email service is configured
        const signupUrl = `${process.env.FRONTEND_URL}/signup?ref=${code}`;
        console.log(`Referral invite would be sent to ${email} with link: ${signupUrl}`);

        return res.status(200).json({
            success: true,
            message: "Invitation created successfully",
            referral,
            signupUrl,
        });
    } catch (error) {
        console.error("Send referral invite error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send invitation",
            error: error.message,
        });
    }
};

// Get user's referrals
export const getMyReferrals = async (req, res) => {
    try {
        const userId = req.id;
        const { status, page = 1, limit = 10 } = req.query;

        const query = { referrer: userId };
        if (status) {
            query.status = status;
        }

        const referrals = await Referral.find(query)
            .populate("referee", "fullname email profile.profilePhoto")
            .populate("job", "title company")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Referral.countDocuments(query);

        // Calculate stats
        const stats = await Referral.aggregate([
            { $match: { referrer: userId } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const statsMap = stats.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
        }, {});

        return res.status(200).json({
            success: true,
            referrals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
            stats: {
                pending: statsMap.pending || 0,
                signedUp: statsMap.signed_up || 0,
                applied: statsMap.applied || 0,
                hired: statsMap.hired || 0,
                rewarded: statsMap.rewarded || 0,
                total,
            },
        });
    } catch (error) {
        console.error("Get referrals error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch referrals",
            error: error.message,
        });
    }
};

// Get referral statistics
export const getReferralStats = async (req, res) => {
    try {
        const userId = req.id;

        const [stats, totalRewards, topReferrers] = await Promise.all([
            // User's stats
            Referral.aggregate([
                { $match: { referrer: userId } },
                {
                    $group: {
                        _id: null,
                        totalReferrals: { $sum: 1 },
                        signedUp: {
                            $sum: { $cond: [{ $ne: ["$status", "pending"] }, 1, 0] },
                        },
                        hired: {
                            $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] },
                        },
                        totalClicks: { $sum: "$metadata.clickCount" },
                        totalRewards: { $sum: "$reward.amount" },
                    },
                },
            ]),

            // Total rewards earned
            Referral.aggregate([
                { $match: { referrer: userId, status: "rewarded" } },
                {
                    $group: {
                        _id: "$reward.type",
                        total: { $sum: "$reward.amount" },
                    },
                },
            ]),

            // Leaderboard (top 10 referrers this month)
            Referral.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(new Date().setDate(1)), // First of month
                        },
                        status: { $ne: "pending" },
                    },
                },
                {
                    $group: {
                        _id: "$referrer",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                { $unwind: "$user" },
                {
                    $project: {
                        count: 1,
                        "user.fullname": 1,
                        "user.profile.profilePhoto": 1,
                    },
                },
            ]),
        ]);

        const userStats = stats[0] || {
            totalReferrals: 0,
            signedUp: 0,
            hired: 0,
            totalClicks: 0,
            totalRewards: 0,
        };

        // Calculate conversion rate
        userStats.conversionRate = userStats.totalReferrals > 0
            ? ((userStats.signedUp / userStats.totalReferrals) * 100).toFixed(1)
            : 0;

        return res.status(200).json({
            success: true,
            stats: userStats,
            rewards: totalRewards,
            leaderboard: topReferrers,
        });
    } catch (error) {
        console.error("Get referral stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch statistics",
            error: error.message,
        });
    }
};

// Apply referral code (during signup)
export const applyReferralCode = async (req, res) => {
    try {
        const { code, userId } = req.body;

        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                message: "Code and userId are required",
            });
        }

        const referral = await Referral.findOne({
            code: code.toUpperCase(),
            status: "pending",
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: "Invalid or expired referral code",
            });
        }

        // Check if expired
        if (referral.expiresAt && new Date() > referral.expiresAt) {
            referral.status = "expired";
            await referral.save();
            return res.status(400).json({
                success: false,
                message: "Referral code has expired",
            });
        }

        // Check self-referral
        if (referral.referrer.toString() === userId) {
            return res.status(400).json({
                success: false,
                message: "Cannot use your own referral code",
            });
        }

        // Mark as signed up
        await referral.markSignedUp(userId);

        // Get referrer info
        const referrer = await User.findById(referral.referrer).select("fullname");

        return res.status(200).json({
            success: true,
            message: "Referral code applied successfully",
            referrer: referrer?.fullname,
        });
    } catch (error) {
        console.error("Apply referral code error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to apply referral code",
            error: error.message,
        });
    }
};

// Track referral link click
export const trackReferralClick = async (req, res) => {
    try {
        const { code } = req.params;

        const referral = await Referral.findOne({ code: code.toUpperCase() });
        if (!referral) {
            return res.status(404).json({
                success: false,
                message: "Referral not found",
            });
        }

        await referral.recordClick();

        return res.status(200).json({
            success: true,
            valid: referral.status === "pending" && !referral.isExpired,
        });
    } catch (error) {
        console.error("Track click error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to track click",
        });
    }
};

// Admin: Mark referral as rewarded
export const markRewarded = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type } = req.body;

        const referral = await Referral.findById(id);
        if (!referral) {
            return res.status(404).json({
                success: false,
                message: "Referral not found",
            });
        }

        if (referral.status === "rewarded") {
            return res.status(400).json({
                success: false,
                message: "Already rewarded",
            });
        }

        await referral.markRewarded(amount || 100, type || "credits");

        return res.status(200).json({
            success: true,
            message: "Referral marked as rewarded",
            referral,
        });
    } catch (error) {
        console.error("Mark rewarded error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark as rewarded",
            error: error.message,
        });
    }
};

// Update referral status when candidate applies/gets hired
export const updateReferralOnApplication = async (applicantId, status) => {
    try {
        // Find referral for this user
        const referral = await Referral.findOne({
            referee: applicantId,
            status: { $in: ["signed_up", "applied"] },
        });

        if (!referral) return;

        if (status === "applied" && referral.status === "signed_up") {
            referral.status = "applied";
            await referral.save();
        } else if (status === "hired" && referral.status !== "hired") {
            referral.status = "hired";
            await referral.save();

            // Auto-reward on hire (configurable)
            // await referral.markRewarded(500, "credits");
        }
    } catch (error) {
        console.error("Update referral on application error:", error);
    }
};
