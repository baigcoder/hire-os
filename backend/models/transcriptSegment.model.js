import mongoose from "mongoose";

export const TRANSCRIPT_RETENTION_DAYS = 90;

/**
 * One transcribed stretch of speech from a live interview. Each side
 * records only its own microphone, so the speaker is known without
 * diarization. Audio is never stored — only this text, for 90 days.
 */
const transcriptSegmentSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    speaker: { type: String, enum: ["candidate", "recruiter"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chunkSeq: { type: Number, required: true },
    index: { type: Number, required: true }, // segment within the chunk
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    text: { type: String, required: true },
    avgLogprob: Number,
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

transcriptSegmentSchema.index({ interviewId: 1, startedAt: 1 });
// A retried upload of the same chunk doesn't duplicate text
transcriptSegmentSchema.index({ interviewId: 1, userId: 1, chunkSeq: 1, index: 1 }, { unique: true });
transcriptSegmentSchema.index({ createdAt: 1 }, { expireAfterSeconds: TRANSCRIPT_RETENTION_DAYS * 24 * 3600 });

export const TranscriptSegment = mongoose.model("TranscriptSegment", transcriptSegmentSchema);
