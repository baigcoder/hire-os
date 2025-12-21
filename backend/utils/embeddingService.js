/**
 * Embedding Service - RAG Foundation
 * Generates embeddings for semantic search using ChatAnywhere API
 * Supports: Resumes, Job Descriptions, Interview Transcripts
 */

// API Configuration
const EMBEDDING_API_URL = "https://api.chatanywhere.tech/v1/embeddings";
const getAPIKey = () => process.env.GPT5_API_KEY;

// Embedding model - text-embedding-3-small is fast and accurate
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export const generateEmbedding = async (text) => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    throw new Error("GPT5_API_KEY required for embeddings");
  }

  // Truncate text to max tokens (~8000 tokens ≈ 32000 chars)
  const truncatedText = text.substring(0, 30000);

  try {
    const response = await fetch(EMBEDDING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedText,
        encoding_format: "float",
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Embedding API error");
    }

    const embedding = data.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error("No embedding in response");
    }

    console.log(`✅ Generated embedding (${embedding.length} dimensions)`);
    return embedding;
  } catch (error) {
    console.error("❌ Embedding error:", error.message);
    throw error;
  }
};

/**
 * Generate embeddings for multiple texts (batch)
 * @param {string[]} texts - Array of texts
 * @returns {Promise<number[][]>} Array of embeddings
 */
export const generateBatchEmbeddings = async (texts) => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    throw new Error("GPT5_API_KEY required for embeddings");
  }

  // Truncate each text
  const truncatedTexts = texts.map((t) => t.substring(0, 30000));

  try {
    const response = await fetch(EMBEDDING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedTexts,
        encoding_format: "float",
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Embedding API error");
    }

    const embeddings = data.data?.map((d) => d.embedding);
    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error("Invalid batch embedding response");
    }

    console.log(`✅ Generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error("❌ Batch embedding error:", error.message);
    throw error;
  }
};

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} a - First embedding
 * @param {number[]} b - Second embedding
 * @returns {number} Similarity score (0-1)
 */
export const cosineSimilarity = (a, b) => {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Find most similar items from a list
 * @param {number[]} queryEmbedding - Query embedding
 * @param {Array<{embedding: number[], id: string, metadata: Object}>} items - Items to search
 * @param {number} topK - Number of results
 * @returns {Array<{id: string, score: number, metadata: Object}>}
 */
export const findSimilar = (queryEmbedding, items, topK = 5) => {
  const scored = items.map((item) => ({
    id: item.id,
    score: cosineSimilarity(queryEmbedding, item.embedding),
    metadata: item.metadata,
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
};

// ═══════════════════════════════════════════════════════════════
// TEXT PROCESSING FOR BETTER EMBEDDINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Prepare resume text for embedding
 * Extracts key information for better semantic matching
 */
export const prepareResumeText = (resumeData) => {
  const parts = [];

  if (resumeData.name) parts.push(`Candidate: ${resumeData.name}`);
  if (resumeData.title) parts.push(`Title: ${resumeData.title}`);
  if (resumeData.skills?.length)
    parts.push(`Skills: ${resumeData.skills.join(", ")}`);
  if (resumeData.experience) parts.push(`Experience: ${resumeData.experience}`);
  if (resumeData.education) parts.push(`Education: ${resumeData.education}`);
  if (resumeData.summary) parts.push(`Summary: ${resumeData.summary}`);
  if (resumeData.rawText)
    parts.push(`Full Resume: ${resumeData.rawText.substring(0, 8000)}`);

  return parts.join("\n\n");
};

/**
 * Prepare job description for embedding
 */
export const prepareJobText = (jobData) => {
  const parts = [];

  if (jobData.title) parts.push(`Job Title: ${jobData.title}`);
  if (jobData.company) parts.push(`Company: ${jobData.company}`);
  if (jobData.description) parts.push(`Description: ${jobData.description}`);
  if (jobData.requirements?.length)
    parts.push(`Requirements: ${jobData.requirements.join(", ")}`);
  if (jobData.skills?.length)
    parts.push(`Skills: ${jobData.skills.join(", ")}`);
  if (jobData.experience) parts.push(`Experience: ${jobData.experience}`);
  if (jobData.salary) parts.push(`Salary: ${jobData.salary}`);

  return parts.join("\n\n");
};

/**
 * Prepare interview transcript for embedding
 */
export const prepareInterviewText = (interviewData) => {
  const parts = [];

  if (interviewData.candidateName)
    parts.push(`Candidate: ${interviewData.candidateName}`);
  if (interviewData.jobTitle) parts.push(`Position: ${interviewData.jobTitle}`);
  if (interviewData.questions?.length) {
    const qaText = interviewData.questions
      .map(
        (q, i) =>
          `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer || "No answer"}`,
      )
      .join("\n\n");
    parts.push(`Interview:\n${qaText}`);
  }
  if (interviewData.notes) parts.push(`Notes: ${interviewData.notes}`);

  return parts.join("\n\n");
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  findSimilar,
  prepareResumeText,
  prepareJobText,
  prepareInterviewText,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
};
