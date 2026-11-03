import express from "express";
import isAuthenticated, { isSuperAdmin } from "../middlewares/isAuthenticated.js";
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

// SECURITY (S18): the referred user is the caller, never a body userId
router.post("/apply", isAuthenticated, applyReferralCode);

// Public routes
router.get("/track/:code", trackReferralClick);

// Admin routes
router.put("/reward/:id", isAuthenticated, isSuperAdmin, markRewarded);

export default router;
