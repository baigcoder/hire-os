import { JobTemplate } from "../models/jobTemplate.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";

// Create a new job template
export const createTemplate = async (req, res) => {
    try {
        const userId = req.id;
        const { name, category, description, template, isPublic, tags } = req.body;

        // Get user and their company
        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({
                success: false,
                message: "You must be associated with a company to create templates",
            });
        }

        if (!name || !template?.title || !template?.description) {
            return res.status(400).json({
                success: false,
                message: "Template name, title, and description are required",
            });
        }

        const jobTemplate = await JobTemplate.create({
            company: user.companyId,
            createdBy: userId,
            name,
            category: category || "other",
            description,
            template,
            isPublic: isPublic || false,
            tags: tags || [],
        });

        return res.status(201).json({
            success: true,
            message: "Template created successfully",
            template: jobTemplate,
        });
    } catch (error) {
        console.error("Create template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create template",
            error: error.message,
        });
    }
};

// Get company's templates
export const getCompanyTemplates = async (req, res) => {
    try {
        const userId = req.id;
        const { category, search, page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found",
            });
        }

        const query = {
            company: user.companyId,
            isDeleted: false,
        };

        if (category && category !== "all") {
            query.category = category;
        }

        if (search) {
            query.$text = { $search: search };
        }

        const templates = await JobTemplate.find(query)
            .populate("createdBy", "fullname")
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await JobTemplate.countDocuments(query);

        return res.status(200).json({
            success: true,
            templates,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get templates error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch templates",
            error: error.message,
        });
    }
};

// Get public/library templates
export const getPublicTemplates = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 20, sortBy = "popular" } = req.query;

        const query = {
            isPublic: true,
            isDeleted: false,
        };

        if (category && category !== "all") {
            query.category = category;
        }

        if (search) {
            query.$text = { $search: search };
        }

        let sortOption = {};
        if (sortBy === "popular") {
            sortOption = { usageCount: -1 };
        } else if (sortBy === "recent") {
            sortOption = { createdAt: -1 };
        } else {
            sortOption = { name: 1 };
        }

        const templates = await JobTemplate.find(query)
            .populate("company", "name logo")
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await JobTemplate.countDocuments(query);

        // Get category counts
        const categoryCounts = await JobTemplate.aggregate([
            { $match: { isPublic: true, isDeleted: false } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        return res.status(200).json({
            success: true,
            templates,
            categories: categoryCounts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get public templates error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch templates",
            error: error.message,
        });
    }
};

// Get single template
export const getTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;

        const template = await JobTemplate.findById(id)
            .populate("company", "name logo")
            .populate("createdBy", "fullname");

        if (!template || template.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Template not found",
            });
        }

        // Check access: public or owned by user's company
        const user = await User.findById(userId);
        if (!template.isPublic && template.company.toString() !== user?.companyId?.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        return res.status(200).json({
            success: true,
            template,
        });
    } catch (error) {
        console.error("Get template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch template",
            error: error.message,
        });
    }
};

// Update template
export const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;
        const updates = req.body;

        const user = await User.findById(userId);
        const template = await JobTemplate.findById(id);

        if (!template || template.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Template not found",
            });
        }

        // Check ownership
        if (template.company.toString() !== user?.companyId?.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only update your company's templates",
            });
        }

        // Update allowed fields
        const allowedUpdates = ["name", "category", "description", "template", "isPublic", "tags"];
        allowedUpdates.forEach((field) => {
            if (updates[field] !== undefined) {
                template[field] = updates[field];
            }
        });

        await template.save();

        return res.status(200).json({
            success: true,
            message: "Template updated successfully",
            template,
        });
    } catch (error) {
        console.error("Update template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update template",
            error: error.message,
        });
    }
};

// Delete template (soft delete)
export const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;

        const user = await User.findById(userId);
        const template = await JobTemplate.findById(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: "Template not found",
            });
        }

        // Check ownership
        if (template.company.toString() !== user?.companyId?.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your company's templates",
            });
        }

        template.isDeleted = true;
        await template.save();

        return res.status(200).json({
            success: true,
            message: "Template deleted successfully",
        });
    } catch (error) {
        console.error("Delete template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete template",
            error: error.message,
        });
    }
};

// Create job from template
export const createJobFromTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;
        const overrides = req.body; // Allow overriding template values

        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found",
            });
        }

        const template = await JobTemplate.findById(id);
        if (!template || template.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Template not found",
            });
        }

        // Check access
        if (!template.isPublic && template.company.toString() !== user.companyId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        // Create job from template
        const jobData = {
            title: overrides.title || template.template.title,
            description: overrides.description || template.template.description,
            requirements: overrides.requirements || template.template.requirements,
            skills: overrides.skills || template.template.skills,
            benefits: overrides.benefits || template.template.benefits,
            salary: overrides.salary || template.template.salaryRange?.min || 0,
            salaryType: overrides.salaryType || template.template.salaryRange?.type || "monthly",
            jobType: overrides.jobType || template.template.jobType,
            experienceLevel: overrides.experienceLevel ?? template.template.experienceLevel ?? 0,
            educationRequired: overrides.educationRequired || template.template.educationRequired,
            isRemote: overrides.isRemote ?? template.template.isRemote ?? false,
            location: overrides.location || "Remote",
            position: overrides.position || 1,
            company: user.companyId,
            created_by: userId,
            department: overrides.department || template.template.department,
            industry: overrides.industry || template.template.industry,
        };

        const job = await Job.create(jobData);

        // Record template usage
        await template.recordUsage();

        return res.status(201).json({
            success: true,
            message: "Job created from template",
            job,
            templateUsed: template.name,
        });
    } catch (error) {
        console.error("Create job from template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create job from template",
            error: error.message,
        });
    }
};

// Save existing job as template
export const saveJobAsTemplate = async (req, res) => {
    try {
        const { jobId } = req.body;
        const { name, category, isPublic } = req.body;
        const userId = req.id;

        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found",
            });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        // Check ownership
        if (job.company.toString() !== user.companyId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only save your company's jobs as templates",
            });
        }

        const template = await JobTemplate.create({
            company: user.companyId,
            createdBy: userId,
            name: name || `Template from: ${job.title}`,
            category: category || "other",
            isPublic: isPublic || false,
            template: {
                title: job.title,
                description: job.description,
                requirements: job.requirements,
                skills: job.skills,
                benefits: job.benefits,
                salaryRange: {
                    min: job.salary,
                    max: job.salary,
                    type: job.salaryType,
                },
                jobType: job.jobType,
                experienceLevel: job.experienceLevel,
                educationRequired: job.educationRequired,
                isRemote: job.isRemote,
                department: job.department,
                industry: job.industry,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Job saved as template",
            template,
        });
    } catch (error) {
        console.error("Save job as template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to save job as template",
            error: error.message,
        });
    }
};
