/**
 * Unified Job Matcher - Industrial Standard
 * Uses all 3 AI engines for best matching accuracy
 * Provides real-time, dynamic job recommendations
 */

import { callAI, parseAIJson } from './aiServiceV3.js';
import { findMatchingJobs as ragFindJobs } from './vectorStore.js';
import { generateEmbedding, cosineSimilarity } from './embeddingService.js';
import { Job } from '../models/job.model.js';

// ═══════════════════════════════════════════════════════════════
// SKILLS DATABASE FOR FAST MATCHING
// ═══════════════════════════════════════════════════════════════

const SKILL_CATEGORIES = {
    frontend: ['react', 'vue', 'angular', 'svelte', 'next.js', 'gatsby', 'html', 'css', 'javascript', 'typescript', 'tailwind'],
    backend: ['node', 'express', 'python', 'django', 'flask', 'java', 'spring', 'go', 'rust', 'php', 'laravel', 'graphql'],
    database: ['mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'firebase', 'supabase', 'dynamodb'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'serverless', 'lambda'],
    mobile: ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin'],
    data: ['python', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'machine learning', 'data science', 'sql']
};

// ═══════════════════════════════════════════════════════════════
// ENGINE 1: INSTANT KEYWORD MATCHING
// ═══════════════════════════════════════════════════════════════

const keywordMatch = (resumeSkills, jobRequirements) => {
    const resumeLower = resumeSkills.map(s => s.toLowerCase());
    const jobLower = jobRequirements.map(s => s.toLowerCase());

    const matched = resumeLower.filter(s => jobLower.some(j => j.includes(s) || s.includes(j)));
    const matchRate = jobLower.length > 0 ? (matched.length / jobLower.length) * 100 : 50;

    return {
        matchRate: Math.round(matchRate),
        matchedSkills: matched,
        missingSkills: jobLower.filter(s => !matched.includes(s))
    };
};

// ═══════════════════════════════════════════════════════════════
// ENGINE 2: SEMANTIC EMBEDDING MATCH
// ═══════════════════════════════════════════════════════════════

const semanticMatch = async (resumeText, jobDescription) => {
    try {
        const [resumeEmbed, jobEmbed] = await Promise.all([
            generateEmbedding(resumeText),
            generateEmbedding(jobDescription)
        ]);

        const similarity = cosineSimilarity(resumeEmbed, jobEmbed);
        return {
            similarity: Math.round(similarity * 100),
            method: 'embedding'
        };
    } catch (error) {
        return { similarity: 50, method: 'embedding-failed', error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// ENGINE 3: AI DEEP ANALYSIS
// ═══════════════════════════════════════════════════════════════

const aiMatch = async (resumeText, jobDescription, jobTitle) => {
    try {
        const result = await callAI([
            {
                role: 'system',
                content: `You are an expert job matcher. Analyze candidate-job fit with precision.`
            },
            {
                role: 'user',
                content: `Rate this candidate's fit for "${jobTitle}".

RESUME (summary):
${resumeText.substring(0, 3000)}

JOB:
${jobDescription.substring(0, 1500)}

Return ONLY JSON:
{
    "matchScore": <0-100>,
    "fitLevel": "<Excellent|Good|Partial|Poor>",
    "keyMatches": ["<top 3 matching qualifications>"],
    "gaps": ["<top 2 gaps>"],
    "recommendation": "<1 sentence>"
}`
            }
        ], {
            temperature: 0.3,
            maxTokens: 500,
            feature: 'JOB_MATCHING'
        });

        return {
            ...parseAIJson(result.content),
            method: 'ai',
            latency: result.latency
        };
    } catch (error) {
        return { matchScore: 50, method: 'ai-failed', error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// UNIFIED JOB MATCHER
// ═══════════════════════════════════════════════════════════════

/**
 * Match candidate to jobs using all engines
 * @param {Object} candidate - { resumeText, skills[], experience, preferences }
 * @param {Object[]} jobs - Array of job objects to match against
 * @param {Object} options - { limit, minScore, useAI, useEmbeddings }
 * @returns {Object[]} Ranked job matches with scores and insights
 */
export const matchJobsUnified = async (candidate, jobs, options = {}) => {
    const {
        limit = 20,
        minScore = 30,
        useAI = true,
        useEmbeddings = true,
        onProgress = null
    } = options;

    const startTime = Date.now();
    const results = [];

    // Process jobs in batches for performance
    const batchSize = 5;

    for (let i = 0; i < jobs.length && results.length < limit; i += batchSize) {
        const batch = jobs.slice(i, Math.min(i + batchSize, jobs.length));

        const batchResults = await Promise.all(batch.map(async (job) => {
            const scores = [];

            // Engine 1: Keyword match (instant)
            const keywordResult = keywordMatch(
                candidate.skills || [],
                job.requirements || job.skills || []
            );
            scores.push({ engine: 'keyword', score: keywordResult.matchRate });

            // Engine 2: Semantic match (if enabled)
            let semanticResult = { similarity: 50 };
            if (useEmbeddings && candidate.resumeText) {
                semanticResult = await semanticMatch(
                    candidate.resumeText,
                    job.description || ''
                );
                scores.push({ engine: 'semantic', score: semanticResult.similarity });
            }

            // Engine 3: AI match (if enabled, only for top candidates)
            let aiResult = null;
            const preliminaryScore = (keywordResult.matchRate + semanticResult.similarity) / 2;

            if (useAI && preliminaryScore >= 40 && candidate.resumeText) {
                aiResult = await aiMatch(
                    candidate.resumeText,
                    job.description || '',
                    job.title
                );
                scores.push({ engine: 'ai', score: aiResult.matchScore || 50 });
            }

            // Calculate consensus score (weighted)
            const weights = { keyword: 0.25, semantic: 0.35, ai: 0.40 };
            let weightedSum = 0;
            let totalWeight = 0;

            for (const s of scores) {
                const w = weights[s.engine] || 0.33;
                weightedSum += s.score * w;
                totalWeight += w;
            }

            const finalScore = Math.round(weightedSum / totalWeight);

            return {
                job: {
                    _id: job._id,
                    title: job.title,
                    company: job.company?.name || job.companyName,
                    location: job.location,
                    salary: job.salary,
                    jobType: job.jobType
                },
                match: {
                    score: finalScore,
                    confidence: scores.length >= 3 ? 'High' : scores.length === 2 ? 'Medium' : 'Low',
                    keywordMatch: keywordResult.matchRate,
                    semanticMatch: semanticResult.similarity,
                    aiMatch: aiResult?.matchScore || null,
                    matchedSkills: keywordResult.matchedSkills,
                    missingSkills: keywordResult.missingSkills.slice(0, 5),
                    recommendation: aiResult?.recommendation || null,
                    fitLevel: aiResult?.fitLevel || getFitLevel(finalScore)
                },
                engines: scores
            };
        }));

        // Filter and add to results
        for (const result of batchResults) {
            if (result.match.score >= minScore) {
                results.push(result);
            }
        }

        // Progress callback
        if (onProgress) {
            onProgress({
                processed: Math.min(i + batchSize, jobs.length),
                total: jobs.length,
                matchesFound: results.length
            });
        }
    }

    // Sort by score descending
    results.sort((a, b) => b.match.score - a.match.score);

    return {
        matches: results.slice(0, limit),
        meta: {
            totalJobs: jobs.length,
            matchesFound: results.length,
            latency: Date.now() - startTime,
            enginesUsed: ['keyword', useEmbeddings ? 'semantic' : null, useAI ? 'ai' : null].filter(Boolean)
        }
    };
};

const getFitLevel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Partial';
    return 'Poor';
};

// ═══════════════════════════════════════════════════════════════
// FIND MATCHING JOBS (with RAG context)
// ═══════════════════════════════════════════════════════════════

/**
 * Find jobs matching a candidate's profile
 * Uses vector store for fast semantic search + AI for refinement
 */
export const findJobsForCandidate = async (candidateProfile, options = {}) => {
    const { limit = 20, includeAI = true } = options;

    try {
        // Get all active jobs
        const jobs = await Job.find({ status: 'active' })
            .populate('company', 'name logo')
            .limit(100)
            .lean();

        // Match using unified engine
        const results = await matchJobsUnified(candidateProfile, jobs, {
            limit,
            useAI: includeAI,
            useEmbeddings: true
        });

        return results;
    } catch (error) {
        console.error('Job matching error:', error);
        return { matches: [], error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    matchJobsUnified,
    findJobsForCandidate,
    keywordMatch,
    semanticMatch,
    aiMatch
};
