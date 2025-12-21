import express from "express";
import {
  getPaddleConfig,
  initiatePayment,
  verifyPayment,
  handlePaddleWebhook,
} from "../controllers/paddle.controller.js";

const router = express.Router();

// Get Paddle client configuration (frontend uses this)
router.get("/config", getPaddleConfig);

// Initiate payment - stores registration data
router.post("/initiate", initiatePayment);

// Verify payment after Paddle checkout
router.post("/verify", verifyPayment);

// Paddle webhook endpoint
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handlePaddleWebhook,
);

export default router;
