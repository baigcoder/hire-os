import { TalentPool } from "../models/talentPool.model.js";
import { User } from "../models/user.model.js";

// Create talent pool
export const createPool = async (req, res) => {
    try {
        const userId = req.id;
        const { name, description, color, visibility } = req.body;

        const user = await User.findById(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: "Company required" });
        }

        const pool = await TalentPool.create({
            company: user.companyId,
            createdBy: userId,
            name,
            description,
            color,
            visibility,
        });

        return res.status(201).json({ success: true, pool });
    } catch (error) {
        console.error("Create pool error:", error);
        return res.status(500).json({ success: false, message: "Failed to create pool" });
    }
};

// Get company pools
export const getPools = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        if (!user?.companyId) return res.status(400).json({ success: false, message: "Company required" });

        const pools = await TalentPool.find({ company: user.companyId, isArchived: false })
            .populate("createdBy", "fullname")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            pools: pools.map(p => ({ ...p.toObject(), candidateCount: p.candidates?.length || 0 })),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch pools" });
    }
};

// Get pool with candidates
export const getPoolCandidates = async (req, res) => {
    try {
        const { poolId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        const pool = await TalentPool.findById(poolId)
            .populate("candidates.user", "fullname email profile.profilePhoto profile.skills")
            .populate("candidates.addedBy", "fullname");

        if (!pool) return res.status(404).json({ success: false, message: "Pool not found" });

        let candidates = pool.candidates;
        if (status && status !== "all") {
            candidates = candidates.filter(c => c.status === status);
        }

        const startIdx = (page - 1) * limit;
        const paged = candidates.slice(startIdx, startIdx + parseInt(limit));

        return res.status(200).json({
            success: true,
            pool: { _id: pool._id, name: pool.name, description: pool.description, color: pool.color },
            candidates: paged,
            total: candidates.length,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch candidates" });
    }
};

// Add candidate to pool
export const addCandidate = async (req, res) => {
    try {
        const { poolId } = req.params;
        const { candidateId, tags, notes, source } = req.body;
        const userId = req.id;

        const pool = await TalentPool.findById(poolId);
        if (!pool) return res.status(404).json({ success: false, message: "Pool not found" });

        const result = await pool.addCandidate(candidateId, userId, { tags, notes, source });
        if (!result) {
            return res.status(400).json({ success: false, message: "Candidate already in pool" });
        }

        return res.status(200).json({ success: true, message: "Candidate added" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to add candidate" });
    }
};

// Update candidate in pool
export const updateCandidate = async (req, res) => {
    try {
        const { poolId, candidateId } = req.params;
        const { status, notes, tags, rating } = req.body;

        const pool = await TalentPool.findById(poolId);
        if (!pool) return res.status(404).json({ success: false, message: "Pool not found" });

        const candidate = pool.candidates.find(c => c.user.toString() === candidateId);
        if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });

        if (status) candidate.status = status;
        if (notes) candidate.notes = notes;
        if (tags) candidate.tags = tags;
        if (rating) candidate.rating = rating;

        await pool.save();

        return res.status(200).json({ success: true, message: "Candidate updated" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update" });
    }
};

// Remove candidate from pool
export const removeCandidate = async (req, res) => {
    try {
        const { poolId, candidateId } = req.params;

        const pool = await TalentPool.findById(poolId);
        if (!pool) return res.status(404).json({ success: false, message: "Pool not found" });

        pool.candidates = pool.candidates.filter(c => c.user.toString() !== candidateId);
        await pool.save();

        return res.status(200).json({ success: true, message: "Candidate removed" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to remove" });
    }
};

// Add contact note
export const addContactNote = async (req, res) => {
    try {
        const { poolId, candidateId } = req.params;
        const { type, content } = req.body;
        const userId = req.id;

        const pool = await TalentPool.findById(poolId);
        if (!pool) return res.status(404).json({ success: false, message: "Pool not found" });

        const candidate = pool.candidates.find(c => c.user.toString() === candidateId);
        if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });

        candidate.contactHistory.push({ type, content, createdBy: userId });
        candidate.lastContacted = new Date();
        await pool.save();

        return res.status(200).json({ success: true, message: "Note added" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to add note" });
    }
};

// Delete pool
export const deletePool = async (req, res) => {
    try {
        const { poolId } = req.params;
        await TalentPool.findByIdAndUpdate(poolId, { isArchived: true });
        return res.status(200).json({ success: true, message: "Pool archived" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete" });
    }
};
