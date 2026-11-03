import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { User } from "../models/user.model.js";
import { overviewFor, jobsOverview } from "../modules/overview/overview.js";

const router = express.Router();

// GET /api/v1/overview — the signed-in user's dashboard, shaped by their role
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.id).select("role").lean();
    if (!user) return res.status(401).json({ success: false, message: "Sign in again" });
    const overview = await overviewFor(user);
    return res.status(200).json({ success: true, role: user.role, ...overview });
  } catch (error) {
    console.error("Overview error:", error);
    return res.status(500).json({ success: false, message: "Couldn't load your overview" });
  }
});

// GET /api/v1/overview/jobs — the company's jobs with applicants per stage
router.get("/jobs", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.id).select("role companyId").lean();
    if (!user || !["company_admin", "recruiter"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Only company members can see jobs" });
    }
    return res.status(200).json({ success: true, ...(await jobsOverview(user)) });
  } catch (error) {
    console.error("Jobs overview error:", error);
    return res.status(500).json({ success: false, message: "Couldn't load jobs" });
  }
});

export default router;
