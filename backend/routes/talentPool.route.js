import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { createPool, getPools, getPoolCandidates, addCandidate, updateCandidate, removeCandidate, addContactNote, deletePool } from "../controllers/talentPool.controller.js";

const router = express.Router();

router.use(isAuthenticated);

router.post("/", createPool);
router.get("/", getPools);
router.get("/:poolId", getPoolCandidates);
router.post("/:poolId/candidates", addCandidate);
router.put("/:poolId/candidates/:candidateId", updateCandidate);
router.delete("/:poolId/candidates/:candidateId", removeCandidate);
router.post("/:poolId/candidates/:candidateId/notes", addContactNote);
router.delete("/:poolId", deletePool);

export default router;
