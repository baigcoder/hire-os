import Joi from 'joi';

/**
 * Validation Schemas for API Endpoints
 * Provides consistent input validation across the application
 */

// Common field validators
const emailField = Joi.string().email().lowercase().trim().required();
const passwordField = Joi.string().min(8).max(128).required();
const optionalPassword = Joi.string().min(8).max(128);
const phoneField = Joi.string().pattern(/^[+]?[\d\s-]{10,15}$/);
const objectIdField = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

// ========== AUTH SCHEMAS ==========

export const registerSchema = Joi.object({
    fullname: Joi.string().min(2).max(100).trim().required()
        .messages({ 'string.min': 'Name must be at least 2 characters' }),
    email: emailField,
    phoneNumber: phoneField.required(),
    password: passwordField
        .messages({ 'string.min': 'Password must be at least 8 characters' }),
    role: Joi.string().valid('student', 'recruiter', 'company_admin').required()
});

export const loginSchema = Joi.object({
    email: emailField,
    password: Joi.string().required(),
    role: Joi.string().valid('student', 'recruiter', 'company_admin').required()
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordField
        .invalid(Joi.ref('currentPassword'))
        .messages({
            'any.invalid': 'New password must be different from current password',
            'string.min': 'New password must be at least 8 characters'
        })
});

export const forgotPasswordSchema = Joi.object({
    email: emailField
});

export const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    password: passwordField
});

// ========== USER SCHEMAS ==========

export const updateProfileSchema = Joi.object({
    fullname: Joi.string().min(2).max(100).trim(),
    email: Joi.string().email().lowercase().trim(),
    phoneNumber: phoneField,
    bio: Joi.string().max(500),
    skills: Joi.string() // Comma-separated string
}).min(1);

// ========== JOB SCHEMAS ==========

export const createJobSchema = Joi.object({
    title: Joi.string().min(3).max(100).trim().required(),
    description: Joi.string().min(50).required(),
    requirements: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ).required(),
    salary: Joi.number().min(0).required(),
    location: Joi.string().trim().required(),
    jobType: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Remote').required(),
    experience: Joi.number().min(0).max(50).default(0),
    position: Joi.number().min(1).required(),
    companyId: objectIdField.required(),
    skills: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    benefits: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    deadline: Joi.date().greater('now'),
    isRemote: Joi.boolean().default(false)
});

export const updateJobSchema = Joi.object({
    title: Joi.string().min(3).max(100).trim(),
    description: Joi.string().min(50),
    requirements: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    salary: Joi.number().min(0),
    location: Joi.string().trim(),
    jobType: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Remote'),
    experience: Joi.number().min(0).max(50),
    position: Joi.number().min(1),
    skills: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    benefits: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    deadline: Joi.date(),
    isRemote: Joi.boolean(),
    isActive: Joi.boolean()
}).min(1);

export const jobQuerySchema = Joi.object({
    keyword: Joi.string().max(100),
    location: Joi.string().max(100),
    jobType: Joi.string(),
    salary_min: Joi.number().min(0),
    salary_max: Joi.number().min(0),
    experience: Joi.number().min(0),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sort: Joi.string().valid('createdAt', 'salary', 'views').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    isRemote: Joi.boolean()
});

// ========== APPLICATION SCHEMAS ==========

export const updateApplicationStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'reviewed', 'interview', 'accepted', 'rejected').required()
});

// ========== COMPANY SCHEMAS ==========

export const registerCompanySchema = Joi.object({
    companyName: Joi.string().min(2).max(100).trim().required(),
    email: Joi.string().email().lowercase().trim(),
    phone: phoneField,
    description: Joi.string().max(2000),
    website: Joi.string().uri(),
    location: Joi.string().max(200),
    industry: Joi.string().max(100),
    companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
    adminName: Joi.string().min(2).max(100).trim(),
    adminEmail: emailField,
    adminPassword: passwordField,
    adminPhone: phoneField,
    planId: Joi.string().valid('basic', 'pro', 'enterprise').default('basic'),
    billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly').default('monthly'),
    paymentToken: Joi.string(),
    recruitersToInvite: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            phone: phoneField,
            jobTitle: Joi.string()
        })
    )
});

export const inviteRecruiterSchema = Joi.object({
    email: emailField,
    name: Joi.string().min(2).max(100).trim(),
    permissions: Joi.array().items(
        Joi.string().valid('post_jobs', 'view_applications', 'schedule_interviews', 'send_offers')
    )
});

// ========== INTERVIEW SCHEMAS ==========

export const createInterviewSchema = Joi.object({
    applicationId: objectIdField.required(),
    type: Joi.string().valid('mcq', 'video', 'phone', 'in-person').required(),
    scheduledAt: Joi.date().greater('now').required(),
    duration: Joi.number().min(15).max(480).default(60),
    notes: Joi.string().max(1000),
    mcqSettings: Joi.object({
        totalQuestions: Joi.number().min(5).max(50).default(10),
        timeLimit: Joi.number().min(5).max(120).default(30),
        passingScore: Joi.number().min(0).max(100).default(60)
    })
});

export const rescheduleInterviewSchema = Joi.object({
    scheduledAt: Joi.date().greater('now').required(),
    reason: Joi.string().max(500)
});

// ========== NOTIFICATION SCHEMAS ==========

export const updateNotificationPrefsSchema = Joi.object({
    email: Joi.boolean(),
    jobAlerts: Joi.boolean(),
    applicationUpdates: Joi.boolean(),
    interviewReminders: Joi.boolean()
}).min(1);

// ========== COMMON SCHEMAS ==========

export const paginationSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10)
});

export const objectIdParamSchema = Joi.object({
    id: objectIdField.required()
});

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
export const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/['"]/g, '')
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                errors
            });
        }

        // Replace request property with validated/sanitized value
        req[property] = value;
        next();
    };
};

export default {
    validate,
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    createJobSchema,
    updateJobSchema,
    jobQuerySchema,
    updateApplicationStatusSchema,
    registerCompanySchema,
    inviteRecruiterSchema,
    createInterviewSchema,
    rescheduleInterviewSchema,
    updateNotificationPrefsSchema,
    paginationSchema,
    objectIdParamSchema
};
