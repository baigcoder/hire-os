/**
 * Connection Model
 * For professional networking between users
 */

import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    // User who sent the connection request
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // User who receives the request
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Connection status
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
      index: true,
    },
    // Optional message with the request
    message: {
      type: String,
      maxlength: 500,
    },
    // When the connection was accepted
    connectedAt: {
      type: Date,
    },
    // How they might know each other
    connectionType: {
      type: String,
      enum: ["colleague", "classmate", "recruiter", "mentor", "other"],
      default: "other",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for faster lookups
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });
connectionSchema.index({ status: 1, createdAt: -1 });

// Static method to check if connection exists
connectionSchema.statics.connectionExists = async function (userId1, userId2) {
  return await this.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 },
    ],
  });
};

// Static method to get all connections for a user
connectionSchema.statics.getConnections = async function (
  userId,
  status = "accepted",
) {
  return await this.find({
    $or: [
      { requester: userId, status },
      { recipient: userId, status },
    ],
  }).populate(
    "requester recipient",
    "fullname email profile.profilePhoto profile.bio profile.skills",
  );
};

export const Connection = mongoose.model("Connection", connectionSchema);
