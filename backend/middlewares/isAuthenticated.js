import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
  try {
    // Check for token in cookies first, then Bearer token in header
    let token = req.cookies.token;

    // Also check Authorization header for Bearer token
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication required. Please login.",
        success: false,
        code: "NO_TOKEN",
      });
    }

    try {
      const decode = jwt.verify(token, process.env.SECRET_KEY);
      if (!decode || !decode.userId) {
        return res.status(401).json({
          message: "Invalid token. Please login again.",
          success: false,
          code: "INVALID_TOKEN",
        });
      }
      req.id = decode.userId;
      req.tokenExp = decode.exp;
      next();
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Session expired. Please login again.",
          success: false,
          code: "TOKEN_EXPIRED",
        });
      }
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          message: "Invalid token. Please login again.",
          success: false,
          code: "INVALID_TOKEN",
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      message: "Authentication failed. Please try again.",
      success: false,
      code: "AUTH_ERROR",
    });
  }
};

// Middleware to check if user is a recruiter (includes company_admin)
export const isRecruiter = async (req, res, next) => {
  try {
    const { User } = await import("../models/user.model.js");
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Allow both recruiters and company_admins
    if (!["recruiter", "company_admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Access denied. Recruiter privileges required.",
        success: false,
        code: "FORBIDDEN",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Role check error:", error);
    return res.status(500).json({
      message: "Authorization check failed",
      success: false,
    });
  }
};

// Middleware to check if user is a company admin
export const isCompanyAdmin = async (req, res, next) => {
  try {
    const { User } = await import("../models/user.model.js");
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.role !== "company_admin") {
      return res.status(403).json({
        message: "Access denied. Company admin privileges required.",
        success: false,
        code: "FORBIDDEN",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Role check error:", error);
    return res.status(500).json({
      message: "Authorization check failed",
      success: false,
    });
  }
};

// Middleware to check if user is a super admin
export const isSuperAdmin = async (req, res, next) => {
  try {
    const { User } = await import("../models/user.model.js");
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.role !== "super_admin") {
      return res.status(403).json({
        message: "Access denied. Super admin privileges required.",
        success: false,
        code: "FORBIDDEN",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Role check error:", error);
    return res.status(500).json({
      message: "Authorization check failed",
      success: false,
    });
  }
};

// Middleware to check if user is a student
export const isStudent = async (req, res, next) => {
  try {
    const { User } = await import("../models/user.model.js");
    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Student privileges required.",
        success: false,
        code: "FORBIDDEN",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Role check error:", error);
    return res.status(500).json({
      message: "Authorization check failed",
      success: false,
    });
  }
};

// Middleware to check company feature access
export const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const { User } = await import("../models/user.model.js");
      const { Company } = await import("../models/company.model.js");

      const user = await User.findById(req.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          success: false,
        });
      }

      // Students don't need feature checks
      if (user.role === "student") {
        req.user = user;
        return next();
      }

      // Super admins have all features
      if (user.role === "super_admin") {
        req.user = user;
        return next();
      }

      // Check company features for recruiters and company admins
      if (!user.companyId) {
        return res.status(403).json({
          message:
            "You must be associated with a company to access this feature",
          success: false,
        });
      }

      const company = await Company.findById(user.companyId);

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
          success: false,
        });
      }

      // Check if subscription is active
      if (!company.isSubscriptionActive) {
        return res.status(403).json({
          message:
            "Your company's subscription has expired. Please renew to access this feature.",
          success: false,
          code: "SUBSCRIPTION_EXPIRED",
          upgradeRequired: true,
        });
      }

      // Check if feature is available
      if (!company.hasFeature(featureName)) {
        return res.status(403).json({
          message: `This feature (${featureName}) is not available in your current plan. Please upgrade.`,
          success: false,
          code: "FEATURE_NOT_AVAILABLE",
          upgradeRequired: true,
          currentPlan: company.subscription.plan,
        });
      }

      req.user = user;
      req.company = company;
      next();
    } catch (error) {
      console.error("Feature access check error:", error);
      return res.status(500).json({
        message: "Feature access check failed",
        success: false,
      });
    }
  };
};

// Middleware to check usage limits (e.g., job posting limit)
export const checkUsageLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const { User } = await import("../models/user.model.js");
      const { Company } = await import("../models/company.model.js");

      const user = await User.findById(req.id);

      if (!user || !user.companyId) {
        return res.status(403).json({
          message: "Company association required",
          success: false,
        });
      }

      const company = await Company.findById(user.companyId);

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
          success: false,
        });
      }

      switch (limitType) {
        case "jobPosting":
          if (!company.canPostJob()) {
            return res.status(403).json({
              message: `You've reached your job posting limit (${company.features.maxJobPostings}). Please upgrade your plan.`,
              success: false,
              code: "LIMIT_REACHED",
              upgradeRequired: true,
              currentUsage: company.usage.activeJobs,
              limit: company.features.maxJobPostings,
            });
          }
          break;
        case "recruiter":
          if (!company.canAddRecruiter()) {
            return res.status(403).json({
              message: `You've reached your recruiter limit (${company.features.maxRecruiters}). Please upgrade your plan.`,
              success: false,
              code: "LIMIT_REACHED",
              upgradeRequired: true,
              limit: company.features.maxRecruiters,
            });
          }
          break;
      }

      req.user = user;
      req.company = company;
      next();
    } catch (error) {
      console.error("Usage limit check error:", error);
      return res.status(500).json({
        message: "Usage limit check failed",
        success: false,
      });
    }
  };
};

// Rate limiting middleware (simple in-memory implementation)
const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

export const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }

  const record = requestCounts.get(ip);

  if (now - record.startTime > WINDOW_MS) {
    // Reset window
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      message: "Too many requests. Please try again later.",
      success: false,
      code: "RATE_LIMITED",
    });
  }

  record.count++;
  next();
};

// Middleware to load user and company data
export const loadUserContext = async (req, res, next) => {
  try {
    if (!req.id) {
      return next();
    }

    const { User } = await import("../models/user.model.js");
    const user = await User.findById(req.id).select("-password");

    if (user) {
      req.user = user;

      if (user.companyId) {
        const { Company } = await import("../models/company.model.js");
        const company = await Company.findById(user.companyId);
        req.company = company;
      }
    }

    next();
  } catch (error) {
    console.error("Load user context error:", error);
    next();
  }
};

export default isAuthenticated;
