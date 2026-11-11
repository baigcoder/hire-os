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
import { Interview } from "../models/interview.model.js";
import { User } from "../models/user.model.js";
import { listContacts } from "../modules/messaging/contacts.js";
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

// Online status without a public channel: an open tab sends a heartbeat, and each user
// can only ask about the people they are allowed to contact (their own team, or the
// candidates/recruiters of their interviews). Nobody can list all online users.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

router.post("/heartbeat", async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.id }, { $set: { lastSeenAt: new Date() } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/presence", async (req, res, next) => {
  try {
    const contacts = await listContacts(req.id);
    const ids = contacts.map((c) => c._id);
    const online = ids.length
      ? await User.find({ _id: { $in: ids }, lastSeenAt: { $gt: new Date(Date.now() - ONLINE_WINDOW_MS) } }).select("_id").lean()
      : [];
    res.set("Cache-Control", "no-store").json({ success: true, online: online.map((u) => String(u._id)) });
  } catch (error) {
    next(error);
  }
});

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
    if (role === "candidate") {
      const { mcqTest } = (await Interview.findById(interviewId).select("mcqTest.enabled mcqTest.status").lean()) ?? {};
      if (mcqTest?.enabled && mcqTest.status !== "passed") {
        return res.status(403).json({ success: false, code: "MCQ_REQUIRED", message: "Pass the MCQ test to join the video interview" });
      }
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
