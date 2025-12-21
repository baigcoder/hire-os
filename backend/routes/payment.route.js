import express from "express";
import {
  initiatePayment,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  getPaymentHistory,
  processRefund,
  getCheckoutConfig,
  completeRegistration,
} from "../controllers/payment.controller.js";
import isAuthenticated, {
  isCompanyAdmin,
} from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Public routes for initial registration
router.post("/initiate", initiatePayment); // No auth for new registration
router.get("/checkout-config", getCheckoutConfig); // Get SafePay config for client
router.get("/verify/:transactionId", verifyPayment); // Verify payment status
router.post("/complete-registration", completeRegistration); // Complete after payment

// SafePay Webhook (no auth - called by SafePay)
router.post("/webhook/safepay", handleWebhook);

// Protected routes (require login)
router.get("/status/:transactionId", isAuthenticated, getPaymentStatus);
router.get("/history", isAuthenticated, isCompanyAdmin, getPaymentHistory);
router.post(
  "/refund/:transactionId",
  isAuthenticated,
  isCompanyAdmin,
  processRefund,
);

export default router;
