import express from "express";
import {
  getSubscriptionPlans,
  createSubscription,
  upgradeSubscription,
  cancelSubscription,
  getSubscriptionStatus,
  getSubscriptionHistory,
  renewSubscription,
  getCurrentSubscription,
} from "../controllers/subscription.controller.js";
import isAuthenticated, {
  isCompanyAdmin,
} from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Public - Get all subscription plans
router.get("/plans", getSubscriptionPlans);

// Protected - Requires company admin authentication
router.post("/create", isAuthenticated, createSubscription);
router.post("/upgrade", isAuthenticated, isCompanyAdmin, upgradeSubscription);
router.post("/cancel", isAuthenticated, isCompanyAdmin, cancelSubscription);
router.post("/renew", isAuthenticated, isCompanyAdmin, renewSubscription);
router.get("/status", isAuthenticated, isCompanyAdmin, getSubscriptionStatus);
router.get("/history", isAuthenticated, isCompanyAdmin, getSubscriptionHistory);
router.get("/current", isAuthenticated, getCurrentSubscription);

export default router;
