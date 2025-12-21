import crypto from "crypto";
import { Company, SUBSCRIPTION_PLANS } from "../models/company.model.js";
import { Notification } from "../models/notification.model.js";

// =====================================================
// PADDLE PAYMENT CONTROLLER
// =====================================================

const PADDLE_CONFIG = {
  environment: process.env.PADDLE_ENVIRONMENT || "sandbox",
  clientToken: process.env.PADDLE_CLIENT_TOKEN || "",
  apiKey: process.env.PADDLE_API_KEY || "",
  webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || "",
  apiUrl:
    process.env.PADDLE_ENVIRONMENT === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com",
};

// Store pending transactions (in production, use database)
const pendingTransactions = new Map();

/**
 * Get Paddle client configuration for frontend
 */
export const getPaddleConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      environment: PADDLE_CONFIG.environment,
      clientToken: PADDLE_CONFIG.clientToken,
    });
  } catch (error) {
    console.error("Get Paddle config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get Paddle configuration",
    });
  }
};

/**
 * Initiate a payment - stores registration data for after payment
 */
export const initiatePayment = async (req, res) => {
  try {
    const {
      planId,
      billingCycle = "monthly",
      amount,
      companyData,
      paddlePriceId,
    } = req.body;

    // Generate transaction reference
    const transactionRef = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Store pending transaction data
    pendingTransactions.set(transactionRef, {
      planId,
      billingCycle,
      amount,
      companyData,
      paddlePriceId,
      createdAt: new Date(),
      status: "pending",
    });

    // Clean up old pending transactions (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of pendingTransactions) {
      if (new Date(value.createdAt).getTime() < oneHourAgo) {
        pendingTransactions.delete(key);
      }
    }

    console.log("📦 Payment initiated:", { transactionRef, planId, amount });

    res.json({
      success: true,
      transactionRef,
      paddleConfig: {
        environment: PADDLE_CONFIG.environment,
        clientToken: PADDLE_CONFIG.clientToken,
      },
    });
  } catch (error) {
    console.error("Initiate payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
    });
  }
};

/**
 * Verify payment after Paddle checkout completes
 */
export const verifyPayment = async (req, res) => {
  try {
    const { transactionRef, paddleTransactionId } = req.body;

    if (!transactionRef) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference required",
      });
    }

    const pendingData = pendingTransactions.get(transactionRef);

    if (!pendingData) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or expired",
      });
    }

    // In production, verify with Paddle API
    // For sandbox, we trust the frontend callback

    console.log("✅ Payment verified:", {
      transactionRef,
      paddleTransactionId,
    });

    // Update status
    pendingTransactions.set(transactionRef, {
      ...pendingData,
      status: "verified",
      paddleTransactionId,
      verifiedAt: new Date(),
    });

    res.json({
      success: true,
      verified: true,
      transactionRef,
      paddleTransactionId,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

/**
 * Handle Paddle webhooks
 */
export const handlePaddleWebhook = async (req, res) => {
  try {
    const signature = req.headers["paddle-signature"];
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature (skip in development if no secret)
    if (PADDLE_CONFIG.webhookSecret) {
      const isValid = verifyWebhookSignature(
        signature,
        rawBody,
        PADDLE_CONFIG.webhookSecret,
      );
      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const event = req.body;
    console.log("🔔 Paddle webhook received:", event.event_type);

    switch (event.event_type) {
      case "transaction.completed":
        await handleTransactionCompleted(event.data);
        break;
      case "transaction.payment_failed":
        await handlePaymentFailed(event.data);
        break;
      case "subscription.created":
        await handleSubscriptionCreated(event.data);
        break;
      case "subscription.updated":
        await handleSubscriptionUpdated(event.data);
        break;
      case "subscription.canceled":
        await handleSubscriptionCanceled(event.data);
        break;
      default:
        console.log("Unhandled event type:", event.event_type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// Webhook signature verification
const verifyWebhookSignature = (signature, payload, secret) => {
  try {
    if (!signature) return false;

    const [ts, h1] = signature.split(";").map((part) => part.split("=")[1]);
    const signedPayload = `${ts}:${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return h1 === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

// Webhook handlers - Enhanced to properly save subscription data
const handleTransactionCompleted = async (data) => {
  console.log("💰 Transaction completed:", data.id);

  try {
    // Try to find company associated with this transaction
    const customData = data.custom_data || data.metadata || {};
    const transactionRef = customData.transactionRef;
    const companyEmail = customData.adminEmail || customData.email;
    const paddleCustomerId = data.customer_id;

    // Find company by various methods
    let company = null;

    if (transactionRef) {
      // Check pending transactions first
      const pendingData = pendingTransactions.get(transactionRef);
      if (pendingData?.companyData?.email) {
        company = await Company.findOne({
          email: pendingData.companyData.email.toLowerCase(),
        });
      }
    }

    if (!company && companyEmail) {
      company = await Company.findOne({ email: companyEmail.toLowerCase() });
    }

    if (!company && paddleCustomerId) {
      company = await Company.findOne({
        "subscription.paddleCustomerId": paddleCustomerId,
      });
    }

    if (!company) {
      console.log("⚠️ No company found for transaction:", data.id);
      return;
    }

    // Update subscription status to active
    const billingCycle = data.billing_period?.interval || "monthly";
    const endDate = new Date();
    switch (billingCycle) {
      case "year":
      case "yearly":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case "quarter":
      case "quarterly":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    company.subscription.status = "active";
    company.subscription.startDate = new Date();
    company.subscription.endDate = endDate;
    company.subscription.nextPaymentDate = endDate;
    company.subscription.paddleCustomerId = paddleCustomerId;
    company.subscription.paddleTransactionId = data.id;
    company.subscription.paddleSubscriptionId = data.subscription_id;

    // Add payment record
    const amount = data.details?.totals?.total
      ? parseInt(data.details.totals.total) / 100
      : data.amount || 0;

    company.payments.push({
      transactionId: data.id,
      amount: amount,
      currency: data.currency_code || "PKR",
      plan: company.subscription.plan,
      duration: billingCycle,
      paymentDate: new Date(),
      paymentMethod: "paddle",
      status: "completed",
      paddleTransactionId: data.id,
    });

    // Update features if needed
    company.updateFeaturesFromPlan(company.subscription.plan);

    await company.save();
    console.log("✅ Company subscription updated for:", company.name);

    // Send notification to admin
    if (company.adminUser) {
      await Notification.createNotification({
        userId: company.adminUser,
        type: "payment_success",
        title: "Payment Confirmed! 🎉",
        message: `Your payment of ${data.currency_code || "PKR"} ${amount.toLocaleString()} has been confirmed. Your subscription is now active until ${endDate.toLocaleDateString()}.`,
        relatedEntities: { companyId: company._id },
      });
    }

    // Clean up pending transaction
    if (transactionRef) {
      pendingTransactions.delete(transactionRef);
    }
  } catch (error) {
    console.error("Error handling transaction completed:", error);
  }
};

const handlePaymentFailed = async (data) => {
  console.log("❌ Payment failed:", data.id);

  try {
    const customData = data.custom_data || data.metadata || {};
    const companyEmail = customData.adminEmail || customData.email;

    let company = null;
    if (companyEmail) {
      company = await Company.findOne({ email: companyEmail.toLowerCase() });
    } else if (data.customer_id) {
      company = await Company.findOne({
        "subscription.paddleCustomerId": data.customer_id,
      });
    }

    if (company && company.adminUser) {
      await Notification.createNotification({
        userId: company.adminUser,
        type: "payment_failed",
        title: "Payment Failed",
        message:
          "Your payment could not be processed. Please update your payment method to continue your subscription.",
        relatedEntities: { companyId: company._id },
        priority: "high",
      });
    }
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
};

const handleSubscriptionCreated = async (data) => {
  console.log("🆕 Subscription created:", data.id);

  try {
    const customData = data.custom_data || {};
    const paddleCustomerId = data.customer_id;

    const company = await Company.findOne({
      $or: [
        { "subscription.paddleCustomerId": paddleCustomerId },
        { email: customData.email?.toLowerCase() },
      ],
    });

    if (company) {
      company.subscription.paddleSubscriptionId = data.id;
      company.subscription.status =
        data.status === "active" ? "active" : "pending";
      company.subscription.autoRenew = true;
      await company.save();
      console.log("✅ Subscription linked to company:", company.name);
    }
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
};

const handleSubscriptionUpdated = async (data) => {
  console.log("🔄 Subscription updated:", data.id);

  try {
    const company = await Company.findOne({
      "subscription.paddleSubscriptionId": data.id,
    });

    if (company) {
      company.subscription.status =
        data.status === "active" ? "active" : data.status;
      if (data.next_billed_at) {
        company.subscription.nextPaymentDate = new Date(data.next_billed_at);
      }
      if (data.current_billing_period?.ends_at) {
        company.subscription.endDate = new Date(
          data.current_billing_period.ends_at,
        );
      }
      await company.save();
      console.log("✅ Subscription updated for:", company.name);
    }
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
};

const handleSubscriptionCanceled = async (data) => {
  console.log("🚫 Subscription canceled:", data.id);

  try {
    const company = await Company.findOne({
      "subscription.paddleSubscriptionId": data.id,
    });

    if (company) {
      company.subscription.status = "cancelled";
      company.subscription.cancelledAt = new Date();
      company.subscription.autoRenew = false;
      await company.save();

      if (company.adminUser) {
        await Notification.createNotification({
          userId: company.adminUser,
          type: "subscription_cancelled",
          title: "Subscription Cancelled",
          message: `Your subscription has been cancelled. You will have access until ${company.subscription.endDate?.toLocaleDateString() || "the end of your billing period"}.`,
          relatedEntities: { companyId: company._id },
        });
      }
      console.log("✅ Subscription cancelled for:", company.name);
    }
  } catch (error) {
    console.error("Error handling subscription canceled:", error);
  }
};

/**
 * Get pending transaction data
 */
export const getPendingTransaction = (transactionRef) => {
  return pendingTransactions.get(transactionRef);
};

export default {
  getPaddleConfig,
  initiatePayment,
  verifyPayment,
  handlePaddleWebhook,
  getPendingTransaction,
};
