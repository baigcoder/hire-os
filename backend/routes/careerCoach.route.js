import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { startSession, sendMessage, getSessions, getSession, addGoal, updateGoal, endSession } from "../controllers/careerCoach.controller.js";

const router = express.Router();

router.use(isAuthenticated);

router.post("/start", startSession);
router.post("/message", sendMessage);
router.get("/sessions", getSessions);
router.get("/sessions/:sessionId", getSession);
router.post("/sessions/:sessionId/goals", addGoal);
router.put("/sessions/:sessionId/goals/:goalId", updateGoal);
router.post("/sessions/:sessionId/end", endSession);

export default router;
