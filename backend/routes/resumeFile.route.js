/**
 * Private resume files. Mounted at /api/v1/resumes.
 *
 *   GET /:userId  → 302 to a 60-second signed URL for that user's resume
 *
 * Allowed: the user themselves, or a recruiter / company admin who can
 * manage a job the user applied to (utils/resumeFiles.js). Everyone else
 * gets 404, so the endpoint doesn't reveal whether a resume exists.
 *
 * user.profile.resume stores a link to this endpoint, so existing
 * "View resume" links keep working (the auth cookie travels on navigation).
 */
import express from "express";
import mongoose from "mongoose";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { User } from "../models/user.model.js";
import { RESUME_BUCKET, createSignedFileUrl } from "../utils/supabase.js";
import { canViewResume, resumeObjectPath } from "../utils/resumeFiles.js";
import logger from "../utils/logger.js";

const router = express.Router();

const SIGNED_URL_TTL_SECONDS = 60;

router.get("/:userId", isAuthenticated, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const notFound = () =>
      res.status(404).json({ success: false, message: "Resume not found" });
    if (!mongoose.isValidObjectId(userId)) return notFound();

    const viewer = await User.findById(req.id).select("role companyId").lean();
    if (!(await canViewResume(viewer, userId))) return notFound();

    const owner = await User.findById(userId)
      .select("profile.resume profile.resumePath profile.resumeOriginalName")
      .lean();
    const path = resumeObjectPath(owner?.profile);
    if (!path) return notFound();

    const url = await createSignedFileUrl(RESUME_BUCKET, path, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
      downloadName: owner.profile.resumeOriginalName || undefined,
    });
    logger.info("Resume link issued", {
      ownerId: userId,
      viewerRole: viewer.role,
    });
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
});

export default router;
