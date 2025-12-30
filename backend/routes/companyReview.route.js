import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { submitReview, getCompanyReviews, markHelpful, moderateReview, respondToReview } from "../controllers/companyReview.controller.js";

const router = express.Router();

router.post("/", isAuthenticated, submitReview);
router.get("/company/:companyId", getCompanyReviews);
router.post("/:reviewId/helpful", isAuthenticated, markHelpful);
router.post("/:reviewId/moderate", isAuthenticated, moderateReview);
router.post("/:reviewId/respond", isAuthenticated, respondToReview);

export default router;
