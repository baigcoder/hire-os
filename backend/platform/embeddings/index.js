/**
 * Embeddings + vector search.
 *
 *   import { embedDocuments, embedQuery, upsertEmbedding, searchSimilar }
 *     from "../platform/embeddings/index.js";
 *
 * Embeddings come from Gemini (`gemini-embedding-2`, 768 dims; Groq has no
 * embedding models). Vectors are stored in the `embeddings` collection.
 * Search backends:
 *   - "exact" (default): cosine similarity in Node over the filtered
 *     vectors. Works on any MongoDB, including tests; fine for thousands
 *     of documents per kind.
 *   - "atlas" (VECTOR_SEARCH=atlas): MongoDB Atlas $vectorSearch using the
 *     index in docs/atlas/embeddings-vector-index.json.
 */
import crypto from "crypto";
import mongoose from "mongoose";
import { Embedding } from "../../models/embedding.model.js";
import { AiRun } from "../../models/aiRun.model.js";
import { EMBEDDING_MODEL, GEMINI_API_BASE } from "../../config/aiModels.js";
import logger from "../../utils/logger.js";

const BATCH_SIZE = 50;
const MAX_INPUT_CHARS = 8000;
const EXACT_SEARCH_LIMIT = 5000;

export class EmbeddingsUnavailableError extends Error {
  constructor(message = "Embeddings are not configured (GEMINI_API_KEY)") {
    super(message);
    this.name = "EmbeddingsUnavailableError";
  }
}

export const hashText = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

const normalize = (vector) => {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
};

export const cosine = (a, b) => {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // inputs are unit vectors
};

const recordRun = (run) => {
  if (mongoose.connection.readyState !== 1) return;
  AiRun.create(run).catch(() => {});
};

/** Default embedder: Gemini batchEmbedContents. texts → unit vectors. */
const geminiEmbed = async (texts) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new EmbeddingsUnavailableError();
  const model = `models/${EMBEDDING_MODEL.ID}`;
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const started = Date.now();
    const response = await fetch(
      `${GEMINI_API_BASE}/${EMBEDDING_MODEL.ID}:batchEmbedContents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model,
            content: { parts: [{ text: text.slice(0, MAX_INPUT_CHARS) }] },
            output_dimensionality: EMBEDDING_MODEL.DIMENSIONS,
          })),
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    const ok = response.ok && Array.isArray(data.embeddings);
    recordRun({
      task: "embed.batch",
      status: ok ? "success" : "error",
      provider: "gemini",
      model: EMBEDDING_MODEL.ID,
      latencyMs: Date.now() - started,
      error: ok ? undefined : data.error?.message || `HTTP ${response.status}`,
    });
    if (!ok) {
      throw new Error(
        `Embedding request failed: ${data.error?.message || response.status}`,
      );
    }
    vectors.push(...data.embeddings.map((e) => normalize(e.values)));
  }
  return vectors;
};

let embedder = geminiEmbed;

/** Test seam: replace the embedder (null restores Gemini). */
export const setEmbedderForTests = (fn) => {
  embedder = fn ?? geminiEmbed;
};

export const embeddingsConfigured = () =>
  embedder !== geminiEmbed || Boolean(process.env.GEMINI_API_KEY);

/** gemini-embedding-2 takes task hints as text prefixes. */
export const embedDocuments = (docs) =>
  embedder(
    docs.map(({ title, text }) => `title: ${title || "none"} | text: ${text}`),
  );

export const embedQuery = async (query) =>
  (await embedder([`task: search result | query: ${query}`]))[0];

/**
 * Store a document's vector. Skips the API call when the text is unchanged
 * (same hash and model), so re-indexing is cheap.
 * @returns {Promise<"created"|"updated"|"unchanged">}
 */
export const upsertEmbedding = async ({
  kind,
  refId,
  title,
  text,
  meta = {},
}) => {
  const textHash = hashText(`${EMBEDDING_MODEL.ID}:${title}:${text}`);
  const existing = await Embedding.findOne({ kind, refId })
    .select("textHash")
    .lean();
  if (existing?.textHash === textHash) {
    await Embedding.updateOne({ kind, refId }, { $set: { meta } });
    return "unchanged";
  }
  const [vector] = await embedDocuments([{ title, text }]);
  await Embedding.updateOne(
    { kind, refId },
    {
      $set: {
        model: EMBEDDING_MODEL.ID,
        dimensions: vector.length,
        vector,
        textHash,
        meta,
      },
    },
    { upsert: true },
  );
  return existing ? "updated" : "created";
};

export const deleteEmbedding = (kind, refId) =>
  Embedding.deleteOne({ kind, refId });

export const getEmbedding = (kind, refId) =>
  Embedding.findOne({ kind, refId }).select("vector meta").lean();

/**
 * Nearest documents of `kind` to `vector`.
 * @param {object} options
 * @param {Record<string, any>} [options.filter]  extra conditions on meta
 *   fields, e.g. { "meta.jobId": { $in: [...] } }
 * @param {string[]} [options.excludeRefIds]
 * @returns {Promise<Array<{ refId: string, score: number, meta: object }>>}
 */
export const searchSimilar = async ({
  kind,
  vector,
  filter = {},
  excludeRefIds = [],
  limit = 10,
}) => {
  const exclude = excludeRefIds.map(
    (id) => new mongoose.Types.ObjectId(String(id)),
  );
  const match = {
    kind,
    model: EMBEDDING_MODEL.ID,
    ...filter,
    ...(exclude.length && { refId: { $nin: exclude } }),
  };

  if (process.env.VECTOR_SEARCH === "atlas") {
    const rows = await Embedding.aggregate([
      {
        $vectorSearch: {
          index: process.env.ATLAS_VECTOR_INDEX || "embeddings_vector",
          path: "vector",
          queryVector: vector,
          numCandidates: Math.max(100, limit * 20),
          limit,
          filter: match,
        },
      },
      {
        $project: { refId: 1, meta: 1, score: { $meta: "vectorSearchScore" } },
      },
    ]);
    return rows.map((r) => ({
      refId: String(r.refId),
      score: r.score,
      meta: r.meta,
    }));
  }

  const candidates = await Embedding.find(match)
    .select("refId vector meta")
    .limit(EXACT_SEARCH_LIMIT)
    .lean();
  if (candidates.length === EXACT_SEARCH_LIMIT) {
    logger.warn(
      "Exact vector search hit its cap; consider VECTOR_SEARCH=atlas",
      {
        kind,
      },
    );
  }
  return candidates
    .map((c) => ({
      refId: String(c.refId),
      score: cosine(vector, c.vector),
      meta: c.meta,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
