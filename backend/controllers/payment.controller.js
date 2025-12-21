import crypto from "crypto";
import axios from "axios";
import { Company, SUBSCRIPTION_PLANS } from "../models/company.model.js";
import { Notification } from "../models/notification.model.js";

// SafePay Configuration - Use your actual TEST MODE keys
const SAFEPAY_CONFIG = {
  sandbox: true, // Set to false in production
  publicKey:
    process.env.SAFEPAY_PUBLIC_KEY ||
    "sec_c11137cf-47a8-4d2b-b0e3-1545b3d38b75",
  secretKey:
    process.env.SAFEPAY_SECRET_KEY ||
    "ce4bc1209378d9b7d179e8f18d5b74549dca056f8ccabc6fd7af176ddcb8b100",
  baseUrl: "https://sandbox.api.getsafepay.com", // For TEST MODE
  checkoutBaseUrl: "https://sandbox.api.getsafepay.com/checkout", // Checkout UI base
  webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET || "webhook_secret_key",
};

// Helper: Generate unique transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `TXN-${timestamp}-${random}`.toUpperCase();
};

// Helper: Build SafePay checkout URL with required query params
const buildCheckoutUrl = (tracker, orderId, redirectUrl, cancelUrl) => {
  const env = SAFEPAY_CONFIG.sandbox ? "sandbox" : "production";
  const baseUrl = SAFEPAY_CONFIG.checkoutBaseUrl;

  // SafePay requires these query parameters
  const params = new URLSearchParams({
    env: env,
    beacon: tracker,
    order_id: orderId,
    source: "custom",
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  });

  return `${baseUrl}/external/pay?${params.toString()}`;
};

// Helper: Create SafePay checkout session using Payments 2.0 API
const createSafepaySession = async (
  amount,
  currency,
  metadata,
  successUrl,
  cancelUrl,
) => {
  const transactionId = generateTransactionId();

  try {
    // Create a Tracker token first - This is required for Payments 2.0
    const authHeader = Buffer.from(
      `${SAFEPAY_CONFIG.publicKey}:${SAFEPAY_CONFIG.secretKey}`,
    ).toString("base64");

    // Step 1: Initialize the order and get tracker
    const response = await axios.post(
      `${SAFEPAY_CONFIG.baseUrl}/order/v1/init`,
      {
        client: SAFEPAY_CONFIG.publicKey,
        amount: amount * 100, // SafePay expects amount in paisa
        currency: currency,
        environment: SAFEPAY_CONFIG.sandbox ? "sandbox" : "production",
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("SafePay init response:", response.data);

    if (response.data && response.data.data && response.data.data.token) {
      const tracker = response.data.data.token;

      // Build the checkout URL with all required query params
      const checkoutUrl = buildCheckoutUrl(
        tracker,
        transactionId,
        successUrl,
        cancelUrl,
      );

      console.log("Generated SafePay checkout URL:", checkoutUrl);

      return {
        success: true,
        token: tracker,
        checkoutUrl: checkoutUrl,
        transactionId: transactionId,
        tracker: tracker,
      };
    }

    throw new Error("Failed to create SafePay session - no token received");
  } catch (error) {
    console.error(
      "SafePay session error:",
      error.response?.data || error.message,
    );

    // Fallback for development/testing - simulate payment flow locally
    console.log("⚠️ Using simulated payment flow (SafePay API unavailable)");
    return {
      success: true,
      token: `sim_${transactionId}`,
      checkoutUrl: null, // No external checkout, handle locally
      transactionId: transactionId,
      simulated: true,
    };
  }
};

// Initiate payment - Creates SafePay checkout session
export const initiatePayment = async (req, res) => {
  try {
    const { planId, billingCycle, amount, companyData } = req.body;

    // Validate input
    if (!planId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Plan ID and amount are required",
      });
    }

    const transactionId = generateTransactionId();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // Build success and cancel URLs
    const successUrl = `${frontendUrl}/company/payment/success?txn=${transactionId}`;
    const cancelUrl = `${frontendUrl}/company/payment?status=cancelled`;

    // Create SafePay session
    const session = await createSafepaySession(
      amount,
      "PKR",
      {
        plan: planId,
        billingCycle: billingCycle || "monthly",
        transactionId,
        companyData: JSON.stringify(companyData || {}),
      },
      successUrl,
      cancelUrl,
    );

    // Store pending transaction in memory/cache for verification
    // In production, store in database or Redis
    global.pendingTransactions = global.pendingTransactions || {};
    global.pendingTransactions[transactionId] = {
      amount,
      planId,
      billingCycle,
      companyData,
      createdAt: new Date(),
      status: "pending",
      safepayToken: session.token,
    };

    return res.status(200).json({
      success: true,
      message: "Payment session created",
      transactionId,
      checkoutUrl: session.checkoutUrl,
      token: session.token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });
  } catch (error) {
    console.error("Initiate payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error initiating payment",
    });
  }
};

// Get SafePay checkout configuration for client-side integration
export const getCheckoutConfig = async (req, res) => {
  try {
    const { amount, planId, orderId } = req.query;

    return res.status(200).json({
      success: true,
      config: {
        publicKey: SAFEPAY_CONFIG.publicKey,
        environment: SAFEPAY_CONFIG.sandbox ? "sandbox" : "production",
        amount: parseInt(amount) * 100, // Convert to paisa
        currency: "PKR",
        orderId: orderId || generateTransactionId(),
      },
    });
  } catch (error) {
    console.error("Get checkout config error:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting checkout configuration",
    });
  }
};

// Verify payment (called after SafePay redirect)
export const verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { tracker, token, sig } = req.query;

    // First check pending transactions
    const pending = global.pendingTransactions?.[transactionId];

    if (!pending) {
      // Check database for company payment
      const company = await Company.findOne({
        "payments.transactionId": transactionId,
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      const payment = company.payments.find(
        (p) => p.transactionId === transactionId,
      );

      return res.status(200).json({
        success: true,
        payment: {
          transactionId: payment.transactionId,
          amount: payment.amount,
          status: payment.status,
          plan: payment.plan,
        },
      });
    }

    // Verify with SafePay if we have tracker
    if (tracker && token) {
      try {
        const authHeader = Buffer.from(
          `${SAFEPAY_CONFIG.publicKey}:${SAFEPAY_CONFIG.secretKey}`,
        ).toString("base64");

        const verifyResponse = await axios.get(
          `${SAFEPAY_CONFIG.baseUrl}/order/v1/${tracker}`,
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
            },
          },
        );

        if (verifyResponse.data?.data?.state === "PAID") {
          pending.status = "completed";
          pending.verifiedAt = new Date();
          pending.safepayTracker = tracker;

          return res.status(200).json({
            success: true,
            verified: true,
            message: "Payment verified successfully",
            transactionId,
            status: "completed",
            amount: pending.amount,
            plan: pending.planId,
          });
        }
      } catch (verifyError) {
        console.error(
          "SafePay verify error:",
          verifyError.response?.data || verifyError.message,
        );
      }
    }

    // For development/sandbox: Auto-complete payment
    if (SAFEPAY_CONFIG.sandbox) {
      pending.status = "completed";
      pending.verifiedAt = new Date();

      return res.status(200).json({
        success: true,
        verified: true,
        message: "Payment verified (sandbox mode)",
        transactionId,
        status: "completed",
        amount: pending.amount,
        plan: pending.planId,
      });
    }

    return res.status(200).json({
      success: true,
      verified: false,
      transactionId,
      status: pending.status,
      amount: pending.amount,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
    });
  }
};

// Complete registration after payment verification
export const completeRegistration = async (req, res) => {
  try {
    const { transactionId, companyData, adminData, recruiters } = req.body;

    // Get pending transaction
    const pending = global.pendingTransactions?.[transactionId];

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (pending.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment not yet completed",
      });
    }

    // Now create the company and user (call company controller)
    return res.status(200).json({
      success: true,
      message: "Registration data received. Proceed with company creation.",
      transactionId,
      paymentVerified: true,
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Error completing registration",
    });
  }
};

// SafePay Webhook Handler
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-safepay-signature"];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature (in production)
    if (!SAFEPAY_CONFIG.sandbox && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", SAFEPAY_CONFIG.webhookSecret)
        .update(payload)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("Invalid webhook signature");
        return res.status(401).json({
          success: false,
          message: "Invalid webhook signature",
        });
      }
    }

    const { event, data } = req.body;

    console.log("SafePay Webhook received:", event, data);

    switch (event) {
      case "payment:created":
      case "payment.success":
        await handlePaymentSuccess(data);
        break;
      case "payment:failed":
      case "payment.failed":
        await handlePaymentFailed(data);
        break;
      case "refund:created":
      case "payment.refunded":
        await handlePaymentRefunded(data);
        break;
      default:
        console.log("Unhandled webhook event:", event);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing error",
    });
  }
};

// Handle successful payment webhook
const handlePaymentSuccess = async (data) => {
  const transactionId =
    data.order_id || data.transactionId || data.metadata?.transactionId;

  // Update pending transaction
  if (global.pendingTransactions?.[transactionId]) {
    global.pendingTransactions[transactionId].status = "completed";
    global.pendingTransactions[transactionId].safepayReference =
      data.tracker || data.reference;
  }

  // If we have metadata with companyId, update the company payment
  const companyId = data.metadata?.companyId;
  if (companyId) {
    const company = await Company.findById(companyId);
    if (company) {
      const payment = company.payments.find(
        (p) => p.transactionId === transactionId,
      );
      if (payment && payment.status !== "completed") {
        payment.status = "completed";
        payment.safepayReference = data.tracker || data.reference;

        // Activate subscription
        const endDate = new Date();
        switch (payment.duration) {
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

        company.subscription = {
          plan: payment.plan,
          type: payment.duration,
          status: "active",
          startDate: new Date(),
          endDate,
          nextPaymentDate: endDate,
          autoRenew: true,
        };

        company.updateFeaturesFromPlan(payment.plan);
        await company.save();

        // Notify company admin
        await Notification.createNotification({
          userId: company.adminUser,
          type: "payment_success",
          title: "Payment Confirmed",
          message: `Your payment of PKR ${payment.amount} has been confirmed. Subscription active until ${endDate.toLocaleDateString()}.`,
          relatedEntities: { companyId: company._id },
        });
      }
    }
  }
};

// Handle failed payment webhook
const handlePaymentFailed = async (data) => {
  const transactionId =
    data.order_id || data.transactionId || data.metadata?.transactionId;
  const reason = data.reason || "Payment was declined";

  // Update pending transaction
  if (global.pendingTransactions?.[transactionId]) {
    global.pendingTransactions[transactionId].status = "failed";
    global.pendingTransactions[transactionId].failureReason = reason;
  }

  const companyId = data.metadata?.companyId;
  if (companyId) {
    const company = await Company.findById(companyId);
    if (company) {
      const payment = company.payments.find(
        (p) => p.transactionId === transactionId,
      );
      if (payment) {
        payment.status = "failed";
        payment.failureReason = reason;
        await company.save();

        await Notification.createNotification({
          userId: company.adminUser,
          type: "payment_failed",
          title: "Payment Failed",
          message: `Your payment of PKR ${payment.amount} failed. Reason: ${reason}. Please try again.`,
          relatedEntities: { companyId: company._id },
          priority: "high",
        });
      }
    }
  }
};

// Handle refund webhook
const handlePaymentRefunded = async (data) => {
  const transactionId =
    data.order_id || data.transactionId || data.metadata?.transactionId;

  const companyId = data.metadata?.companyId;
  if (companyId) {
    const company = await Company.findById(companyId);
    if (company) {
      const payment = company.payments.find(
        (p) => p.transactionId === transactionId,
      );
      if (payment) {
        payment.status = "refunded";
        payment.refundedAt = new Date();
        await company.save();

        await Notification.createNotification({
          userId: company.adminUser,
          type: "payment_refunded",
          title: "Payment Refunded",
          message: `Your payment of PKR ${payment.amount} has been refunded.`,
          relatedEntities: { companyId: company._id },
        });
      }
    }
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Check pending transactions first
    const pending = global.pendingTransactions?.[transactionId];

    if (pending) {
      return res.status(200).json({
        success: true,
        payment: {
          transactionId,
          amount: pending.amount,
          currency: "PKR",
          status: pending.status,
          plan: pending.planId,
          createdAt: pending.createdAt,
        },
      });
    }

    // Check database
    const company = await Company.findOne({
      "payments.transactionId": transactionId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const payment = company.payments.find(
      (p) => p.transactionId === transactionId,
    );

    return res.status(200).json({
      success: true,
      payment: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        plan: payment.plan,
        duration: payment.duration,
        paymentDate: payment.paymentDate,
      },
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching payment status",
    });
  }
};

// Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.id;

    const company = await Company.findOne({ adminUser: userId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const payments = company.payments
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .map((p) => ({
        transactionId: p.transactionId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        plan: p.plan,
        duration: p.duration,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
      }));

    return res.status(200).json({
      success: true,
      payments,
      total: payments.length,
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching payment history",
    });
  }
};

// Process refund (admin only)
export const processRefund = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    const userId = req.id;

    const company = await Company.findOne({
      adminUser: userId,
      "payments.transactionId": transactionId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const payment = company.payments.find(
      (p) => p.transactionId === transactionId,
    );

    if (payment.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only refund completed payments",
      });
    }

    // In production, this would call SafePay refund API
    payment.status = "refunded";
    payment.refundedAt = new Date();
    payment.refundReason = reason;

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      payment: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("Process refund error:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing refund",
    });
  }
};
