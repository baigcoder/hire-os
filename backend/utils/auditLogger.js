/**
 * Audit Logger Utility
 * Centralized logging for admin and security-critical actions
 */

import AuditLog from '../models/auditLog.model.js';

/**
 * Create an audit log entry
 * @param {Object} params - Log parameters
 * @returns {Promise<Object>} Created audit log
 */
export const logAction = async ({
    userId,
    userEmail,
    userRole,
    action,
    targetType,
    targetId = null,
    targetName = null,
    details = {},
    previousValue = null,
    newValue = null,
    status = 'success',
    errorMessage = null,
    req = null // Express request object for context
}) => {
    try {
        const logEntry = {
            userId,
            userEmail,
            userRole,
            action,
            targetType,
            targetId,
            targetName,
            details,
            previousValue,
            newValue,
            status,
            errorMessage,
            timestamp: new Date()
        };

        // Extract request context if available
        if (req) {
            logEntry.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
            logEntry.userAgent = req.headers['user-agent'];
            logEntry.requestPath = req.originalUrl || req.path;
            logEntry.requestMethod = req.method;
        }

        const auditLog = await AuditLog.create(logEntry);

        // Log to console for debugging (can be removed in production)
        console.log(`📝 Audit: ${action} by ${userEmail} on ${targetType}${targetId ? ':' + targetId : ''}`);

        return auditLog;
    } catch (error) {
        // Don't fail the main operation if audit logging fails
        console.error('Audit log error:', error.message);
        return null;
    }
};

/**
 * Audit middleware - attaches audit helper to request
 */
export const auditMiddleware = (req, res, next) => {
    // Attach audit helper to request
    req.audit = async (action, targetType, options = {}) => {
        if (!req.user) return null;

        return logAction({
            userId: req.user._id || req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action,
            targetType,
            req,
            ...options
        });
    };

    next();
};

/**
 * Pre-built audit loggers for common actions
 */
export const auditActions = {
    // Auth
    login: (user, req, success = true) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: success ? 'LOGIN' : 'LOGIN_FAILED',
        targetType: 'User',
        targetId: user._id || user.id,
        status: success ? 'success' : 'failure',
        req
    }),

    logout: (user, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGOUT',
        targetType: 'User',
        targetId: user._id || user.id,
        req
    }),

    passwordChange: (user, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'PASSWORD_CHANGE',
        targetType: 'User',
        targetId: user._id || user.id,
        req
    }),

    // Job actions
    jobCreate: (user, job, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'JOB_CREATE',
        targetType: 'Job',
        targetId: job._id,
        targetName: job.title,
        details: { company: job.company?.name },
        req
    }),

    jobUpdate: (user, job, previousValue, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'JOB_UPDATE',
        targetType: 'Job',
        targetId: job._id,
        targetName: job.title,
        previousValue,
        newValue: job.toObject ? job.toObject() : job,
        req
    }),

    jobDelete: (user, jobId, jobTitle, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'JOB_DELETE',
        targetType: 'Job',
        targetId: jobId,
        targetName: jobTitle,
        req
    }),

    // Application actions
    applicationApprove: (user, application, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'APPLICATION_APPROVE',
        targetType: 'Application',
        targetId: application._id,
        targetName: application.applicant?.fullname,
        details: { jobTitle: application.job?.title },
        req
    }),

    applicationReject: (user, application, reason, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'APPLICATION_REJECT',
        targetType: 'Application',
        targetId: application._id,
        targetName: application.applicant?.fullname,
        details: { jobTitle: application.job?.title, reason },
        req
    }),

    // Interview actions
    interviewSchedule: (user, interview, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'INTERVIEW_SCHEDULE',
        targetType: 'Interview',
        targetId: interview._id,
        details: {
            candidateName: interview.candidateName,
            jobTitle: interview.jobTitle,
            scheduledDate: interview.scheduledDate
        },
        req
    }),

    offerSend: (user, applicant, jobTitle, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'OFFER_SEND',
        targetType: 'Application',
        targetName: applicant?.fullname,
        details: { jobTitle },
        req
    }),

    // Admin actions
    settingsUpdate: (user, settingName, previousValue, newValue, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'SETTINGS_UPDATE',
        targetType: 'System',
        targetName: settingName,
        previousValue,
        newValue,
        req
    }),

    subscriptionChange: (user, company, previousPlan, newPlan, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'SUBSCRIPTION_CHANGE',
        targetType: 'Subscription',
        targetId: company._id,
        targetName: company.name,
        previousValue: { plan: previousPlan },
        newValue: { plan: newPlan },
        req
    }),

    // AI actions
    aiReportGenerate: (user, reportType, targetId, req) => logAction({
        userId: user._id || user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'AI_REPORT_GENERATE',
        targetType: 'Other',
        targetId,
        details: { reportType },
        req
    })
};

/**
 * Get audit logs with filtering
 */
export const getAuditLogs = async (filters = {}, options = {}) => {
    const {
        userId,
        action,
        targetType,
        startDate,
        endDate,
        status
    } = filters;

    const {
        page = 1,
        limit = 50,
        sort = '-timestamp'
    } = options;

    const query = {};

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (status) query.status = status;
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'fullname email')
        .lean();

    const total = await AuditLog.countDocuments(query);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

export default {
    logAction,
    auditMiddleware,
    auditActions,
    getAuditLogs
};
