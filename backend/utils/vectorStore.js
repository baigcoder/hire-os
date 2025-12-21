/**
 * Vector Store Service - RAG Storage
 * Stores and retrieves embeddings for semantic search
 * Supports: In-memory (fast) + MongoDB (persistent)
 */

import {
  generateEmbedding,
  cosineSimilarity,
  prepareResumeText,
  prepareJobText,
  prepareInterviewText,
  EMBEDDING_DIMENSIONS,
} from "./embeddingService.js";

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY VECTOR STORE (Fast, for real-time operations)
// ═══════════════════════════════════════════════════════════════

const vectorStores = {
  resumes: new Map(), // candidateId -> {embedding, metadata, createdAt}
  jobs: new Map(), // jobId -> {embedding, metadata, createdAt}
  interviews: new Map(), // interviewId -> {embedding, metadata, createdAt}
  candidates: new Map(), // candidateId -> {embedding, metadata, history}
};

// Store statistics
const stats = {
  resumes: { hits: 0, misses: 0 },
  jobs: { hits: 0, misses: 0 },
  interviews: { hits: 0, misses: 0 },
};

// ═══════════════════════════════════════════════════════════════
// RESUME VECTORS
// ═══════════════════════════════════════════════════════════════

/**
 * Add resume to vector store
 */
export const addResumeVector = async (candidateId, resumeData) => {
  const text = prepareResumeText(resumeData);
  const embedding = await generateEmbedding(text);

  vectorStores.resumes.set(candidateId, {
    embedding,
    metadata: {
      candidateId,
      name: resumeData.name,
      title: resumeData.title,
      skills: resumeData.skills || [],
      experience: resumeData.experience,
      addedAt: new Date(),
    },
    createdAt: new Date(),
  });

  console.log(`📄 Added resume vector for ${candidateId}`);
  return embedding;
};

/**
 * Find similar resumes to a job description
 */
export const findSimilarResumes = async (jobDescription, topK = 10) => {
  const jobEmbedding = await generateEmbedding(jobDescription);

  const results = [];
  for (const [id, data] of vectorStores.resumes.entries()) {
    const score = cosineSimilarity(jobEmbedding, data.embedding);
    results.push({
      candidateId: id,
      score,
      metadata: data.metadata,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  stats.resumes.hits++;

  console.log(`🔍 Found ${Math.min(topK, results.length)} similar resumes`);
  return results.slice(0, topK);
};

/**
 * Find similar resumes to another resume (for "candidates like this")
 */
export const findSimilarCandidates = async (candidateId, topK = 5) => {
  const sourceData = vectorStores.resumes.get(candidateId);
  if (!sourceData) {
    stats.resumes.misses++;
    return [];
  }

  const results = [];
  for (const [id, data] of vectorStores.resumes.entries()) {
    if (id === candidateId) continue; // Skip self

    const score = cosineSimilarity(sourceData.embedding, data.embedding);
    results.push({
      candidateId: id,
      score,
      metadata: data.metadata,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
};

// ═══════════════════════════════════════════════════════════════
// JOB VECTORS
// ═══════════════════════════════════════════════════════════════

/**
 * Add job to vector store
 */
export const addJobVector = async (jobId, jobData) => {
  const text = prepareJobText(jobData);
  const embedding = await generateEmbedding(text);

  vectorStores.jobs.set(jobId, {
    embedding,
    metadata: {
      jobId,
      title: jobData.title,
      company: jobData.company,
      skills: jobData.skills || [],
      addedAt: new Date(),
    },
    createdAt: new Date(),
  });

  console.log(`💼 Added job vector for ${jobId}`);
  return embedding;
};

/**
 * Find similar jobs to a resume
 */
export const findMatchingJobs = async (resumeText, topK = 10) => {
  const resumeEmbedding = await generateEmbedding(resumeText);

  const results = [];
  for (const [id, data] of vectorStores.jobs.entries()) {
    const score = cosineSimilarity(resumeEmbedding, data.embedding);
    results.push({
      jobId: id,
      score,
      matchPercentage: Math.round(score * 100),
      metadata: data.metadata,
    });
  }

  results.sort((a, b) => b.score - a.score);
  stats.jobs.hits++;

  console.log(`🔍 Found ${Math.min(topK, results.length)} matching jobs`);
  return results.slice(0, topK);
};

/**
 * Find similar jobs (for "jobs like this")
 */
export const findSimilarJobs = async (jobId, topK = 5) => {
  const sourceData = vectorStores.jobs.get(jobId);
  if (!sourceData) {
    stats.jobs.misses++;
    return [];
  }

  const results = [];
  for (const [id, data] of vectorStores.jobs.entries()) {
    if (id === jobId) continue;

    const score = cosineSimilarity(sourceData.embedding, data.embedding);
    results.push({
      jobId: id,
      score,
      metadata: data.metadata,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
};

// ═══════════════════════════════════════════════════════════════
// INTERVIEW VECTORS
// ═══════════════════════════════════════════════════════════════

/**
 * Add interview transcript to vector store
 */
export const addInterviewVector = async (interviewId, interviewData) => {
  const text = prepareInterviewText(interviewData);
  const embedding = await generateEmbedding(text);

  vectorStores.interviews.set(interviewId, {
    embedding,
    metadata: {
      interviewId,
      candidateName: interviewData.candidateName,
      jobTitle: interviewData.jobTitle,
      score: interviewData.score,
      outcome: interviewData.outcome,
      addedAt: new Date(),
    },
    createdAt: new Date(),
  });

  console.log(`🎤 Added interview vector for ${interviewId}`);
  return embedding;
};

/**
 * Find similar interviews (for pattern matching)
 */
export const findSimilarInterviews = async (interviewId, topK = 5) => {
  const sourceData = vectorStores.interviews.get(interviewId);
  if (!sourceData) {
    stats.interviews.misses++;
    return [];
  }

  const results = [];
  for (const [id, data] of vectorStores.interviews.entries()) {
    if (id === interviewId) continue;

    const score = cosineSimilarity(sourceData.embedding, data.embedding);
    results.push({
      interviewId: id,
      score,
      metadata: data.metadata,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
};

// ═══════════════════════════════════════════════════════════════
// RAG CONTEXT RETRIEVAL
// ═══════════════════════════════════════════════════════════════

/**
 * Get RAG context for resume analysis
 * Returns similar past candidates and their outcomes
 */
export const getResumeAnalysisContext = async (resumeText, jobDescription) => {
  const context = {
    similarCandidates: [],
    relevantJobs: [],
    insights: [],
  };

  // Find similar past candidates
  const resumeEmbedding = await generateEmbedding(resumeText);

  for (const [id, data] of vectorStores.resumes.entries()) {
    const score = cosineSimilarity(resumeEmbedding, data.embedding);
    if (score > 0.7) {
      // High similarity threshold
      context.similarCandidates.push({
        score,
        ...data.metadata,
      });
    }
  }

  // Sort by score
  context.similarCandidates.sort((a, b) => b.score - a.score);
  context.similarCandidates = context.similarCandidates.slice(0, 3);

  // Generate insights
  if (context.similarCandidates.length > 0) {
    const avgScore =
      context.similarCandidates.reduce((s, c) => s + c.score, 0) /
      context.similarCandidates.length;
    context.insights.push(
      `This candidate is ${Math.round(avgScore * 100)}% similar to ${context.similarCandidates.length} past candidates`,
    );
  }

  return context;
};

/**
 * Get RAG context for CEO report
 * Returns historical hiring patterns for this role
 */
export const getCEOReportContext = async (jobTitle, candidateName) => {
  const context = {
    pastHires: [],
    roleHistory: [],
    benchmarks: {},
  };

  // Find past interviews for similar roles
  const queryEmbedding = await generateEmbedding(
    `${jobTitle} interview hiring`,
  );

  for (const [id, data] of vectorStores.interviews.entries()) {
    const score = cosineSimilarity(queryEmbedding, data.embedding);
    if (score > 0.6 && data.metadata.outcome) {
      context.pastHires.push({
        score,
        ...data.metadata,
      });
    }
  }

  // Calculate benchmarks
  const hired = context.pastHires.filter((h) => h.outcome === "hired");
  if (hired.length > 0) {
    context.benchmarks.hireRate = Math.round(
      (hired.length / context.pastHires.length) * 100,
    );
    context.benchmarks.avgScore = Math.round(
      (hired.reduce((s, h) => s + (h.score || 0), 0) / hired.length) * 100,
    );
  }

  return context;
};

// ═══════════════════════════════════════════════════════════════
// STORE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get store statistics
 */
export const getVectorStoreStats = () => ({
  resumes: {
    count: vectorStores.resumes.size,
    ...stats.resumes,
  },
  jobs: {
    count: vectorStores.jobs.size,
    ...stats.jobs,
  },
  interviews: {
    count: vectorStores.interviews.size,
    ...stats.interviews,
  },
  totalVectors:
    vectorStores.resumes.size +
    vectorStores.jobs.size +
    vectorStores.interviews.size,
  memoryEstimate: `${Math.round(((vectorStores.resumes.size + vectorStores.jobs.size + vectorStores.interviews.size) * EMBEDDING_DIMENSIONS * 4) / 1024)} KB`,
});

/**
 * Clear a specific store
 */
export const clearStore = (storeName) => {
  if (vectorStores[storeName]) {
    vectorStores[storeName].clear();
    console.log(`🗑️ Cleared ${storeName} store`);
  }
};

/**
 * Clear all stores
 */
export const clearAllStores = () => {
  Object.keys(vectorStores).forEach((key) => {
    vectorStores[key].clear();
  });
  console.log("🗑️ Cleared all vector stores");
};

/**
 * Remove old vectors (older than TTL)
 */
export const pruneOldVectors = (ttlHours = 168) => {
  // Default 7 days
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  let pruned = 0;

  for (const store of Object.values(vectorStores)) {
    for (const [key, value] of store.entries()) {
      if (value.createdAt.getTime() < cutoff) {
        store.delete(key);
        pruned++;
      }
    }
  }

  console.log(`🧹 Pruned ${pruned} old vectors`);
  return pruned;
};

// Auto-prune every 6 hours
setInterval(() => pruneOldVectors(168), 6 * 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
  // Resume operations
  addResumeVector,
  findSimilarResumes,
  findSimilarCandidates,

  // Job operations
  addJobVector,
  findMatchingJobs,
  findSimilarJobs,

  // Interview operations
  addInterviewVector,
  findSimilarInterviews,

  // RAG context
  getResumeAnalysisContext,
  getCEOReportContext,

  // Management
  getVectorStoreStats,
  clearStore,
  clearAllStores,
  pruneOldVectors,
};
