import mongoose from "mongoose";

/** A one-time email code, stored hashed. MongoDB deletes it when it expires. */
const emailCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const EmailCode = mongoose.model("EmailCode", emailCodeSchema);
