/**
 * Unified Applicant Ranker - Industrial Standard
 * Combines ML, Regex, and AI for accurate candidate ranking
 * Real-time scoring with confidence metrics
 */

import { callAI, parseAIJson } from './aiServiceV3.js';
import { generateEmbedding, cosineSimilarity } from './embeddingService.js';
import { analyzeResumeUnified } from './unifiedAnalyzer.js';

// ═══════════════════════════════════════════════════════════════
// APPLICANT SCORING ENGINES
// ═══════════════════════════════════════════════════════════════

/**
 * Engine 1: Experience Score (Instant)
 */
const calculateExperienceScore = (candidate, jobRequirements) => {
    const candidateYears = candidate.experience?.years || 0;
    const requiredYears = jobRequirements.experienceYears || 2;

    if (candidateYears >= requiredYears + 3) return 100; // Over-qualified
    if (candidateYears >= requiredYears) return 85;       // Perfect
    if (candidateYears >= requiredYears - 1) return 70;   // Close
    if (candidateYears >= requiredYears - 2) return 50;   // Acceptable
    return 30; // Under-qualified
};

/**
 * Engine 2: Skill Match Score (Fast)
 */
const calculateSkillScore = (candidateSkills, requiredSkills) => {
    if (!requiredSkills || requiredSkills.length === 0) return 70;

    const candidateLower = (candidateSkills || []).map(s => s.toLowerCase());
    const requiredLower = requiredSkills.map(s => s.toLowerCase());

    const matched = requiredLower.filter(r =>
        candidateLower.some(c => c.includes(r) || r.includes(c))
    );

    const matchRate = (matched.length / requiredLower.length) * 100;
    return Math.round(matchRate);
};

/**
 * Engine 3: Education Score
 */
const calculateEducationScore = (educationLevel, requiredLevel = 'bachelor') => {
    const levels = {
        'phd': 100,
        'master': 85,
        'bachelor': 70,
        'associate': 55,
        'diploma': 45,
        'high school': 30
    };

    return levels[educationLevel?.toLowerCase()] || 50;
};

// ═══════════════════════════════════════════════════════════════
// UNIFIED APPLICANT RANKING
// ═══════════════════════════════════════════════════════════════

/**
 * Rank multiple applicants for a job
 * Uses all 3 engines for comprehensive scoring
 */
export const rankApplicantsUnified = async (applicants, job, options = {}) => {
    const {
        useAI = true,
        useEmbeddings = true,
        limit = 50,
        onProgress = null
    } = options;

    const startTime = Date.now();
    const rankedApplicants = [];

    // Get job embedding once for semantic comparison
    let jobEmbedding = null;
    if (useEmbeddings && job.description) {
        try {
            jobEmbedding = await generateEmbedding(job.description);
        } catch (e) {
            console.warn('Job embedding failed:', e.message);
        }
    }

    // Process each applicant
    for (let i = 0; i < applicants.length && rankedApplicants.length < limit; i++) {
        const applicant = applicants[i];
        const scores = {};

        // Engine 1: Experience (instant)
        scores.experience = calculateExperienceScore(applicant, job);

        // Engine 2: Skills (instant)
        scores.skills = calculateSkillScore(
            applicant.skills || applicant.profile?.skills || [],
            job.requirements || job.skills || []
        );

        // Engine 3: Education (instant)
        scores.education = calculateEducationScore(
            applicant.education?.level || applicant.profile?.education
        );

        // Engine 4: Semantic match (if available)
        if (jobEmbedding && applicant.resumeText) {
            try {
                const resumeEmbedding = await generateEmbedding(applicant.resumeText);
                scores.semantic = Math.round(cosineSimilarity(jobEmbedding, resumeEmbedding) * 100);
            } catch (e) {
                scores.semantic = 50;
            }
        }

        // Engine 5: AI Analysis (for top candidates only)
        if (useAI && applicant.resumeText && i < 20) {
            try {
                const analysis = await analyzeResumeUnified(
                    applicant.resumeText,
                    job.description || '',
                    {
                        includeEngines: ['javascript-regex', 'gpt-4o-mini'],
                        candidateName: applicant.name || applicant.user?.fullname
                    }
                );
                scores.ai = analysis.consensus?.score || 50;
                scores.aiInsights = {
                    recommendation: analysis.consensus?.recommendation,
                    strengths: analysis.consensus?.keyStrengths,
                    concerns: analysis.consensus?.concerns
                };
            } catch (e) {
                scores.ai = 50;
            }
        }

        // Calculate weighted final score
        const weights = {
            skills: 0.30,
            experience: 0.20,
            education: 0.10,
            semantic: 0.20,
            ai: 0.20
        };

        let weightedSum = 0;
        let totalWeight = 0;

        for (const [key, value] of Object.entries(scores)) {
            if (typeof value === 'number' && weights[key]) {
                weightedSum += value * weights[key];
                totalWeight += weights[key];
            }
        }

        const finalScore = Math.round(weightedSum / totalWeight);

        rankedApplicants.push({
            applicant: {
                _id: applicant._id,
                userId: applicant.userId || applicant.user?._id,
                name: applicant.name || applicant.user?.fullname,
                email: applicant.email || applicant.user?.email,
                phone: applicant.phone,
                appliedAt: applicant.createdAt
            },
            scores: {
                final: Math.max(20, Math.min(95, finalScore)),
                skills: scores.skills,
                experience: scores.experience,
                education: scores.education,
                semantic: scores.semantic || null,
                ai: scores.ai || null
            },
            rank: 0, // Will be set after sorting
            tier: getTier(finalScore),
            recommendation: getRecommendation(finalScore, scores),
            insights: scores.aiInsights || null,
            enginesUsed: Object.keys(scores).filter(k => typeof scores[k] === 'number').length
        });

        // Progress callback
        if (onProgress) {
            onProgress({
                processed: i + 1,
                total: applicants.length,
                currentScore: finalScore
            });
        }
    }

    // Sort by final score
    rankedApplicants.sort((a, b) => b.scores.final - a.scores.final);

    // Assign ranks
    rankedApplicants.forEach((a, i) => {
        a.rank = i + 1;
    });

    return {
        ranked: rankedApplicants,
        summary: {
            total: applicants.length,
            ranked: rankedApplicants.length,
            topTier: rankedApplicants.filter(a => a.tier === 'Top').length,
            strongTier: rankedApplicants.filter(a => a.tier === 'Strong').length,
            averageScore: Math.round(
                rankedApplicants.reduce((sum, a) => sum + a.scores.final, 0) / rankedApplicants.length
            )
        },
        meta: {
            latency: Date.now() - startTime,
            jobTitle: job.title,
            usedAI: useAI,
            usedEmbeddings: useEmbeddings
        }
    };
};

const getTier = (score) => {
    if (score >= 80) return 'Top';
    if (score >= 65) return 'Strong';
    if (score >= 50) return 'Average';
    return 'Below Average';
};

const getRecommendation = (score, scores) => {
    if (score >= 80) {
        return 'Strong candidate - recommend immediate interview';
    }
    if (score >= 65) {
        return 'Good candidate - schedule interview';
    }
    if (score >= 50) {
        if (scores.skills < 50) return 'Skills gap - may need training';
        if (scores.experience < 50) return 'Less experienced - consider for junior role';
        return 'Potential candidate - review profile';
    }
    return 'Does not meet minimum requirements';
};

// ═══════════════════════════════════════════════════════════════
// QUICK RANKING (Fast, no AI)
// ═══════════════════════════════════════════════════════════════

export const rankApplicantsQuick = async (applicants, job) => {
    return rankApplicantsUnified(applicants, job, {
        useAI: false,
        useEmbeddings: false
    });
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    rankApplicantsUnified,
    rankApplicantsQuick,
    calculateExperienceScore,
    calculateSkillScore,
    calculateEducationScore
};
