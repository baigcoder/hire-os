import mongoose from "mongoose";

/**
 * One vector per indexed document (platform/embeddings).
 *   kind "job"        refId = jobId
 *   kind "resume"     refId = userId (their latest analyzed resume)
 *   kind "applicant"  refId = applicationId (blind screening profile)
 * `meta` carries the fields searches filter on.
 */
const embeddingSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["job", "resume", "applicant"],
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    model: { type: String, required: true },
    dimensions: { type: Number, required: true },
    vector: { type: [Number], required: true },
    textHash: { type: String, required: true },
    meta: {
      userId: mongoose.Schema.Types.ObjectId,
      jobId: mongoose.Schema.Types.ObjectId,
      companyId: mongoose.Schema.Types.ObjectId,
      createdBy: mongoose.Schema.Types.ObjectId,
      skills: [String],
    },
  },
  { timestamps: true, collection: "embeddings" },
);

embeddingSchema.index({ kind: 1, refId: 1 }, { unique: true });
embeddingSchema.index({ kind: 1, "meta.jobId": 1 });

export const Embedding = mongoose.model("Embedding", embeddingSchema);
