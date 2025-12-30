import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
    generateReferralCode,
    sendReferralInvite,
    getMyReferrals,
    getReferralStats,
    applyReferralCode,
    trackReferralClick,
    markRewarded,
} from "../controllers/referral.controller.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/generate", isAuthenticated, generateReferralCode);
router.post("/invite", isAuthenticated, sendReferralInvite);
router.get("/my-referrals", isAuthenticated, getMyReferrals);
router.get("/stats", isAuthenticated, getReferralStats);

// Public routes
router.post("/apply", applyReferralCode);
router.get("/track/:code", trackReferralClick);

// Admin routes
router.put("/reward/:id", isAuthenticated, markRewarded);

export default router;
