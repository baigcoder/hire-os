import { Company } from '../models/company.model.js';
import { User } from '../models/user.model.js';

/**
 * Middleware to check if user has access to a specific feature
 * Based on their company's subscription plan
 */
export const checkFeatureAccess = (requiredFeature) => {
    return async (req, res, next) => {
        try {
            const userId = req.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Students have access to all features during trial
            if (user.role === 'student') {
                if (user.trialExpired || user.subscriptionStatus === 'expired') {
                    return res.status(403).json({
                        success: false,
                        message: 'Your free trial has expired. Please contact support.',
                        expired: true
                    });
                }
                // Active trial students have full access
                return next();
            }

            // For recruiters and company_admin, check company subscription
            if (user.role === 'recruiter' || user.role === 'company_admin') {
                if (!user.companyId) {
                    return res.status(403).json({
                        success: false,
                        message: 'No company associated with your account'
                    });
                }

                const company = await Company.findById(user.companyId);

                if (!company) {
                    return res.status(403).json({
                        success: false,
                        message: 'Company not found'
                    });
                }

                // Check if subscription is active
                if (company.subscription.status === 'expired') {
                    return res.status(403).json({
                        success: false,
                        message: 'Company subscription has expired. Please renew to continue.',
                        expired: true
                    });
                }

                // Check if subscription end date has passed
                if (company.subscription.endDate && new Date() > company.subscription.endDate) {
                    return res.status(403).json({
                        success: false,
                        message: 'Company subscription has expired. Please renew to continue.',
                        expired: true
                    });
                }

                // Check if feature is available in plan
                if (requiredFeature && !company.features[requiredFeature]) {
                    return res.status(403).json({
                        success: false,
                        message: `This feature requires a higher subscription plan. Current plan: ${company.subscription.plan}`,
                        requiredFeature,
                        currentPlan: company.subscription.plan,
                        upgradeRequired: true
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Feature access check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking feature access'
            });
        }
    };
};

/**
 * Check if company can post more jobs
 */
export const checkJobPostingLimit = async (req, res, next) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);

        if (!user || !user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'No company associated with your account'
            });
        }

        const company = await Company.findById(user.companyId);

        if (!company) {
            return res.status(403).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Check subscription status first
        if (company.subscription.status === 'expired') {
            return res.status(403).json({
                success: false,
                message: 'Company subscription has expired',
                expired: true
            });
        }

        // Check job posting limit (-1 means unlimited)
        if (company.features.maxJobPostings !== -1) {
            if (company.usage.activeJobs >= company.features.maxJobPostings) {
                return res.status(403).json({
                    success: false,
                    message: `Job posting limit reached (${company.features.maxJobPostings}). Upgrade your plan for more postings.`,
                    limitReached: true,
                    currentUsage: company.usage.activeJobs,
                    maxAllowed: company.features.maxJobPostings,
                    currentPlan: company.subscription.plan
                });
            }
        }

        // Attach company to request for later use
        req.company = company;
        next();
    } catch (error) {
        console.error('Job posting limit check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking job posting limit'
        });
    }
};

/**
 * Check if company can add more recruiters
 */
export const checkRecruiterLimit = async (req, res, next) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);

        if (!user || !user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'No company associated with your account'
            });
        }

        const company = await Company.findById(user.companyId);

        if (!company) {
            return res.status(403).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Check recruiter limit (-1 means unlimited)
        if (company.features.maxRecruiters !== -1) {
            const activeRecruiters = company.recruiters.filter(
                r => r.status === 'active' || r.status === 'invited'
            ).length;

            if (activeRecruiters >= company.features.maxRecruiters) {
                return res.status(403).json({
                    success: false,
                    message: `Recruiter limit reached (${company.features.maxRecruiters}). Upgrade your plan to add more team members.`,
                    limitReached: true,
                    currentUsage: activeRecruiters,
                    maxAllowed: company.features.maxRecruiters,
                    currentPlan: company.subscription.plan
                });
            }
        }

        req.company = company;
        next();
    } catch (error) {
        console.error('Recruiter limit check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking recruiter limit'
        });
    }
};

/**
 * Validate subscription is active (for any protected route)
 */
export const requireActiveSubscription = async (req, res, next) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check student trial
        if (user.role === 'student') {
            if (user.trialExpired) {
                return res.status(403).json({
                    success: false,
                    message: 'Your free trial has expired',
                    expired: true,
                    trialExpired: true
                });
            }

            if (user.subscriptionStatus === 'expired') {
                return res.status(403).json({
                    success: false,
                    message: 'Your subscription has expired',
                    expired: true
                });
            }
        }

        // Check company subscription for recruiters/admins
        if ((user.role === 'recruiter' || user.role === 'company_admin') && user.companyId) {
            const company = await Company.findById(user.companyId);

            if (company && company.subscription.status === 'expired') {
                return res.status(403).json({
                    success: false,
                    message: 'Company subscription has expired',
                    expired: true,
                    companyExpired: true
                });
            }
        }

        next();
    } catch (error) {
        console.error('Subscription validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating subscription'
        });
    }
};
