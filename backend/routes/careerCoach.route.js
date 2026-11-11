import { aiLimiter } from "../middlewares/rateLimiters.js";
import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { startSession, sendMessage, getSessions, getSession, addGoal, updateGoal, endSession } from "../controllers/careerCoach.controller.js";

const router = express.Router();

router.use(isAuthenticated);

router.post("/start", aiLimiter, startSession);
router.post("/message", aiLimiter, sendMessage);
router.get("/sessions", getSessions);
router.get("/sessions/:sessionId", getSession);
router.post("/sessions/:sessionId/goals", addGoal);
router.put("/sessions/:sessionId/goals/:goalId", updateGoal);
router.post("/sessions/:sessionId/end", endSession);

export default router;
