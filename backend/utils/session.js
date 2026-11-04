import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";

/**
 * Sessions: a 15-minute access token and a 7-day refresh token, both in
 * httpOnly cookies the page's scripts can't read. The refresh token is tied
 * to an entry in user.activeSessions, so a session can be ended server-side.
 */

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 10;
// Sent only to /api/v1/user routes: refresh and logout read it
export const REFRESH_PATH = "/api/v1/user";

const cookieBase = { httpOnly: true, secure: true, sameSite: "none" };
export const accessCookie = { ...cookieBase, maxAge: ACCESS_MS, path: "/" };
export const refreshCookie = { ...cookieBase, maxAge: REFRESH_MS, path: REFRESH_PATH };

export const signAccessToken = (userId) =>
  jwt.sign({ userId, type: "access" }, process.env.SECRET_KEY, { expiresIn: "15m" });

export const signRefreshToken = (userId, sessionId) =>
  jwt.sign({ userId, sessionId, type: "refresh" }, process.env.SECRET_KEY, { expiresIn: "7d" });

export const newSessionId = () => crypto.randomBytes(32).toString("hex");

/** Starts a session: records it, sets both cookies, and returns the access token. */
export const startSession = async (res, userId, req) => {
  const sessionId = newSessionId();
  const refreshToken = signRefreshToken(userId, sessionId);
  const session = {
    sessionId,
    refreshToken,
    userAgent: req?.headers?.["user-agent"],
    ipAddress: req?.ip,
    expiresAt: new Date(Date.now() + REFRESH_MS),
  };
  await User.updateOne({ _id: userId }, { $pull: { activeSessions: { expiresAt: { $lt: new Date() } } } });
  await User.updateOne({ _id: userId }, { $push: { activeSessions: { $each: [session], $slice: -MAX_SESSIONS } } });

  const accessToken = signAccessToken(userId);
  res.cookie("token", accessToken, accessCookie).cookie("refreshToken", refreshToken, refreshCookie);
  return accessToken;
};

/** Clears both cookies (each must be cleared on the path it was set on). */
export const clearSessionCookies = (res) =>
  res
    .cookie("token", "", { ...accessCookie, maxAge: 0 })
    .cookie("refreshToken", "", { ...refreshCookie, maxAge: 0 });

/** Ends every session for a user, e.g. after a password change or reset. */
export const endAllSessions = (userId) => User.updateOne({ _id: userId }, { $set: { activeSessions: [] } });

/** A token that may be used to call the API: never a refresh token. Returns the payload or throws. */
export const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, process.env.SECRET_KEY);
  if (decoded?.type === "refresh") throw new jwt.JsonWebTokenError("refresh token used as access token");
  return decoded;
};

/** The access token from a raw Cookie header (socket handshakes). */
export const tokenFromCookieHeader = (header = "") =>
  header
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === "token")?.[1] || null;

/**
 * A recruiter works under a company whose owner holds a live subscription.
 * Returns why one can't act right now, or null.
 */
export const recruiterAccessProblem = async (user) => {
  if (user?.role !== "recruiter") return null;
  const company = user.companyId ? await Company.findById(user.companyId).select("subscription").lean() : null;
  if (!company) {
    return { code: "NO_COMPANY", message: "This recruiter account isn't part of a company. Ask the company owner to invite you." };
  }
  const sub = company.subscription ?? {};
  // A cancelled plan still runs until the end of the period already paid for
  const live = ["active", "trial"].includes(sub.status) || (sub.status === "cancelled" && new Date(sub.endDate) > new Date());
  return live
    ? null
    : { code: "COMPANY_SUBSCRIPTION_INACTIVE", subscriptionExpired: true, message: "Your company's subscription isn't active. Ask the company owner to renew it." };
};
