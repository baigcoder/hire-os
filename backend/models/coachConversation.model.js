import mongoose from "mongoose";

/**
 * Resume Coach chat for one candidate and one resume report. Only final
 * user/assistant turns are stored (tool calls are summarized in `trace`),
 * capped to the most recent messages.
 */
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    trace: [{ _id: false, tool: String, summary: String }],
    model: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const coachConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeReport",
      required: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true },
);

coachConversationSchema.index({ userId: 1, reportId: 1 }, { unique: true });

export const CoachConversation = mongoose.model(
  "CoachConversation",
  coachConversationSchema,
);
