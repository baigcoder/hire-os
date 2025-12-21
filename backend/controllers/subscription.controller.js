import { Company, SUBSCRIPTION_PLANS } from "../models/company.model.js";
import { Notification } from "../models/notification.model.js";

// Get all subscription plans
export const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      features: {
        ...plan.features,
        // Convert -1 to "Unlimited" for display
        maxJobPostings:
          plan.features.maxJobPostings === -1
            ? "Unlimited"
            : plan.features.maxJobPostings,
        maxRecruiters:
          plan.features.maxRecruiters === -1
            ? "Unlimited"
            : plan.features.maxRecruiters,
      },
    }));

    return res.status(200).json({
      success: true,
      plans,
      discounts: {
        quarterly: 10,
        yearly: 20,
      },
    });
  } catch (error) {
    console.error("Get plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching subscription plans",
    });
  }
};

// Create initial subscription (during company registration)
export const createSubscription = async (req, res) => {
  try {
    const { companyId, plan, duration } = req.body;
    const userId = req.id;

    if (!companyId || !plan || !duration) {
      return res.status(400).json({
        success: false,
        message: "Company ID, plan, and duration are required",
      });
    }

    if (!SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
      });
    }

    if (!["monthly", "quarterly", "yearly"].includes(duration)) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration. Must be monthly, quarterly, or yearly",
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check if user is the company admin
    if (company.adminUser.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only company admin can manage subscriptions",
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();

    switch (duration) {
      case "monthly":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "quarterly":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case "yearly":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    // Calculate price
    const planData = SUBSCRIPTION_PLANS[plan];
    const price = planData.prices[duration];

    // Update company subscription
    company.subscription = {
      plan,
      type: duration,
      status: "pending", // Will be 'active' after payment
      startDate,
      endDate,
      nextPaymentDate: endDate,
      autoRenew: true,
    };

    // Update features based on plan
    company.updateFeaturesFromPlan(plan);

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Subscription created. Please complete payment.",
      subscription: company.subscription,
      amount: price,
      currency: "PKR",
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating subscription",
    });
  }
};

// Upgrade subscription
export const upgradeSubscription = async (req, res) => {
  try {
    const { newPlan, duration } = req.body;
    const userId = req.id;

    const company = await Company.findOne({ adminUser: userId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (!SUBSCRIPTION_PLANS[newPlan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
      });
    }

    const currentPlanIndex = ["basic", "professional", "enterprise"].indexOf(
      company.subscription.plan,
    );
    const newPlanIndex = ["basic", "professional", "enterprise"].indexOf(
      newPlan,
    );

    if (newPlanIndex <= currentPlanIndex) {
      return res.status(400).json({
        success: false,
        message:
          "Can only upgrade to a higher plan. Use downgrade for lower plans.",
      });
    }

    // Calculate prorated amount (simplified)
    const planData = SUBSCRIPTION_PLANS[newPlan];
    const upgradePrice = planData.prices[duration || company.subscription.type];

    // Store upgrade intent (will be activated after payment)
    company.pendingUpgrade = {
      plan: newPlan,
      duration: duration || company.subscription.type,
      price: upgradePrice,
      requestedAt: new Date(),
    };

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Upgrade initiated. Please complete payment.",
      upgrade: {
        from: company.subscription.plan,
        to: newPlan,
        amount: upgradePrice,
        currency: "PKR",
      },
    });
  } catch (error) {
    console.error("Upgrade subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Error upgrading subscription",
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.id;

    const company = await Company.findOne({ adminUser: userId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (company.subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Subscription is already cancelled",
      });
    }

    // Don't immediately cancel - mark for cancellation at end of period
    company.subscription.autoRenew = false;
    company.subscription.cancellationRequested = true;
    company.subscription.cancellationReason = reason;
    company.subscription.cancelledAt = new Date();

    await company.save();

    // Send notification
    await Notification.createNotification({
      userId,
      type: "subscription_cancelled",
      title: "Subscription Cancelled",
      message: `Your ${company.subscription.plan} subscription will end on ${company.subscription.endDate.toLocaleDateString()}. You can reactivate anytime.`,
      relatedEntities: { companyId: company._id },
    });

    return res.status(200).json({
      success: true,
      message: `Subscription will be cancelled at the end of the current period (${company.subscription.endDate.toLocaleDateString()})`,
      subscription: company.subscription,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Error cancelling subscription",
    });
  }
};

// Renew subscription
export const renewSubscription = async (req, res) => {
  try {
    const { duration } = req.body;
    const userId = req.id;

    const company = await Company.findOne({ adminUser: userId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const plan = company.subscription.plan;
    const renewDuration = duration || company.subscription.type;
    const planData = SUBSCRIPTION_PLANS[plan];
    const renewPrice = planData.prices[renewDuration];

    return res.status(200).json({
      success: true,
      message: "Renewal initiated. Please complete payment.",
      renewal: {
        plan,
        duration: renewDuration,
        amount: renewPrice,
        currency: "PKR",
      },
    });
  } catch (error) {
    console.error("Renew subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Error renewing subscription",
    });
  }
};

// Get subscription status
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.id;

    const company = await Company.findOne({ adminUser: userId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const planData = SUBSCRIPTION_PLANS[company.subscription.plan];

    // Handle missing dates - set defaults if not present
    let startDate = company.subscription.startDate;
    let endDate = company.subscription.endDate;
    let needsSave = false;

    if (!startDate) {
      // Use company creation date or current date as start
      startDate = company.createdAt || new Date();
      company.subscription.startDate = startDate;
      needsSave = true;
    }

    if (!endDate) {
      // Calculate end date based on subscription type (default 30 days for monthly)
      const durationDays =
        company.subscription.type === "yearly"
          ? 365
          : company.subscription.type === "quarterly"
            ? 90
            : 30;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);
      company.subscription.endDate = endDate;
      needsSave = true;
    }

    // Auto-update status if subscription is expired but status says active
    const now = new Date();
    if (endDate < now && company.subscription.status === "active") {
      company.subscription.status = "expired";
      needsSave = true;
    }

    // Save if we made updates
    if (needsSave) {
      await company.save();
    }

    return res.status(200).json({
      success: true,
      subscription: {
        ...company.subscription.toObject(),
        startDate,
        endDate,
        planDetails: planData,
        isActive: company.isSubscriptionActive,
        daysRemaining: company.daysUntilExpiry,
        features: company.features,
        usage: company.usage,
      },
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching subscription status",
    });
  }
};

// Get subscription/payment history
export const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.id;

    const company = await Company.findOne({ adminUser: userId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      payments: company.payments.sort((a, b) => b.paymentDate - a.paymentDate),
    });
  } catch (error) {
    console.error("Get subscription history error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching subscription history",
    });
  }
};

// Get current subscription details for dashboard
export const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.id;

    // Find company where user is admin or recruiter
    let company = await Company.findOne({
      $or: [{ adminUser: userId }, { "recruiters.userId": userId }],
    }).select("name subscription features usage payments");

    if (!company) {
      // Also check by user's companyId
      const { User } = await import("../models/user.model.js");
      const user = await User.findById(userId);
      if (user?.companyId) {
        company = await Company.findById(user.companyId).select(
          "name subscription features usage payments",
        );
      }
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Get plan details
    const planData =
      SUBSCRIPTION_PLANS[company.subscription.plan] || SUBSCRIPTION_PLANS.basic;

    // Calculate days remaining
    const now = new Date();
    const endDate = company.subscription.endDate
      ? new Date(company.subscription.endDate)
      : null;
    const daysRemaining = endDate
      ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
      : 0;

    // Get recent payments (last 5)
    const recentPayments = company.payments
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .slice(0, 5)
      .map((p) => ({
        transactionId: p.transactionId,
        amount: p.amount,
        currency: p.currency || "PKR",
        status: p.status,
        plan: p.plan,
        duration: p.duration,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
      }));

    return res.status(200).json({
      success: true,
      subscription: {
        plan: company.subscription.plan,
        planName: planData.name,
        status: company.subscription.status,
        type: company.subscription.type,
        startDate: company.subscription.startDate,
        endDate: company.subscription.endDate,
        nextPaymentDate: company.subscription.nextPaymentDate,
        autoRenew: company.subscription.autoRenew,
        daysRemaining,
        price: planData.prices?.[company.subscription.type] || 0,
        currency: "PKR",
      },
      features: {
        ...company.features,
        // Include plan limits for reference
        planLimits: planData.features,
      },
      usage: company.usage || {
        jobsPosted: 0,
        activeJobPostings: 0,
        applicationsReceived: 0,
        interviewsScheduled: 0,
      },
      recentPayments,
      company: {
        name: company.name,
      },
    });
  } catch (error) {
    console.error("Get current subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching subscription details",
    });
  }
};
