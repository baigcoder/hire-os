import { Company, SUBSCRIPTION_PLANS } from "../models/company.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendRecruiterInvitation, sendPaymentInvoice } from "../utils/email.js";

// Token generation helper
const generateToken = (userId, expiresIn = "7d") => {
  return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn });
};

// Generate secure random password (alphanumeric only to avoid email copy-paste issues)
const generateSecurePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Register company with subscription plan
export const registerCompany = async (req, res) => {
  try {
    const {
      // Company details
      companyName,
      email,
      phone,
      description,
      website,
      location,
      industry,
      companySize,
      // Admin user details
      adminName,
      adminEmail,
      adminPassword,
      adminPhone,
      // Subscription details
      planId,
      billingCycle,
      paymentToken,
      // Recruiters to invite
      recruitersToInvite,
    } = req.body;

    // Debug logging
    console.log("📝 Register Company Request:", {
      companyName,
      adminEmail,
      hasPassword: !!adminPassword,
      planId,
      billingCycle,
      paymentToken: paymentToken?.substring(0, 10) + "...",
      recruitersCount: recruitersToInvite?.length || 0,
    });

    // Validate required fields - only company name and admin email are truly required
    // Admin password is optional if admin already exists from signup flow
    if (!companyName || !adminEmail) {
      console.log("❌ Validation failed - missing required fields");
      return res.status(400).json({
        message: "Company name and admin email are required.",
        success: false,
      });
    }

    // Check if company exists
    let existingCompany = await Company.findOne({ name: companyName });
    if (existingCompany) {
      // Check if this is the same admin trying to re-register (idempotent behavior)
      const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
      if (existingAdmin && existingCompany.adminUser?.toString() === existingAdmin._id.toString()) {
        // This is the same admin - return success with existing data (idempotent behavior)
        console.log("ℹ️ Idempotent registration - company already exists for this admin");

        // Ensure user has companyId set
        if (!existingAdmin.companyId) {
          existingAdmin.companyId = existingCompany._id;
          await existingAdmin.save();
        }

        const token = generateToken(existingAdmin._id);
        return res.status(200).json({
          message: "Company already registered!",
          company: {
            _id: existingCompany._id,
            name: existingCompany.name,
            email: existingCompany.email,
            subscription: existingCompany.subscription,
          },
          user: {
            _id: existingAdmin._id,
            fullname: existingAdmin.fullname,
            email: existingAdmin.email,
            role: existingAdmin.role,
            companyId: existingCompany._id,
            subscriptionStatus: existingAdmin.subscriptionStatus || existingCompany.subscription.status, // Include for dashboard access
          },
          invitedRecruiters: [],
          token,
          success: true,
          isExisting: true,
        });
      }

      return res.status(400).json({
        message: "A company with this name already exists.",
        success: false,
      });
    }

    // Check if admin already exists (from signup flow)
    let adminUser = await User.findOne({ email: adminEmail.toLowerCase() });

    if (adminUser) {
      // Admin already exists from signup - use their existing account
      console.log("✅ Using existing admin user from signup:", adminUser.email);

      // Verify they are a company_admin
      if (adminUser.role !== "company_admin") {
        return res.status(400).json({
          message:
            "This email is registered with a different role. Please use a company admin account.",
          success: false,
        });
      }

      // Check if they already have a company
      if (adminUser.companyId) {
        return res.status(400).json({
          message: "This admin is already associated with a company.",
          success: false,
        });
      }
    } else {
      // New admin - require password (legacy flow)
      if (!adminPassword) {
        return res.status(400).json({
          message: "Admin password is required for new accounts.",
          success: false,
        });
      }

      // Create company admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      adminUser = await User.create({
        fullname: adminName || companyName + " Admin",
        email: adminEmail.toLowerCase().trim(),
        phoneNumber: adminPhone,
        password: hashedPassword,
        role: "company_admin",
        isEmailVerified: true, // Assuming email verified via payment/registration flow
      });
      console.log("✅ Created new admin user:", adminUser.email);
    }

    // Get plan details
    const selectedPlan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.basic;
    const subscriptionEndDate = new Date();
    if (billingCycle === "yearly") {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    } else {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }

    // Create company
    const company = await Company.create({
      name: companyName,
      email: email?.toLowerCase().trim() || adminEmail.toLowerCase().trim(),
      phone,
      description,
      website,
      location,
      industry,
      companySize,
      adminUser: adminUser._id,
      userId: adminUser._id, // Legacy support
      subscription: {
        plan: planId || "basic",
        type: billingCycle || "monthly",
        status: paymentToken ? "active" : "pending",
        startDate: new Date(),
        endDate: subscriptionEndDate,
        nextPaymentDate: subscriptionEndDate,
      },
      features: selectedPlan.features,
      payments: paymentToken
        ? [
          {
            transactionId: paymentToken,
            amount:
              selectedPlan.prices?.[billingCycle] ||
              selectedPlan.prices?.monthly ||
              5000,
            currency: "PKR",
            plan: planId || "basic",
            duration: billingCycle || "monthly",
            paymentDate: new Date(),
            paymentMethod: "safepay",
            status: "completed",
          },
        ]
        : [],
    });

    // Update admin user with company reference and subscription status
    adminUser.companyId = company._id;
    // Set subscriptionStatus based on payment - CRITICAL for dashboard access
    adminUser.subscriptionStatus = paymentToken ? "active" : "pending";
    await adminUser.save();

    // Track invited recruiters
    const invitedRecruiters = [];
    const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;

    // Process recruiters to invite
    if (
      recruitersToInvite &&
      Array.isArray(recruitersToInvite) &&
      recruitersToInvite.length > 0
    ) {
      for (const recruiter of recruitersToInvite) {
        if (!recruiter.email || !recruiter.name) continue;

        // Check if email already exists
        const existingRecruiter = await User.findOne({
          email: recruiter.email.toLowerCase(),
        });
        if (existingRecruiter) {
          console.log(`Recruiter email already exists: ${recruiter.email}`);
          continue;
        }

        // Generate password for recruiter
        const recruiterPassword = generateSecurePassword();
        console.log(
          "📝 Generated password for recruiter:",
          recruiter.email,
          "=",
          recruiterPassword,
        );

        const hashedRecruiterPassword = await bcrypt.hash(
          recruiterPassword,
          12,
        );
        console.log(
          "🔐 Hashed password length:",
          hashedRecruiterPassword.length,
        );

        // Create recruiter user
        const recruiterUser = await User.create({
          fullname: recruiter.name,
          email: recruiter.email.toLowerCase().trim(),
          phoneNumber: recruiter.phone || undefined, // Don't set if empty
          password: hashedRecruiterPassword,
          role: "recruiter",
          companyId: company._id,
          isEmailVerified: true,
          mustChangePassword: true, // Recruiter must change password on first login
          invitation: {
            invitedBy: adminUser._id,
            invitedAt: new Date(),
            status: "accepted",
            acceptedAt: new Date(),
          },
        });

        console.log("✅ Recruiter user created:", {
          id: recruiterUser._id,
          email: recruiterUser.email,
          hasPassword: !!recruiterUser.password,
          passwordLength: recruiterUser.password?.length,
        });

        // Add to company recruiters list
        company.recruiters.push({
          userId: recruiterUser._id,
          email: recruiter.email.toLowerCase().trim(),
          name: recruiter.name,
          role: recruiter.jobTitle || "Recruiter",
          status: "active",
          joinedAt: new Date(),
        });

        // Send invitation email with credentials
        try {
          await sendRecruiterInvitation(
            recruiter.email,
            recruiter.name,
            companyName,
            recruiterPassword,
            loginUrl,
          );
          console.log(`✅ Invitation sent to ${recruiter.email}`);
        } catch (emailError) {
          console.error(
            `❌ Failed to send invitation to ${recruiter.email}:`,
            emailError,
          );
        }

        invitedRecruiters.push({
          name: recruiter.name,
          email: recruiter.email,
          jobTitle: recruiter.jobTitle,
        });
      }

      // Update recruiter count and save
      company.recruiterCount = company.recruiters.length + 1; // +1 for admin
      await company.save();
    }

    // Send payment invoice to admin
    if (paymentToken) {
      try {
        await sendPaymentInvoice(
          adminEmail,
          adminName || companyName + " Admin",
          {
            companyName: companyName,
            planName: selectedPlan.name || planId,
            amount:
              selectedPlan.prices?.[billingCycle] ||
              selectedPlan.prices?.monthly ||
              5000,
            transactionId: paymentToken,
            paymentDate: new Date(),
            billingCycle: billingCycle || "monthly",
            validUntil: subscriptionEndDate,
          },
        );
        console.log(`✅ Payment invoice sent to ${adminEmail}`);
      } catch (emailError) {
        console.error(
          `❌ Failed to send invoice to ${adminEmail}:`,
          emailError,
        );
      }
    }

    // Generate token for auto-login
    const token = generateToken(adminUser._id);

    return res.status(201).json({
      message: "Company registered successfully!",
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        subscription: company.subscription,
      },
      user: {
        _id: adminUser._id,
        fullname: adminUser.fullname,
        email: adminUser.email,
        role: adminUser.role,
        companyId: company._id,
        subscriptionStatus: adminUser.subscriptionStatus, // CRITICAL for dashboard access
      },
      invitedRecruiters,
      token,
      success: true,
    });
  } catch (error) {
    console.error("Register company error:", error);
    return res.status(500).json({
      message: "Server error occurred during registration",
      success: false,
    });
  }
};

// Get companies for logged in user
export const getCompany = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
        success: false,
      });
    }

    let companies = [];

    // Search based on user role
    if (user.role === "company_admin") {
      // Company admin - find by adminUser field
      companies = await Company.find({ adminUser: userId });
    } else if (user.role === "recruiter") {
      // Recruiter - find by companyId on user or in recruiters array
      if (user.companyId) {
        companies = await Company.find({ _id: user.companyId });
      } else {
        // Also check if user is in recruiters array
        companies = await Company.find({ "recruiters.userId": userId });
      }
    }

    // Fallback searches if no companies found
    if (companies.length === 0) {
      // Try finding by userId field (legacy)
      companies = await Company.find({ userId });
    }

    if (companies.length === 0) {
      // Try finding by adminUser with current userId
      companies = await Company.find({ adminUser: userId });
    }

    if (companies.length === 0) {
      // Try finding where user is a recruiter
      companies = await Company.find({ "recruiters.userId": userId });
    }

    // If still no companies and user has companyId, try that
    if (companies.length === 0 && user.companyId) {
      companies = await Company.find({ _id: user.companyId });
    }

    // Log for debugging
    console.log(
      `[getCompany] User ${userId} (${user.role}) - Found ${companies.length} companies`,
    );

    return res.status(200).json({
      companies,
      success: true,
    });
  } catch (error) {
    console.error("Get company error:", error);
    return res.status(500).json({
      message: "Error fetching companies",
      success: false,
    });
  }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await Company.findById(companyId)
      .populate("adminUser", "fullname email")
      .populate("recruiters.userId", "fullname email profile.profilePhoto");

    if (!company) {
      return res.status(404).json({
        message: "Company not found.",
        success: false,
      });
    }

    return res.status(200).json({
      company,
      success: true,
    });
  } catch (error) {
    console.error("Get company by ID error:", error);
    return res.status(500).json({
      message: "Error fetching company",
      success: false,
    });
  }
};

// Update company
export const updateCompany = async (req, res) => {
  try {
    const {
      name,
      description,
      website,
      location,
      phone,
      industry,
      companySize,
    } = req.body;
    const companyId = req.params.id;

    let logo;
    if (req.file) {
      const fileUri = getDataUri(req.file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
        folder: "jobportal/companies",
      });
      logo = cloudResponse.secure_url;
    }

    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(website && { website }),
      ...(location && { location }),
      ...(phone && { phone }),
      ...(industry && { industry }),
      ...(companySize && { companySize }),
      ...(logo && { logo }),
    };

    const company = await Company.findByIdAndUpdate(companyId, updateData, {
      new: true,
    });

    if (!company) {
      return res.status(404).json({
        message: "Company not found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Company information updated.",
      company,
      success: true,
    });
  } catch (error) {
    console.error("Update company error:", error);
    return res.status(500).json({
      message: "Server error occurred",
      success: false,
    });
  }
};

// ========== RECRUITER MANAGEMENT ==========

// Invite recruiter to company
export const inviteRecruiter = async (req, res) => {
  try {
    const { email, name, permissions } = req.body;
    const adminId = req.id;

    if (!email) {
      return res.status(400).json({
        message: "Recruiter email is required",
        success: false,
      });
    }

    // Get admin's company
    const admin = await User.findById(adminId);
    const company = await Company.findOne({ adminUser: adminId });

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    // Check if can add more recruiters
    if (!company.canAddRecruiter()) {
      return res.status(403).json({
        message: `Recruiter limit reached (${company.features.maxRecruiters}). Please upgrade your plan.`,
        success: false,
        upgradeRequired: true,
      });
    }

    // Check if recruiter already exists
    const existingRecruiter = company.recruiters.find(
      (r) =>
        r.email.toLowerCase() === email.toLowerCase() && r.status !== "removed",
    );

    if (existingRecruiter) {
      return res.status(400).json({
        message: "This email has already been invited",
        success: false,
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Add to company recruiters
    company.recruiters.push({
      email: email.toLowerCase().trim(),
      name: name || "",
      status: "invited",
      invitationToken,
      invitationExpiresAt: expiresAt,
      invitedAt: new Date(),
      permissions: permissions || [
        "post_jobs",
        "view_applications",
        "schedule_interviews",
      ],
    });

    await company.save();

    // TODO: Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/recruiter/accept-invite?token=${invitationToken}&company=${company._id}`;

    console.log(`📧 Recruiter Invitation Link for ${email}: ${inviteLink}`);

    return res.status(200).json({
      message: `Invitation sent to ${email}`,
      success: true,
      inviteLink:
        process.env.NODE_ENV === "development" ? inviteLink : undefined,
    });
  } catch (error) {
    console.error("Invite recruiter error:", error);
    return res.status(500).json({
      message: "Error sending invitation",
      success: false,
    });
  }
};

// Accept recruiter invitation
export const acceptRecruiterInvitation = async (req, res) => {
  try {
    const { token, companyId, fullname, password, phone } = req.body;

    if (!token || !companyId || !password) {
      return res.status(400).json({
        message: "Token, company ID, and password are required",
        success: false,
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    // Find the invitation
    const recruiterIndex = company.recruiters.findIndex(
      (r) => r.invitationToken === token && r.status === "invited",
    );

    if (recruiterIndex === -1) {
      return res.status(400).json({
        message: "Invalid or expired invitation",
        success: false,
      });
    }

    const recruiterInvite = company.recruiters[recruiterIndex];

    // Check expiry
    if (new Date() > recruiterInvite.invitationExpiresAt) {
      return res.status(400).json({
        message: "Invitation has expired. Please request a new one.",
        success: false,
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: recruiterInvite.email });

    if (user) {
      // Update existing user
      user.role = "recruiter";
      user.companyId = company._id;
      user.invitation = {
        status: "accepted",
        acceptedAt: new Date(),
      };
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await User.create({
        fullname:
          fullname ||
          recruiterInvite.name ||
          recruiterInvite.email.split("@")[0],
        email: recruiterInvite.email,
        phoneNumber: phone,
        password: hashedPassword,
        role: "recruiter",
        companyId: company._id,
        isEmailVerified: true,
        permissions: recruiterInvite.permissions,
        recruiterProfile: {
          canPostJobs: recruiterInvite.permissions.includes("post_jobs"),
          canManageApplications:
            recruiterInvite.permissions.includes("view_applications"),
          canScheduleInterviews: recruiterInvite.permissions.includes(
            "schedule_interviews",
          ),
        },
        invitation: {
          status: "accepted",
          invitedBy: company.adminUser,
          acceptedAt: new Date(),
        },
      });
    }

    // Update company recruiter record
    company.recruiters[recruiterIndex].userId = user._id;
    company.recruiters[recruiterIndex].status = "active";
    company.recruiters[recruiterIndex].joinedAt = new Date();
    company.recruiters[recruiterIndex].invitationToken = undefined;

    await company.save();

    // Notify company admin
    await Notification.createNotification({
      userId: company.adminUser,
      type: "recruiter_joined",
      title: "New Recruiter Joined!",
      message: `${user.fullname} has joined your team as a recruiter.`,
      relatedEntities: { companyId: company._id },
    });

    // Generate token for auto-login
    const authToken = generateToken(user._id);

    return res.status(200).json({
      message: `Welcome to ${company.name}! You are now a recruiter.`,
      success: true,
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
      },
      company: {
        _id: company._id,
        name: company.name,
        subscription: company.subscription,
      },
      token: authToken,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return res.status(500).json({
      message: "Error accepting invitation",
      success: false,
    });
  }
};

// Get company recruiters
export const getRecruiters = async (req, res) => {
  try {
    const adminId = req.id;

    const company = await Company.findOne({ adminUser: adminId }).populate(
      "recruiters.userId",
      "fullname email profile.profilePhoto lastLogin",
    );

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    const recruiters = company.recruiters.filter((r) => r.status !== "removed");

    return res.status(200).json({
      success: true,
      recruiters,
      total: recruiters.length,
      limit: company.features.maxRecruiters,
    });
  } catch (error) {
    console.error("Get recruiters error:", error);
    return res.status(500).json({
      message: "Error fetching recruiters",
      success: false,
    });
  }
};

// Update recruiter permissions
export const updateRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const { permissions, status } = req.body;
    const adminId = req.id;

    const company = await Company.findOne({ adminUser: adminId });
    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    const recruiterIndex = company.recruiters.findIndex(
      (r) =>
        r._id.toString() === recruiterId ||
        r.userId?.toString() === recruiterId,
    );

    if (recruiterIndex === -1) {
      return res.status(404).json({
        message: "Recruiter not found",
        success: false,
      });
    }

    if (permissions) {
      company.recruiters[recruiterIndex].permissions = permissions;
    }

    if (status) {
      company.recruiters[recruiterIndex].status = status;
    }

    await company.save();

    // Update user permissions if exists
    const recruiterId2 = company.recruiters[recruiterIndex].userId;
    if (recruiterId2 && permissions) {
      await User.findByIdAndUpdate(recruiterId2, {
        permissions,
        "recruiterProfile.canPostJobs": permissions.includes("post_jobs"),
        "recruiterProfile.canManageApplications":
          permissions.includes("view_applications"),
        "recruiterProfile.canScheduleInterviews": permissions.includes(
          "schedule_interviews",
        ),
        "recruiterProfile.canSendOffers": permissions.includes("send_offers"),
      });
    }

    return res.status(200).json({
      message: "Recruiter updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Update recruiter error:", error);
    return res.status(500).json({
      message: "Error updating recruiter",
      success: false,
    });
  }
};

// Remove recruiter from company
export const removeRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const adminId = req.id;

    const company = await Company.findOne({ adminUser: adminId });
    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    const recruiterIndex = company.recruiters.findIndex(
      (r) =>
        r._id.toString() === recruiterId ||
        r.userId?.toString() === recruiterId,
    );

    if (recruiterIndex === -1) {
      return res.status(404).json({
        message: "Recruiter not found",
        success: false,
      });
    }

    const recruiter = company.recruiters[recruiterIndex];
    company.recruiters[recruiterIndex].status = "removed";

    await company.save();

    // Update user role if exists
    if (recruiter.userId) {
      await User.findByIdAndUpdate(recruiter.userId, {
        role: "student", // Demote to student
        companyId: null,
        permissions: [],
      });

      // Notify recruiter
      await Notification.createNotification({
        userId: recruiter.userId,
        type: "recruiter_removed",
        title: "Removed from Company",
        message: `You have been removed from ${company.name}.`,
        relatedEntities: { companyId: company._id },
      });
    }

    return res.status(200).json({
      message: "Recruiter removed successfully",
      success: true,
    });
  } catch (error) {
    console.error("Remove recruiter error:", error);
    return res.status(500).json({
      message: "Error removing recruiter",
      success: false,
    });
  }
};

// Get company dashboard data
export const getCompanyDashboard = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else if (user.companyId) {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    // Calculate real growth metrics
    const { Application } = await import("../models/application.model.js");
    const { Job } = await import("../models/job.model.js");
    const { Interview } = await import("../models/interview.model.js");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get company jobs
    const companyJobs = await Job.find({ company: company._id }).select("_id");
    const jobIds = companyJobs.map((j) => j._id);

    // Calculate application growth
    const appsThisMonth = await Application.countDocuments({
      job: { $in: jobIds },
      createdAt: { $gte: startOfMonth },
    });

    const appsLastMonth = await Application.countDocuments({
      job: { $in: jobIds },
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });

    const applicationGrowth =
      appsLastMonth > 0
        ? Math.round(((appsThisMonth - appsLastMonth) / appsLastMonth) * 100)
        : appsThisMonth > 0
          ? 100
          : 0;

    // Calculate total applications
    const totalApplications = await Application.countDocuments({
      job: { $in: jobIds },
    });

    // Calculate interviews conducted
    const interviewsConducted = await Interview.countDocuments({
      company: company._id,
      status: "completed",
    });

    // Calculate hires this month
    const hiresThisMonth = await Application.countDocuments({
      job: { $in: jobIds },
      status: "hired",
      updatedAt: { $gte: startOfMonth },
    });

    // Active jobs count (use isActive field, or count all as active if field not set)
    const activeJobs = await Job.countDocuments({
      company: company._id,
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    });

    // Total jobs for this company
    const totalJobs = await Job.countDocuments({
      company: company._id,
    });

    const planDetails =
      SUBSCRIPTION_PLANS[company.subscription.plan] || SUBSCRIPTION_PLANS.basic;

    return res.status(200).json({
      success: true,
      company: {
        _id: company._id,
        name: company.name,
        logo: company.logo,
        subscription: {
          ...company.subscription.toObject(),
          planDetails,
          isActive: company.isSubscriptionActive,
          daysRemaining: company.daysUntilExpiry,
        },
        features: company.features,
        usage: {
          ...(company.usage.toObject
            ? company.usage.toObject()
            : company.usage),
          totalApplications,
          interviewsConducted,
          hiresThisMonth,
          activeJobs,
          totalJobs,
          applicationGrowth,
          appsThisMonth,
        },
        recruitersCount: company.recruiters.filter((r) => r.status === "active")
          .length,
      },
      userRole: user.role,
      permissions: user.permissions,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return res.status(500).json({
      message: "Error fetching dashboard data",
      success: false,
    });
  }
};

// Resend recruiter invitation
export const resendInvitation = async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const adminId = req.id;

    const company = await Company.findOne({ adminUser: adminId });
    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    const recruiterIndex = company.recruiters.findIndex(
      (r) => r._id.toString() === recruiterId && r.status === "invited",
    );

    if (recruiterIndex === -1) {
      return res.status(404).json({
        message: "Pending invitation not found",
        success: false,
      });
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString("hex");
    company.recruiters[recruiterIndex].invitationToken = newToken;
    company.recruiters[recruiterIndex].invitationExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
    company.recruiters[recruiterIndex].invitedAt = new Date();

    await company.save();

    const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/recruiter/accept-invite?token=${newToken}&company=${company._id}`;

    console.log(`📧 Resent Invitation Link: ${inviteLink}`);

    return res.status(200).json({
      message: "Invitation resent successfully",
      success: true,
      inviteLink:
        process.env.NODE_ENV === "development" ? inviteLink : undefined,
    });
  } catch (error) {
    console.error("Resend invitation error:", error);
    return res.status(500).json({
      message: "Error resending invitation",
      success: false,
    });
  }
};

// ========== CEO EXCLUSIVE FUNCTIONS ==========

// Get pending candidate approvals (candidates passed by recruiters for CEO's final decision)
export const getPendingApprovals = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    // Only company_admin (CEO) can access this
    if (user.role !== "company_admin") {
      return res.status(403).json({
        message: "Only company admin can view pending approvals",
        success: false,
      });
    }

    const company = await Company.findOne({ adminUser: userId });
    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    // Import Application model dynamically to avoid circular dependency
    const { Application } = await import("../models/application.model.js");
    const { Job } = await import("../models/job.model.js");

    // Find applications that are passed by recruiter for CEO review
    const pendingApprovals = await Application.find({
      status: "pending_ceo_approval",
    })
      .populate({
        path: "job",
        match: { company: company._id },
        select: "title salary jobType location",
      })
      .populate(
        "applicant",
        "fullname email profile.profilePhoto profile.skills",
      )
      .populate("recruiterReview.reviewedBy", "fullname")
      .sort({ "recruiterReview.reviewedAt": -1 });

    // Filter out applications where job doesn't match company
    const validApprovals = pendingApprovals.filter((app) => app.job !== null);

    return res.status(200).json({
      success: true,
      pendingApprovals: validApprovals,
      count: validApprovals.length,
    });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return res.status(500).json({
      message: "Error fetching pending approvals",
      success: false,
    });
  }
};

// CEO approves or rejects candidate for final hire
export const approveCandidateHire = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { decision, notes } = req.body; // decision: 'approved' or 'rejected'
    const userId = req.id;
    const user = await User.findById(userId);

    // Only company_admin (CEO) can approve hires
    if (user.role !== "company_admin") {
      return res.status(403).json({
        message: "Only company admin can approve candidate hires",
        success: false,
      });
    }

    const { Application } = await import("../models/application.model.js");

    const application = await Application.findById(applicationId)
      .populate("job")
      .populate("applicant", "fullname email");

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
        success: false,
      });
    }

    // Verify the application is for CEO's company
    const company = await Company.findOne({ adminUser: userId });
    if (
      !company ||
      application.job.company.toString() !== company._id.toString()
    ) {
      return res.status(403).json({
        message: "Unauthorized to approve this application",
        success: false,
      });
    }

    // Update application status based on CEO decision
    if (decision === "approved") {
      application.status = "hired";
      application.ceoReview = {
        decision: "approved",
        notes: notes || "",
        reviewedAt: new Date(),
        reviewedBy: userId,
      };

      // Update company usage stats
      company.usage.hiresThisMonth = (company.usage.hiresThisMonth || 0) + 1;
      await company.save();

      // Create notification for the applicant
      await Notification.create({
        userId: application.applicant._id,
        type: "offer",
        title: "🎉 Congratulations! You're Hired!",
        message: `${company.name} has approved your application for ${application.job.title}. You will receive further details soon.`,
        relatedJob: application.job._id,
        relatedApplication: application._id,
      });
    } else if (decision === "rejected") {
      application.status = "rejected";
      application.ceoReview = {
        decision: "rejected",
        notes: notes || "",
        reviewedAt: new Date(),
        reviewedBy: userId,
      };

      // Notify applicant
      await Notification.create({
        userId: application.applicant._id,
        type: "status",
        title: "Application Update",
        message: `Your application for ${application.job.title} at ${company.name} has been reviewed.`,
        relatedJob: application.job._id,
        relatedApplication: application._id,
      });
    }

    await application.save();

    return res.status(200).json({
      success: true,
      message:
        decision === "approved"
          ? "Candidate approved for hire!"
          : "Candidate rejected",
      application: {
        _id: application._id,
        status: application.status,
        applicant: application.applicant.fullname,
        job: application.job.title,
      },
    });
  } catch (error) {
    console.error("Approve candidate error:", error);
    return res.status(500).json({
      message: "Error processing approval",
      success: false,
    });
  }
};

// Update company profile (CEO exclusive for name changes)
export const updateCompanyProfile = async (req, res) => {
  try {
    const {
      name,
      description,
      website,
      location,
      phone,
      industry,
      companySize,
    } = req.body;
    const userId = req.id;
    const user = await User.findById(userId);

    // Get the company
    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else if (user.role === "recruiter") {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    // Only CEO can change company name
    if (name && user.role !== "company_admin") {
      return res.status(403).json({
        message: "Only company admin can change company name",
        success: false,
      });
    }

    // Handle logo upload
    let logo;
    if (req.file) {
      const fileUri = getDataUri(req.file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content, {
        folder: "jobportal/companies",
      });
      logo = cloudResponse.secure_url;
    }

    const updateData = {
      ...(name && user.role === "company_admin" && { name }),
      ...(description && { description }),
      ...(website && { website }),
      ...(location && { location }),
      ...(phone && { phone }),
      ...(industry && { industry }),
      ...(companySize && { companySize }),
      ...(logo && { logo }),
    };

    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      updateData,
      { new: true },
    );

    return res.status(200).json({
      message: "Company profile updated successfully",
      company: updatedCompany,
      success: true,
    });
  } catch (error) {
    console.error("Update company profile error:", error);
    return res.status(500).json({
      message: "Error updating company profile",
      success: false,
    });
  }
};

// Get recruiter performance stats (CEO only)
export const getRecruiterPerformance = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    if (user.role !== "company_admin") {
      return res.status(403).json({
        message: "Only company admin can view recruiter performance",
        success: false,
      });
    }

    const company = await Company.findOne({ adminUser: userId }).populate(
      "recruiters.userId",
      "fullname email profile.profilePhoto",
    );

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        success: false,
      });
    }

    const { Application } = await import("../models/application.model.js");
    const { Interview } = await import("../models/interview.model.js");

    // Get performance stats for each recruiter
    const recruiterStats = await Promise.all(
      company.recruiters
        .filter((r) => r.status === "active" && r.userId)
        .map(async (recruiter) => {
          const recruiterId = recruiter.userId._id;

          // Count interviews conducted by this recruiter
          const interviewCount = await Interview.countDocuments({
            conductedBy: recruiterId,
            status: "completed",
          });

          // Count candidates passed to CEO
          const passedToCeo = await Application.countDocuments({
            "recruiterReview.reviewedBy": recruiterId,
            "recruiterReview.decision": "passed",
          });

          // Count candidates hired
          const hired = await Application.countDocuments({
            "recruiterReview.reviewedBy": recruiterId,
            status: "hired",
          });

          return {
            _id: recruiter._id,
            user: {
              _id: recruiter.userId._id,
              fullname: recruiter.userId.fullname,
              email: recruiter.userId.email,
              profilePhoto: recruiter.userId.profile?.profilePhoto,
            },
            role: recruiter.role,
            joinedAt: recruiter.joinedAt,
            stats: {
              interviewsConducted: interviewCount,
              candidatesPassedToCeo: passedToCeo,
              successfulHires: hired,
            },
          };
        }),
    );

    return res.status(200).json({
      success: true,
      recruiters: recruiterStats,
    });
  } catch (error) {
    console.error("Get recruiter performance error:", error);
    return res.status(500).json({
      message: "Error fetching recruiter performance",
      success: false,
    });
  }
};

// ========== PUBLIC ENDPOINTS ==========

// Get featured companies for landing page (no auth required)
export const getFeaturedCompanies = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    // First try to get verified companies
    let companies = await Company.find({
      isVerified: true,
      "subscription.status": "active",
    })
      .select("name logo tagline industry location companySize isVerified")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // If not enough verified, get companies with active subscriptions
    if (companies.length < Number(limit)) {
      const additionalCompanies = await Company.find({
        _id: { $nin: companies.map((c) => c._id) },
        "subscription.status": "active",
      })
        .select("name logo tagline industry location companySize isVerified")
        .sort({ createdAt: -1 })
        .limit(Number(limit) - companies.length)
        .lean();

      companies = [...companies, ...additionalCompanies];
    }

    // If still not enough, get any companies with logos
    if (companies.length < Number(limit)) {
      const anyCompanies = await Company.find({
        _id: { $nin: companies.map((c) => c._id) },
        logo: { $exists: true, $ne: null },
      })
        .select("name logo tagline industry location companySize isVerified")
        .sort({ createdAt: -1 })
        .limit(Number(limit) - companies.length)
        .lean();

      companies = [...companies, ...anyCompanies];
    }

    // Final fallback - any companies
    if (companies.length < Number(limit)) {
      const fallbackCompanies = await Company.find({
        _id: { $nin: companies.map((c) => c._id) },
      })
        .select("name logo tagline industry location companySize isVerified")
        .sort({ createdAt: -1 })
        .limit(Number(limit) - companies.length)
        .lean();

      companies = [...companies, ...fallbackCompanies];
    }

    return res.status(200).json({
      success: true,
      companies,
      total: companies.length,
    });
  } catch (error) {
    console.error("Get featured companies error:", error);
    return res.status(500).json({
      message: "Error fetching featured companies",
      success: false,
    });
  }
};

// ========== OFFER TEMPLATE MANAGEMENT ==========

export const addOfferTemplate = async (req, res) => {
  try {
    const { name, subject, content, isDefault } = req.body;
    const userId = req.id;

    // Determine company ID
    let companyId;
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    if (user.role === "company_admin") {
      const company = await Company.findOne({ adminUser: userId });
      companyId = company?._id;
    } else {
      companyId = user.companyId;
    }

    if (!companyId) return res.status(404).json({ success: false, message: "Company not found" });

    const company = await Company.findById(companyId);

    if (isDefault) {
      company.offerTemplates.forEach((t) => (t.isDefault = false));
    }

    company.offerTemplates.push({
      name,
      subject,
      content,
      isDefault: isDefault || company.offerTemplates.length === 0,
    });

    await company.save();

    return res.status(201).json({
      success: true,
      message: "Template saved successfully",
      templates: company.offerTemplates,
    });
  } catch (error) {
    console.error("Add template error:", error);
    return res.status(500).json({ success: false, message: "Error saving template" });
  }
};

export const getOfferTemplates = async (req, res) => {
  try {
    const userId = req.id;
    let companyId;
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    if (user.role === "company_admin") {
      const company = await Company.findOne({ adminUser: userId });
      companyId = company?._id;
    } else {
      companyId = user.companyId;
    }

    if (!companyId) return res.status(404).json({ success: false, message: "Company not found" });

    const company = await Company.findById(companyId).select("offerTemplates");

    return res.status(200).json({
      success: true,
      templates: company.offerTemplates,
    });
  } catch (error) {
    console.error("Get templates error:", error);
    return res.status(500).json({ success: false, message: "Error fetching templates" });
  }
};

export const deleteOfferTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.id;

    let companyId;
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    if (user.role === "company_admin") {
      const company = await Company.findOne({ adminUser: userId });
      companyId = company?._id;
    } else {
      companyId = user.companyId;
    }

    if (!companyId) return res.status(404).json({ success: false, message: "Company not found" });

    const company = await Company.findById(companyId);

    company.offerTemplates = company.offerTemplates.filter(
      (t) => t._id.toString() !== templateId,
    );

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Template deleted",
      templates: company.offerTemplates,
    });
  } catch (error) {
    console.error("Delete template error:", error);
    return res.status(500).json({ success: false, message: "Error deleting template" });
  }
};
