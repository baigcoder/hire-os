import express from 'express';
import { Job } from '../models/job.model.js';
import { Company } from '../models/company.model.js';
import { User } from '../models/user.model.js';
import { Application } from '../models/application.model.js';
import { Review } from '../models/review.model.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';

const router = express.Router();

/**
 * GET /api/v1/stats/public
 * Returns public statistics for the landing page
 * No authentication required
 */
router.get('/public', async (req, res) => {
    try {
        // Get counts from MongoDB - REAL NUMBERS
        const [
            activeJobsCount,
            totalJobsCount,
            companiesCount,
            candidatesCount,
            totalApplications,
            successfulHires
        ] = await Promise.all([
            Job.countDocuments({ status: 'active' }),
            Job.countDocuments(), // Total jobs (active or not)
            Company.countDocuments(),
            User.countDocuments({ role: 'student' }),
            Application.countDocuments(),
            Application.countDocuments({ status: 'accepted' })
        ]);

        // Calculate success rate
        let successRate = 0;
        if (totalApplications > 0) {
            successRate = Math.round((successfulHires / totalApplications) * 100);
        }

        // Return REAL numbers - no fake fallbacks
        res.status(200).json({
            success: true,
            stats: {
                activeJobs: {
                    count: activeJobsCount,
                    display: `${activeJobsCount}+`,
                    label: 'ACTIVE JOBS'
                },
                companies: {
                    count: companiesCount,
                    display: `${companiesCount}+`,
                    label: 'COMPANIES'
                },
                candidates: {
                    count: candidatesCount,
                    display: `${candidatesCount}+`,
                    label: 'CANDIDATES'
                },
                successRate: {
                    count: successRate || 0,
                    display: successRate > 0 ? `${successRate}%` : '0%',
                    label: 'SUCCESS RATE'
                }
            },
            raw: {
                activeJobs: activeJobsCount,
                totalJobs: totalJobsCount,
                companies: companiesCount,
                candidates: candidatesCount,
                applications: totalApplications,
                successfulHires: successfulHires,
                successRate: successRate
            }
        });
    } catch (error) {
        console.error('Stats API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats',
            raw: { activeJobs: 0, companies: 0, candidates: 0, successRate: 0 }
        });
    }
});

/**
 * GET /api/v1/stats/my-review
 * Returns the current user's review (if any)
 */
router.get('/my-review', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;

        const review = await Review.findOne({ user: userId, type: 'platform' })
            .populate('user', 'fullname profile.profilePhoto');

        if (!review) {
            return res.status(200).json({
                success: true,
                review: null
            });
        }

        res.status(200).json({
            success: true,
            review: {
                _id: review._id,
                rating: review.rating,
                title: review.title,
                comment: review.comment,
                createdAt: review.createdAt
            }
        });
    } catch (error) {
        console.error('My Review API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch review'
        });
    }
});

/**
 * GET /api/v1/stats/reviews
 * Returns public reviews with 4+ star ratings for testimonials
 * No authentication required
 */
router.get('/reviews', async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        // Fetch reviews with 4+ star ratings, public, and approved
        const reviews = await Review.find({
            rating: { $gte: 4 },
            isPublic: true,
            isApproved: true,
            comment: { $exists: true, $ne: '' }
        })
            .populate('user', 'fullname profile.profilePhoto role')
            .populate('company', 'name logo')
            .sort({ rating: -1, createdAt: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: reviews.length,
            reviews: reviews.map(r => ({
                _id: r._id,
                rating: r.rating,
                title: r.title,
                comment: r.comment,
                type: r.type,
                createdAt: r.createdAt,
                user: r.user ? {
                    name: r.user.fullname,
                    photo: r.user.profile?.profilePhoto,
                    role: r.user.role
                } : null,
                company: r.company ? {
                    name: r.company.name,
                    logo: r.company.logo
                } : null
            }))
        });
    } catch (error) {
        console.error('Reviews API Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            reviews: []
        });
    }
});

/**
 * POST /api/v1/stats/reviews
 * Submit a new review (requires authentication)
 */
router.post('/reviews', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id; // From auth middleware
        const { rating, title, comment, type = 'platform', companyId, jobId } = req.body;

        if (!rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Rating and comment are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user already has a platform review
        const existingReview = await Review.findOne({ user: userId, type: 'platform' });
        if (existingReview) {
            // Update existing review
            existingReview.rating = rating;
            existingReview.title = title;
            existingReview.comment = comment;
            await existingReview.save();

            return res.status(200).json({
                success: true,
                message: 'Review updated successfully',
                review: existingReview
            });
        }

        const review = await Review.create({
            user: userId,
            userRole: user.role,
            rating,
            title,
            comment,
            type,
            company: companyId || undefined,
            job: jobId || undefined,
            isPublic: true,
            isApproved: true
        });

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review
        });
    } catch (error) {
        console.error('Create Review Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit review'
        });
    }
});

/**
 * GET /api/v1/stats/recruiter
 * Returns analytics for recruiters/company admins
 */
router.get('/recruiter', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;
        const { period = '30d' } = req.query;

        const user = await User.findById(userId);
        if (user.role !== 'recruiter' && user.role !== 'company_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Calculate date range
        const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[period] || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get jobs for the company
        const companyId = user.companyId;
        const jobs = await Job.find({ company: companyId }).select('_id title');
        const jobIds = jobs.map(j => j._id);

        // Get all applications for company's jobs
        const applications = await Application.find({
            job: { $in: jobIds },
            createdAt: { $gte: startDate }
        }).populate('job', 'title');

        // Calculate overview stats
        const totalApplications = applications.length;
        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const newThisWeek = applications.filter(a => a.createdAt >= lastWeekStart).length;

        // Calculate previous period for comparison
        const prevEnd = startDate;
        const prevStart = new Date(startDate);
        prevStart.setDate(prevStart.getDate() - days);
        const prevApplications = await Application.countDocuments({
            job: { $in: jobIds },
            createdAt: { $gte: prevStart, $lt: prevEnd }
        });
        const changePercent = prevApplications > 0
            ? Math.round(((totalApplications - prevApplications) / prevApplications) * 100)
            : 0;

        // Active jobs count
        const activeJobs = await Job.countDocuments({ company: companyId, status: 'active' });

        // Calculate funnel
        const funnel = {
            applied: totalApplications,
            screened: applications.filter(a => ['reviewing', 'screened', 'shortlisted', 'interview', 'interviewed', 'video_scheduled', 'video_completed', 'pending_ceo_approval', 'offer_pending', 'offer_sent', 'offer_accepted', 'hired'].includes(a.status)).length,
            interviewed: applications.filter(a => ['interviewed', 'video_completed', 'pending_ceo_approval', 'offer_pending', 'offer_sent', 'offer_accepted', 'hired'].includes(a.status)).length,
            offered: applications.filter(a => ['offer_pending', 'offer_sent', 'offer_accepted', 'hired'].includes(a.status)).length,
            hired: applications.filter(a => a.status === 'hired').length
        };

        // By status
        const byStatus = {
            pending: applications.filter(a => a.status === 'pending').length,
            reviewing: applications.filter(a => a.status === 'reviewing' || a.status === 'screened').length,
            interviewing: applications.filter(a => ['interview', 'video_scheduled', 'video_completed'].includes(a.status)).length,
            offered: applications.filter(a => ['offer_pending', 'offer_sent'].includes(a.status)).length,
            rejected: applications.filter(a => a.status === 'rejected').length,
            hired: applications.filter(a => a.status === 'hired' || a.status === 'offer_accepted').length
        };

        // Top performing jobs
        const jobCounts = {};
        applications.forEach(app => {
            const jobTitle = app.job?.title || 'Unknown';
            if (!jobCounts[jobTitle]) {
                jobCounts[jobTitle] = { applications: 0, interviews: 0 };
            }
            jobCounts[jobTitle].applications++;
            if (['interview', 'interviewed', 'video_scheduled', 'video_completed', 'pending_ceo_approval', 'offer_pending', 'offer_sent', 'offer_accepted', 'hired'].includes(app.status)) {
                jobCounts[jobTitle].interviews++;
            }
        });

        const topJobs = Object.entries(jobCounts)
            .map(([title, data]) => ({ title, ...data }))
            .sort((a, b) => b.applications - a.applications)
            .slice(0, 5);

        // Weekly trend (last 7 days)
        const weeklyTrend = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const count = applications.filter(a => a.createdAt >= dayStart && a.createdAt <= dayEnd).length;
            weeklyTrend.push(count);
        }

        // Calculate averages
        const offeredApps = applications.filter(a => ['offer_sent', 'offer_accepted', 'hired'].includes(a.status));
        const offerAcceptRate = offeredApps.length > 0
            ? Math.round((applications.filter(a => ['offer_accepted', 'hired'].includes(a.status)).length / offeredApps.length) * 100)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalApplications,
                    newThisWeek,
                    changePercent,
                    activeJobs,
                    avgTimeToHire: 18, // Placeholder - would calculate from actual data
                    offerAcceptRate
                },
                funnel,
                byStatus,
                topJobs,
                weeklyTrend
            }
        });

    } catch (error) {
        console.error('Recruiter stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics'
        });
    }
});

export default router;

