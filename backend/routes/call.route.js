/**
 * One-to-one calls from Messages.
 *
 *   POST /                 { calleeId, type } start a call (contact rule applies)
 *   GET  /:id/config       participants: ICE servers (TURN) + private channel token
 *   POST /:id/accept|decline|end
 *
 * The server rings the callee on their private "user:<id>" topic, so a
 * client can't fake a call or a caller's name. The two browsers then signal
 * WebRTC on the private "call:<id>" topic only they hold a token for.
 */
import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { Call, CALL_RING_MS } from "../models/call.model.js";
import { User } from "../models/user.model.js";
import { canContact } from "../modules/messaging/contacts.js";
import { broadcastPrivate, mintRealtimeToken, privateChannelsEnabled, userTopic } from "../platform/realtime/index.js";
import { getIceServers } from "../platform/turn/index.js";

const router = express.Router();
router.use(isAuthenticated);

export const callTopic = (callId) => `call:${callId}`;

const startLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `call:${req.id}`,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many calls. Wait a minute." },
});

const notFound = (res) => res.status(404).json({ success: false, message: "Call not found" });
const otherParty = (call, userId) => (String(call.callerId) === String(userId) ? call.calleeId : call.callerId);
const isParty = (call, userId) => [String(call.callerId), String(call.calleeId)].includes(String(userId));

// A ringing call nobody answered in time is missed
const settle = async (call) => {
  if (call.status === "ringing" && Date.now() - call.createdAt.getTime() > CALL_RING_MS) {
    call.status = "missed";
    call.endedAt = new Date();
    await call.save();
  }
  return call;
};

const configFor = async (call, userId) => {
  const topic = callTopic(call._id);
  const minted = mintRealtimeToken({ userId, topics: [topic, userTopic(userId)] });
  return {
    success: true,
    call: { _id: String(call._id), type: call.type, status: call.status, callerId: String(call.callerId), calleeId: String(call.calleeId) },
    topic,
    ice: await getIceServers({ userId }),
    realtime: minted ? { privateChannels: true, ...minted } : { privateChannels: false, topics: [topic] },
    refreshAfterSeconds: privateChannelsEnabled() ? 10 * 60 : null,
  };
};

const loadCall = async (req, res) => {
  const call = mongoose.isValidObjectId(req.params.id) ? await Call.findById(req.params.id) : null;
  if (!call || !isParty(call, req.id)) {
    notFound(res);
    return null;
  }
  return settle(call);
};

router.post("/", startLimiter, async (req, res, next) => {
  try {
    const { calleeId } = req.body ?? {};
    const type = req.body?.type === "audio" ? "audio" : "video";
    if (!mongoose.isValidObjectId(calleeId) || !(await canContact(req.id, calleeId))) {
      return res.status(404).json({ success: false, message: "You can't call this person" });
    }
    const caller = await User.findById(req.id).select("fullname role profile.profilePhoto").lean();
    const call = await Call.create({ callerId: req.id, calleeId, type });
    await broadcastPrivate(userTopic(calleeId), "incoming-call", {
      callId: String(call._id),
      type,
      caller: { _id: String(caller._id), fullname: caller.fullname, role: caller.role, photo: caller.profile?.profilePhoto || null },
      ringUntil: new Date(call.createdAt.getTime() + CALL_RING_MS).toISOString(),
    });
    res.status(201).set("Cache-Control", "no-store").json(await configFor(call, req.id));
  } catch (error) {
    next(error);
  }
});

router.get("/:id/config", async (req, res, next) => {
  try {
    const call = await loadCall(req, res);
    if (!call) return;
    if (!["ringing", "accepted"].includes(call.status)) {
      return res.status(409).json({ success: false, code: "CALL_OVER", status: call.status, message: "This call has ended" });
    }
    res.set("Cache-Control", "no-store").json(await configFor(call, req.id));
  } catch (error) {
    next(error);
  }
});

const transition = (action) => async (req, res, next) => {
  try {
    let call = await loadCall(req, res);
    if (!call) return;
    const isCallee = String(call.calleeId) === String(req.id);
    if (action === "accept" || action === "decline") {
      if (!isCallee) return notFound(res);
      if (call.status !== "ringing") {
        return res.status(409).json({ success: false, code: "CALL_OVER", status: call.status, message: "This call is no longer ringing" });
      }
      // Conditional update: a concurrent hang-up and answer can't both win
      const now = new Date();
      const next = await Call.findOneAndUpdate(
        { _id: call._id, calleeId: req.id, status: "ringing" },
        { $set: action === "accept" ? { status: "accepted", answeredAt: now } : { status: "declined", endedAt: now } },
        { new: true },
      );
      if (!next) {
        return res.status(409).json({ success: false, code: "CALL_OVER", message: "This call is no longer ringing" });
      }
      call = next;
    } else {
      // The caller hanging up before an answer makes it a missed call for the callee
      const now = new Date();
      call =
        (await Call.findOneAndUpdate({ _id: call._id, status: "ringing" }, { $set: { status: "missed", endedAt: now } }, { new: true })) ||
        (await Call.findOneAndUpdate({ _id: call._id, status: "accepted" }, { $set: { status: "ended", endedAt: now } }, { new: true })) ||
        call;
    }
    await broadcastPrivate(userTopic(otherParty(call, req.id)), "call-update", { callId: String(call._id), status: call.status });
    if (action === "accept") return res.set("Cache-Control", "no-store").json(await configFor(call, req.id));
    res.json({ success: true, call: { _id: String(call._id), status: call.status } });
  } catch (error) {
    next(error);
  }
};

router.post("/:id/accept", transition("accept"));
router.post("/:id/decline", transition("decline"));
router.post("/:id/end", transition("end"));

export default router;
