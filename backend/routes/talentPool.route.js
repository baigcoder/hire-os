import express from "express";
import mongoose from "mongoose";
import isAuthenticated, { isRecruiter } from "../middlewares/isAuthenticated.js";
import { TalentPool } from "../models/talentPool.model.js";
import { createPool, getPools, getPoolCandidates, addCandidate, updateCandidate, removeCandidate, addContactNote, deletePool } from "../controllers/talentPool.controller.js";

const router = express.Router();

// Talent pools hold candidate notes: recruiters and company admins only
router.use(isAuthenticated, isRecruiter);

// SECURITY (S18): every /:poolId route only reaches pools of the caller's
// own company (previously any signed-in user could read or edit any pool)
router.param("poolId", async (req, res, next, poolId) => {
    try {
        if (!mongoose.isValidObjectId(poolId)) {
            return res.status(404).json({ success: false, message: "Pool not found" });
        }
        const pool = await TalentPool.findById(poolId).select("company").lean();
        if (!pool || !req.user.companyId || String(pool.company) !== String(req.user.companyId)) {
            return res.status(404).json({ success: false, message: "Pool not found" });
        }
        next();
    } catch (error) {
        next(error);
    }
});

router.post("/", createPool);
router.get("/", getPools);
router.get("/:poolId", getPoolCandidates);
router.post("/:poolId/candidates", addCandidate);
router.put("/:poolId/candidates/:candidateId", updateCandidate);
router.delete("/:poolId/candidates/:candidateId", removeCandidate);
router.post("/:poolId/candidates/:candidateId/notes", addContactNote);
router.delete("/:poolId", deletePool);

export default router;
