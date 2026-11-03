import express from "express";
import isAuthenticated, { isSuperAdmin } from "../middlewares/isAuthenticated.js";
import { submitReview, getCompanyReviews, markHelpful, moderateReview, respondToReview } from "../controllers/companyReview.controller.js";

const router = express.Router();

router.post("/", isAuthenticated, submitReview);
router.get("/company/:companyId", getCompanyReviews);
router.post("/:reviewId/helpful", isAuthenticated, markHelpful);
// Platform moderation only: companies must not hide their own reviews (S18)
router.post("/:reviewId/moderate", isAuthenticated, isSuperAdmin, moderateReview);
router.post("/:reviewId/respond", isAuthenticated, respondToReview);

export default router;
