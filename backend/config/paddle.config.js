import axios from "axios";

// =====================================================
// PADDLE PAYMENT CONFIGURATION
// =====================================================

// Paddle Sandbox/Live Configuration
export const PADDLE_CONFIG = {
  // Set to 'sandbox' for testing, 'production' for live
  environment: "sandbox",

  // Get this from Paddle Dashboard → Developer Tools → Authentication → Client-side Token
  clientToken: process.env.PADDLE_CLIENT_TOKEN || "test_your_client_token_here",

  // API Keys (for backend - server-side operations)
  apiKey: process.env.PADDLE_API_KEY || "",

  // Sandbox URLs
  sandbox: {
    apiUrl: "https://sandbox-api.paddle.com",
    checkoutUrl: "https://sandbox-checkout.paddle.com",
  },

  // Production URLs
  production: {
    apiUrl: "https://api.paddle.com",
    checkoutUrl: "https://checkout.paddle.com",
  },

  // Your Product/Price IDs from Paddle Dashboard
  // Create these in Paddle → Catalog → Products & Prices
  prices: {
    basic: {
      monthly: "", // e.g., 'pri_01abcdefg...'
      yearly: "",
    },
    professional: {
      monthly: "", // e.g., 'pri_01hijklmn...'
      yearly: "",
    },
    enterprise: {
      monthly: "", // e.g., 'pri_01opqrstu...'
      yearly: "",
    },
  },
};

// Get current environment URLs
const getUrls = () => {
  return PADDLE_CONFIG.environment === "sandbox"
    ? PADDLE_CONFIG.sandbox
    : PADDLE_CONFIG.production;
};

/**
 * Create a Paddle checkout session (server-side)
 * This is optional - you can also use client-side only checkout
 */
export const createPaddleTransaction = async (
  priceId,
  customerId = null,
  metadata = {},
) => {
  const { apiUrl } = getUrls();

  try {
    const response = await axios.post(
      `${apiUrl}/transactions`,
      {
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        ...(customerId && { customer_id: customerId }),
        custom_data: metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PADDLE_CONFIG.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      success: true,
      transactionId: response.data.data.id,
      checkoutUrl: response.data.data.checkout?.url,
    };
  } catch (error) {
    console.error(
      "Paddle transaction error:",
      error.response?.data || error.message,
    );
    return {
      success: false,
      error:
        error.response?.data?.error?.detail || "Failed to create transaction",
    };
  }
};

/**
 * Verify a Paddle webhook signature
 */
export const verifyPaddleWebhook = (signature, rawBody, webhookSecret) => {
  // Paddle webhook verification logic
  // Reference: https://developer.paddle.com/webhooks/signature-verification
  const crypto = require("crypto");

  try {
    const [ts, h1] = signature.split(";").map((part) => part.split("=")[1]);
    const signedPayload = `${ts}:${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    return h1 === expectedSignature;
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
};

/**
 * Get subscription plans with Paddle price IDs
 */
export const getPaddlePlans = () => {
  return [
    {
      id: "basic",
      name: "Basic",
      description: "For startups getting started",
      price: 5000, // Display price in PKR
      priceUSD: 18, // Paddle uses USD
      features: [
        "5 Job Postings",
        "1 Recruiter Account",
        "Basic Analytics",
        "Email Support",
      ],
      paddlePriceId: PADDLE_CONFIG.prices.basic.monthly,
    },
    {
      id: "professional",
      name: "Professional",
      description: "For growing companies",
      price: 15000,
      priceUSD: 54,
      popular: true,
      features: [
        "20 Job Postings",
        "5 Recruiter Accounts",
        "Video Interviews",
        "AI Recommendations",
      ],
      paddlePriceId: PADDLE_CONFIG.prices.professional.monthly,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large organizations",
      price: 40000,
      priceUSD: 143,
      features: [
        "Unlimited Postings",
        "Unlimited Recruiters",
        "API Access",
        "Dedicated Manager",
      ],
      paddlePriceId: PADDLE_CONFIG.prices.enterprise.monthly,
    },
  ];
};

export default PADDLE_CONFIG;
