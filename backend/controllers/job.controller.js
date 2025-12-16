import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Application } from "../models/application.model.js";
import { Company } from "../models/company.model.js";
import { getMatchedJobsForStudent, getApplicationMatchScore } from "../utils/jobMatcher.js";

// Create new job posting (Company Admin/CEO only)
export const postJob = async (req, res) => {
    try {
        const {
            title,
            description,
            requirements,
            salary,
            location,
            jobType,
            experience,
            position,
            companyId,
            skills,
            benefits,
            deadline,
            isRemote
        } = req.body;
        const userId = req.id;

        // Verify user is a company admin
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false
            });
        }

        // Only company_admin can post jobs
        if (user.role !== 'company_admin') {
            return res.status(403).json({
                message: "Only Company Admins (CEOs) can post jobs. Recruiters can only manage applications.",
                success: false
            });
        }

        // Verify user owns this company
        const company = await Company.findById(companyId);
        if (!company || company.adminUser.toString() !== userId) {
            return res.status(403).json({
                message: "You can only post jobs for your own company.",
                success: false
            });
        }

        if (!title || !description || !requirements || !salary || !location || !jobType || !position || !companyId) {
            return res.status(400).json({
                message: "Please fill in all required fields.",
                success: false
            });
        }

        const job = await Job.create({
            title: title.trim(),
            description: description.trim(),
            requirements: typeof requirements === 'string' ? requirements.split(",").map(r => r.trim()) : requirements,
            salary: Number(salary),
            location: location.trim(),
            jobType,
            experienceLevel: isNaN(Number(experience)) ? 0 : Number(experience),
            position: Number(position),
            company: companyId,
            created_by: userId,
            skills: skills ? (typeof skills === 'string' ? skills.split(",").map(s => s.trim()) : skills) : [],
            benefits: benefits ? (typeof benefits === 'string' ? benefits.split(",").map(b => b.trim()) : benefits) : [],
            deadline: deadline ? new Date(deadline) : null,
            isRemote: isRemote || false,
            isActive: true,
            views: 0
        });

        await job.populate('company');

        return res.status(201).json({
            message: "Job posted successfully!",
            job,
            success: true
        });
    } catch (error) {
        console.error("Post job error:", error);
        return res.status(500).json({
            message: error.message || "Failed to create job posting",
            success: false
        });
    }
};

// Get all jobs with advanced filtering and pagination
export const getAllJobs = async (req, res) => {
    try {
        const {
            keyword,
            location,
            jobType,
            salary_min,
            salary_max,
            experience,
            page = 1,
            limit = 10,
            sort = 'createdAt',
            order = 'desc',
            isRemote
        } = req.query;

        // Build query
        const query = { isActive: { $ne: false } };

        // Keyword search in title and description
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: "i" } },
                { description: { $regex: keyword, $options: "i" } },
                { skills: { $regex: keyword, $options: "i" } }
            ];
        }

        // Location filter
        if (location) {
            query.location = { $regex: location, $options: "i" };
        }

        // Job type filter
        if (jobType) {
            query.jobType = { $regex: jobType, $options: "i" };
        }

        // Salary range filter
        if (salary_min || salary_max) {
            query.salary = {};
            if (salary_min) query.salary.$gte = Number(salary_min);
            if (salary_max) query.salary.$lte = Number(salary_max);
        }

        // Experience filter
        if (experience !== undefined) {
            query.experienceLevel = { $lte: Number(experience) };
        }

        // Remote filter
        if (isRemote === 'true') {
            query.isRemote = true;
        }

        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sortOrder = order === 'desc' ? -1 : 1;

        // Execute query
        const jobs = await Job.find(query)
            .populate('company')
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Get total count for pagination
        const totalJobs = await Job.countDocuments(query);
        const totalPages = Math.ceil(totalJobs / Number(limit));

        return res.status(200).json({
            jobs,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalJobs,
                hasNextPage: Number(page) < totalPages,
                hasPrevPage: Number(page) > 1
            },
            success: true
        });
    } catch (error) {
        console.error("Get jobs error:", error);
        return res.status(500).json({
            message: "Failed to fetch jobs",
            success: false
        });
    }
};

// Get job by ID with view tracking
export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;

        const job = await Job.findById(jobId)
            .populate('company')
            .populate({
                path: 'applications',
                select: 'applicant status createdAt'
            });

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        // Increment view count
        job.views = (job.views || 0) + 1;
        await job.save();

        // Check if user has already applied (if authenticated)
        let hasApplied = false;
        if (req.id) {
            hasApplied = job.applications.some(app =>
                app.applicant && app.applicant.toString() === req.id
            );
        }

        return res.status(200).json({
            job,
            hasApplied,
            success: true
        });
    } catch (error) {
        console.error("Get job error:", error);
        return res.status(500).json({
            message: "Failed to fetch job details",
            success: false
        });
    }
};

// Get admin/recruiter's posted jobs
export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.id;
        const { status, page = 1, limit = 10 } = req.query;

        const query = { created_by: adminId };

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const jobs = await Job.find(query)
            .populate('company')
            .populate({
                path: 'applications',
                select: 'status'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const totalJobs = await Job.countDocuments(query);

        // Add application stats to each job
        const jobsWithStats = jobs.map(job => ({
            ...job.toObject(),
            stats: {
                totalApplications: job.applications.length,
                pending: job.applications.filter(a => a.status === 'pending').length,
                accepted: job.applications.filter(a => a.status === 'accepted').length,
                rejected: job.applications.filter(a => a.status === 'rejected').length,
                interview: job.applications.filter(a => a.status === 'interview').length
            }
        }));

        return res.status(200).json({
            jobs: jobsWithStats,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalJobs / Number(limit)),
                totalJobs
            },
            success: true
        });
    } catch (error) {
        console.error("Get admin jobs error:", error);
        return res.status(500).json({
            message: "Failed to fetch your job postings",
            success: false
        });
    }
};

// Get all jobs for a company (for recruiters to view)
export const getCompanyJobs = async (req, res) => {
    try {
        const userId = req.id;
        const { status, page = 1, limit = 10 } = req.query;

        // Get user and their company
        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({
                message: "User not associated with a company",
                success: false
            });
        }

        const query = { company: user.companyId };

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const jobs = await Job.find(query)
            .populate('company')
            .populate({
                path: 'applications',
                select: 'status applicant createdAt',
                populate: {
                    path: 'applicant',
                    select: 'fullname email profile'
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const totalJobs = await Job.countDocuments(query);

        // Add application stats to each job
        const jobsWithStats = jobs.map(job => ({
            ...job.toObject(),
            stats: {
                totalApplications: job.applications.length,
                pending: job.applications.filter(a => a.status === 'pending').length,
                reviewed: job.applications.filter(a => a.status === 'reviewed').length,
                accepted: job.applications.filter(a => a.status === 'accepted').length,
                rejected: job.applications.filter(a => a.status === 'rejected').length,
                interview: job.applications.filter(a => a.status === 'interview').length
            }
        }));

        return res.status(200).json({
            jobs: jobsWithStats,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalJobs / Number(limit)),
                totalJobs
            },
            success: true
        });
    } catch (error) {
        console.error("Get company jobs error:", error);
        return res.status(500).json({
            message: "Failed to fetch company jobs",
            success: false
        });
    }
};

// Update job (Company Admin only)
export const updateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.id;
        const updates = req.body;

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        // Check ownership
        if (job.created_by.toString() !== userId) {
            return res.status(403).json({
                message: "You don't have permission to update this job",
                success: false
            });
        }

        // Process updates
        if (updates.requirements && typeof updates.requirements === 'string') {
            updates.requirements = updates.requirements.split(",").map(r => r.trim());
        }
        if (updates.skills && typeof updates.skills === 'string') {
            updates.skills = updates.skills.split(",").map(s => s.trim());
        }
        if (updates.benefits && typeof updates.benefits === 'string') {
            updates.benefits = updates.benefits.split(",").map(b => b.trim());
        }
        if (updates.salary) updates.salary = Number(updates.salary);
        if (updates.experience) updates.experienceLevel = Number(updates.experience);
        if (updates.position) updates.position = Number(updates.position);

        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('company');

        return res.status(200).json({
            message: "Job updated successfully",
            job: updatedJob,
            success: true
        });
    } catch (error) {
        console.error("Update job error:", error);
        return res.status(500).json({
            message: "Failed to update job",
            success: false
        });
    }
};

// Delete job (Recruiter only)
export const deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.id;

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        // Check ownership
        if (job.created_by.toString() !== userId) {
            return res.status(403).json({
                message: "You don't have permission to delete this job",
                success: false
            });
        }

        // Delete associated applications
        await Application.deleteMany({ job: jobId });

        // Delete the job
        await Job.findByIdAndDelete(jobId);

        return res.status(200).json({
            message: "Job deleted successfully",
            success: true
        });
    } catch (error) {
        console.error("Delete job error:", error);
        return res.status(500).json({
            message: "Failed to delete job",
            success: false
        });
    }
};

// Toggle job active status
export const toggleJobStatus = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.id;

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        if (job.created_by.toString() !== userId) {
            return res.status(403).json({
                message: "You don't have permission to modify this job",
                success: false
            });
        }

        job.isActive = !job.isActive;
        await job.save();

        return res.status(200).json({
            message: `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: job.isActive,
            success: true
        });
    } catch (error) {
        console.error("Toggle status error:", error);
        return res.status(500).json({
            message: "Failed to update job status",
            success: false
        });
    }
};

// Save/unsave job for students
export const toggleSaveJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.id;

        const user = await User.findById(userId);
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        const savedIndex = user.savedJobs.indexOf(jobId);
        let message;

        if (savedIndex > -1) {
            // Remove from saved
            user.savedJobs.splice(savedIndex, 1);
            message = "Job removed from saved jobs";
        } else {
            // Add to saved
            user.savedJobs.push(jobId);
            message = "Job saved successfully";
        }

        await user.save();

        return res.status(200).json({
            message,
            isSaved: savedIndex === -1,
            success: true
        });
    } catch (error) {
        console.error("Save job error:", error);
        return res.status(500).json({
            message: "Failed to save job",
            success: false
        });
    }
};

// Get saved jobs for student
export const getSavedJobs = async (req, res) => {
    try {
        const userId = req.id;

        const user = await User.findById(userId).populate({
            path: 'savedJobs',
            populate: { path: 'company' }
        });

        return res.status(200).json({
            jobs: user.savedJobs,
            success: true
        });
    } catch (error) {
        console.error("Get saved jobs error:", error);
        return res.status(500).json({
            message: "Failed to fetch saved jobs",
            success: false
        });
    }
};

// Get recommended jobs based on user profile
export const getRecommendedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const { limit = 10 } = req.query;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Build recommendation query based on user skills and preferences
        const query = { isActive: true };
        const orConditions = [];

        // Match by skills
        if (user.profile?.skills?.length > 0) {
            orConditions.push({
                $or: user.profile.skills.map(skill => ({
                    $or: [
                        { skills: { $regex: skill, $options: 'i' } },
                        { requirements: { $regex: skill, $options: 'i' } },
                        { title: { $regex: skill, $options: 'i' } }
                    ]
                }))
            });
        }

        // Match by location preferences
        if (user.jobPreferences?.locations?.length > 0) {
            orConditions.push({
                location: { $in: user.jobPreferences.locations.map(l => new RegExp(l, 'i')) }
            });
        }

        // Match by job type preferences
        if (user.jobPreferences?.jobTypes?.length > 0) {
            orConditions.push({
                jobType: { $in: user.jobPreferences.jobTypes }
            });
        }

        // Salary range
        if (user.jobPreferences?.salaryMin) {
            query.salary = { $gte: user.jobPreferences.salaryMin };
        }

        if (orConditions.length > 0) {
            query.$or = orConditions;
        }

        const jobs = await Job.find(query)
            .populate('company')
            .sort({ createdAt: -1 })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        // If not enough recommendations, fill with recent jobs
        if (jobs.length < Number(limit)) {
            const additionalJobs = await Job.find({
                isActive: true,
                _id: { $nin: jobs.map(j => j._id) }
            })
                .populate('company')
                .sort({ createdAt: -1 })
                .populate('company')
                .sort({ createdAt: -1 })
                .limit(Number(limit) - jobs.length)
                .lean();

            jobs.push(...additionalJobs);
        }

        return res.status(200).json({
            jobs,
            success: true
        });
    } catch (error) {
        console.error("Get recommended jobs error:", error);
        return res.status(500).json({
            message: "Failed to fetch recommended jobs",
            success: false
        });
    }
};

// Get job statistics for dashboard
export const getJobStats = async (req, res) => {
    try {
        const userId = req.id;

        const totalJobs = await Job.countDocuments({ created_by: userId });
        const activeJobs = await Job.countDocuments({ created_by: userId, isActive: true });

        const jobs = await Job.find({ created_by: userId }).populate('applications');

        let totalApplications = 0;
        let pendingApplications = 0;
        let totalViews = 0;

        jobs.forEach(job => {
            totalApplications += job.applications.length;
            pendingApplications += job.applications.filter(a => a.status === 'pending').length;
            totalViews += job.views || 0;
        });

        return res.status(200).json({
            stats: {
                totalJobs,
                activeJobs,
                totalApplications,
                pendingApplications,
                totalViews
            },
            success: true
        });
    } catch (error) {
        console.error("Get job stats error:", error);
        return res.status(500).json({
            message: "Failed to fetch statistics",
            success: false
        });
    }
};

// Get job report stats for AI analysis
export const getJobReportStats = async (req, res) => {
    try {
        const jobId = req.params.id;
        // Import necessary models
        const { Job } = await import('../models/job.model.js');
        const { Application } = await import('../models/application.model.js');

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found",
                success: false
            });
        }

        const stats = {
            totalApplications: 0,
            interviewed: 0,
            offers: 0,
            rejected: 0,
            hired: 0,
            avgScore: 0
        };

        const applications = await Application.find({ job: jobId })
            .select('status resumeScore applicant')
            .lean();
        stats.totalApplications = applications.length;

        let totalScore = 0;
        let scoredCount = 0;

        applications.forEach(app => {
            // Count status
            if (['interview', 'video_scheduled', 'video_completed', 'pending_ceo_approval'].includes(app.status)) {
                stats.interviewed++;
            }
            if (['offer_pending', 'offer_sent', 'offer_accepted'].includes(app.status)) {
                stats.offers++;
            }
            if (['rejected', 'offer_rejected'].includes(app.status)) {
                stats.rejected++;
            }
            if (app.status === 'hired') {
                stats.hired++;
            }

            // Calculate average resume score
            if (app.resumeScore) {
                totalScore += app.resumeScore;
                scoredCount++;
            }
        });

        if (scoredCount > 0) {
            stats.avgScore = Math.round(totalScore / scoredCount);
        }

        return res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};

// ========== AI JOB MATCHING ==========

// Get AI-matched jobs for current student
export const getAIMatchedJobs = async (req, res) => {
    try {
        const userId = req.id;
        const { limit = 20, location, jobType } = req.query;

        const user = await User.findById(userId);
        if (!user || user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: "Only students can access job matching"
            });
        }

        const matchedJobs = await getMatchedJobsForStudent(userId, {
            limit: parseInt(limit),
            location,
            jobType
        });

        // Group by match quality
        const excellent = matchedJobs.filter(j => j.match.score >= 85);
        const strong = matchedJobs.filter(j => j.match.score >= 70 && j.match.score < 85);
        const good = matchedJobs.filter(j => j.match.score >= 55 && j.match.score < 70);
        const other = matchedJobs.filter(j => j.match.score < 55);

        return res.status(200).json({
            success: true,
            message: "AI-matched jobs retrieved successfully",
            data: {
                total: matchedJobs.length,
                topMatches: matchedJobs.slice(0, 5),
                byCategory: {
                    excellent: excellent.length,
                    strong: strong.length,
                    good: good.length,
                    other: other.length
                },
                jobs: matchedJobs
            }
        });

    } catch (error) {
        console.error("AI job matching error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get matched jobs"
        });
    }
};

// Get match score for a specific job
export const getJobMatchScore = async (req, res) => {
    try {
        const userId = req.id;
        const { id: jobId } = req.params;

        const matchResult = await getApplicationMatchScore(userId, jobId);

        return res.status(200).json({
            success: true,
            match: matchResult
        });

    } catch (error) {
        console.error("Job match score error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to calculate match score"
        });
    }
};

// Get similar jobs based on a job ID
export const getSimilarJobs = async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const { limit = 5 } = req.query;

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        // Find jobs with similar skills, location, or from same company
        const similarQuery = {
            _id: { $ne: jobId },
            isActive: true,
            $or: [
                { skills: { $in: job.skills || [] } },
                { company: job.company },
                { jobType: job.jobType },
                { location: new RegExp(job.location?.split(',')[0] || '', 'i') }
            ]
        };

        const similarJobs = await Job.find(similarQuery)
            .populate('company', 'name logo')
            .limit(parseInt(limit))
            .lean();

        // Calculate similarity score
        const scoredJobs = similarJobs.map(sj => {
            let score = 0;

            // Skills overlap
            const overlap = (sj.skills || []).filter(s =>
                (job.skills || []).includes(s)
            ).length;
            score += overlap * 20;

            // Same company
            if (sj.company?._id?.toString() === job.company?.toString()) {
                score += 15;
            }

            // Same job type
            if (sj.jobType === job.jobType) {
                score += 10;
            }

            // Similar salary range
            if (Math.abs((sj.salary || 0) - (job.salary || 0)) < 20000) {
                score += 10;
            }

            return {
                ...sj,
                similarityScore: Math.min(100, score),
                matchReason: overlap > 0 ? `${overlap} matching skills` :
                    sj.company?._id?.toString() === job.company?.toString() ? 'Same company' : 'Similar role'
            };
        });

        // Sort by similarity
        scoredJobs.sort((a, b) => b.similarityScore - a.similarityScore);

        return res.status(200).json({
            success: true,
            originalJob: {
                _id: job._id,
                title: job.title,
                skills: job.skills
            },
            similarJobs: scoredJobs
        });

    } catch (error) {
        console.error("Similar jobs error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get similar jobs"
        });
    }
};

// Get public jobs for a specific company (no auth required)
export const getPublicJobsByCompanyId = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Verify company exists
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                message: "Company not found",
                success: false
            });
        }

        const skip = (Number(page) - 1) * Number(limit);

        // Only return active jobs
        const jobs = await Job.find({
            company: companyId,
            isActive: true
        })
            .populate('company', 'name logo industry location')
            .select('title description location jobType salary experienceLevel position createdAt isRemote skills')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const totalJobs = await Job.countDocuments({
            company: companyId,
            isActive: true
        });

        return res.status(200).json({
            jobs,
            company: {
                _id: company._id,
                name: company.name,
                logo: company.logo
            },
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalJobs / Number(limit)),
                totalJobs
            },
            success: true
        });
    } catch (error) {
        console.error("Get public company jobs error:", error);
        return res.status(500).json({
            message: "Failed to fetch company jobs",
            success: false
        });
    }
};
