import crypto from "crypto";
import { EmailCode } from "../models/emailCode.model.js";

/**
 * Six-digit email codes: drawn from a secure random source, stored hashed in
 * MongoDB (so they survive restarts and work across servers), valid for
 * 10 minutes and for 5 tries.
 */

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashOf = (email, code) => crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");

/** Issues a new code for the email, replacing any earlier one. Returns the code to send. */
export const issueCode = async (rawEmail) => {
  const email = rawEmail.toLowerCase().trim();
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await EmailCode.findOneAndUpdate(
    { email },
    { hash: hashOf(email, code), attempts: 0, expiresAt: new Date(Date.now() + TTL_MS) },
    { upsert: true },
  );
  return code;
};

/** Checks a code. A correct code is used up; a wrong one counts against the limit. */
export const checkCode = async (rawEmail, code) => {
  const email = rawEmail.toLowerCase().trim();
  // Atomic: the attempt is claimed in the same operation that reads the code, so
  // parallel guesses can't all see attempts=0 and exceed the limit.
  const stored = await EmailCode.findOneAndUpdate(
    { email, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: false },
  );
  if (!stored) {
    const existing = await EmailCode.findOne({ email });
    if (existing && existing.expiresAt >= new Date()) {
      await existing.deleteOne();
      return { valid: false, message: "Too many tries. Request a new code." };
    }
    return { valid: false, message: "That code has expired. Request a new one." };
  }
  const given = Buffer.from(hashOf(email, String(code ?? "")));
  const expected = Buffer.from(stored.hash);
  if (!crypto.timingSafeEqual(given, expected)) {
    return { valid: false, message: "That code isn't right." };
  }
  await EmailCode.deleteOne({ _id: stored._id });
  return { valid: true };
};
