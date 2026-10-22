/**
 * Realtime + call configuration.
 *
 *   GET /token                              private topic "user:<me>" (notifications)
 *   GET /interviews/:interviewId/call-config participants only: ICE servers with
 *                                           short-lived TURN credentials, and a token
 *                                           for the private "interview:<id>" channel
 */
import express from "express";
import mongoose from "mongoose";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { resolveAccess } from "../modules/integrity/service.js";
import {
  mintRealtimeToken,
  privateChannelsEnabled,
  interviewTopic,
  userTopic,
} from "../platform/realtime/index.js";
import { getIceServers } from "../platform/turn/index.js";

const router = express.Router();
router.use(isAuthenticated);

const realtimeFor = (userId, topics) => {
  const minted = mintRealtimeToken({ userId, topics });
  return minted ? { privateChannels: true, ...minted } : { privateChannels: false, topics };
};

router.get("/token", (req, res) => {
  res.set("Cache-Control", "no-store").json({
    success: true,
    realtime: realtimeFor(req.id, [userTopic(req.id)]),
  });
});

router.get("/interviews/:interviewId/call-config", async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const notFound = () => res.status(404).json({ success: false, message: "Interview not found" });
    if (!mongoose.isValidObjectId(interviewId)) return notFound();
    const { interview, role } = await resolveAccess(interviewId, req.id);
    if (!role) return notFound();
    if (interview.videoInterview?.status === "cancelled") {
      return res.status(409).json({ success: false, code: "INTERVIEW_CANCELLED", message: "This interview was cancelled" });
    }
    const topic = interviewTopic(interviewId);
    const ice = await getIceServers({ userId: req.id });
    res.set("Cache-Control", "no-store").json({
      success: true,
      role,
      topic,
      ice,
      realtime: realtimeFor(req.id, [topic, userTopic(req.id)]),
      // Refresh before whichever expires first
      refreshAfterSeconds: privateChannelsEnabled() ? 10 * 60 : null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
