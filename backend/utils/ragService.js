/**
 * RAG AI Service - Context-Aware AI
 * Wraps aiServiceV3 with RAG context retrieval from vectorStore
 * Enables: "This candidate is 85% similar to Sarah who you hired 6 months ago"
 */

import {
    callAI,
    parseAIJson,
    AI_MODELS,
    getMemory,
    addToMemory
} from './aiServiceV3.js';

import {
    addResumeVector,
    findSimilarResumes,
    findSimilarCandidates,
    addJobVector,
    findMatchingJobs,
    addInterviewVector,
    getResumeAnalysisContext,
    getCEOReportContext,
    getVectorStoreStats
} from './vectorStore.js';

import {
    generateEmbedding,
    prepareResumeText,
    prepareJobText
} from './embeddingService.js';

// ═══════════════════════════════════════════════════════════════
// RAG-ENHANCED RESUME ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze resume with RAG context
 * Compares against past candidates and provides historical insights
 */
export const analyzeResumeWithRAG = async (resumeText, jobDescription = '', candidateId = null) => {
    // Get RAG context (similar past candidates)
    const ragContext = await getResumeAnalysisContext(resumeText, jobDescription);

    // Build enhanced prompt with context
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) and resume analyst with 20+ years experience.
You have access to company hiring history and can compare candidates to past successful hires.

${ragContext.similarCandidates.length > 0 ? `
HISTORICAL CONTEXT:
Similar past candidates in our database:
${ragContext.similarCandidates.map((c, i) =>
        `${i + 1}. ${c.name || 'Unknown'} (${Math.round(c.score * 100)}% similar) - ${c.title || 'N/A'}`
    ).join('\n')}

${ragContext.insights.join('\n')}
` : ''}

Analyze resumes thoroughly, comparing against historical patterns when available.`;

    const userPrompt = `Analyze this resume for the position.

RESUME:
${resumeText.substring(0, 8000)}

${jobDescription ? `JOB DESCRIPTION:\n${jobDescription.substring(0, 2000)}` : ''}

Return JSON:
{
    "overallScore": <0-100>,
    "recommendation": "<Strong Match|Good Match|Partial Match|Not Recommended>",
    "historicalComparison": "<how they compare to past candidates>",
    "skills": {
        "technical": ["<skills>"],
        "soft": ["<skills>"],
        "match_rate": <0-100>
    },
    "experience": {
        "years": <number>,
        "relevance": "<High|Medium|Low>",
        "highlights": ["<achievements>"]
    },
    "strengths": ["<top 3>"],
    "concerns": ["<red flags>"],
    "similarTo": "<name of similar past candidate if any>",
    "predictedSuccess": "<High|Medium|Low based on patterns>",
    "interviewQuestions": ["<3 targeted questions>"]
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.3,
        feature: 'RESUME_ANALYSIS'
    });

    const analysis = parseAIJson(result.content);

    // Add to vector store for future comparisons
    if (candidateId) {
        try {
            await addResumeVector(candidateId, {
                name: analysis.candidateName || candidateId,
                title: analysis.currentTitle,
                skills: analysis.skills?.technical || [],
                experience: analysis.experience?.years,
                rawText: resumeText
            });
        } catch (e) {
            console.warn('Could not add to vector store:', e.message);
        }
    }

    analysis.analyzedBy = result.model;
    analysis.provider = result.provider;
    analysis.latency = result.latency;
    analysis.ragContext = {
        similarCandidates: ragContext.similarCandidates.length,
        insights: ragContext.insights
    };
    analysis.analyzedAt = new Date().toISOString();

    return analysis;
};

// ═══════════════════════════════════════════════════════════════
// RAG-ENHANCED JOB MATCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Find matching jobs for a candidate with semantic search
 */
export const findJobsWithRAG = async (resumeText, candidatePreferences = {}) => {
    // Prepare resume for embedding
    const resumeForMatching = `${resumeText}\n\nPreferences: ${JSON.stringify(candidatePreferences)}`;

    // Find semantically similar jobs
    const matchingJobs = await findMatchingJobs(resumeForMatching, 10);

    // Enhance with AI analysis
    if (matchingJobs.length > 0) {
        const topJobs = matchingJobs.slice(0, 5);

        const analysisPrompt = `Given these job matches for a candidate, provide brief personalized feedback:

Jobs found (by similarity):
${topJobs.map((j, i) => `${i + 1}. ${j.metadata.title} at ${j.metadata.company} (${j.matchPercentage}% match)`).join('\n')}

For each job, provide a one-sentence explanation of why it's a good fit.

Return JSON:
{
    "matches": [
        {"jobId": "<id>", "whyGoodFit": "<explanation>", "keySkillsMatch": ["<skills>"]}
    ]
}`;

        try {
            const result = await callAI(analysisPrompt, { temperature: 0.5 });
            const analysis = parseAIJson(result.content);

            // Merge analysis with match data
            return matchingJobs.map(job => ({
                ...job,
                analysis: analysis.matches?.find(m => m.jobId === job.jobId)
            }));
        } catch (e) {
            console.warn('Could not enhance job matches:', e.message);
        }
    }

    return matchingJobs;
};

// ═══════════════════════════════════════════════════════════════
// RAG-ENHANCED CEO REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate CEO report with historical context
 * Includes: Past hire comparisons, success predictions, benchmarks
 */
export const generateCEOReportWithRAG = async (interviewData) => {
    // Get historical context for this role
    const ragContext = await getCEOReportContext(interviewData.jobTitle, interviewData.candidateName);

    const systemPrompt = `You are an executive AI assistant generating comprehensive interview reports for CEO review.
You have access to the company's historical hiring data and can provide data-driven recommendations.

${ragContext.pastHires.length > 0 ? `
HISTORICAL HIRING DATA:
- Similar role interviews analyzed: ${ragContext.pastHires.length}
- Historical hire rate: ${ragContext.benchmarks.hireRate || 'N/A'}%
- Average score of hired candidates: ${ragContext.benchmarks.avgScore || 'N/A'}

Past similar hires:
${ragContext.pastHires.slice(0, 3).map((h, i) =>
        `${i + 1}. ${h.candidateName} for ${h.jobTitle} - ${h.outcome}`
    ).join('\n')}
` : 'No historical data available for comparison.'}

Provide deep analysis with strategic recommendations based on historical patterns.`;

    const userPrompt = `Generate executive interview report for CEO.

CANDIDATE: ${interviewData.candidateName}
POSITION: ${interviewData.jobTitle}
COMPANY: ${interviewData.companyName}
DATE: ${interviewData.interviewDate}

PERFORMANCE:
- MCQ Score: ${interviewData.mcqScore}/${interviewData.mcqTotal} (${Math.round((interviewData.mcqScore / interviewData.mcqTotal) * 100)}%)
- Resume Score: ${interviewData.resumeScore}/100
- Interview Rating: ${interviewData.interviewRating}/10
- Fraud Risk: ${interviewData.fraudRiskScore}/100

INTERVIEWER NOTES:
${interviewData.recruiterNotes || 'None provided'}

Generate a comprehensive executive report with historical comparisons:
{
    "executiveSummary": "<2-3 paragraph summary for CEO>",
    "overallScore": <0-100>,
    "recommendation": "<Strong Hire|Hire|Maybe|No Hire>",
    "historicalComparison": "<how candidate compares to past hires>",
    "predictedSuccessRate": "<percentage based on patterns>",
    "keyStrengths": ["<top 3>"],
    "concerns": ["<concerns>"],
    "benchmarkAnalysis": "<how they compare to role benchmarks>",
    "cultureFit": "<High|Medium|Low>",
    "growthPotential": "<High|Medium|Low>",
    "salaryRecommendation": "<range>",
    "riskFactors": ["<risks>"],
    "nextSteps": ["<actions>"]
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.4,
        maxTokens: 2500,
        useReasoning: true // Use deepseek-r1!
    });

    const report = parseAIJson(result.content);

    // Add interview to vector store for future comparisons
    try {
        await addInterviewVector(interviewData.interviewId || `interview_${Date.now()}`, {
            candidateName: interviewData.candidateName,
            jobTitle: interviewData.jobTitle,
            score: interviewData.mcqScore,
            notes: interviewData.recruiterNotes,
            outcome: null // Will be updated when CEO decides
        });
    } catch (e) {
        console.warn('Could not add interview to vector store:', e.message);
    }

    report.generatedBy = result.model;
    report.provider = result.provider;
    report.latency = result.latency;
    report.ragContext = {
        pastHiresAnalyzed: ragContext.pastHires.length,
        benchmarks: ragContext.benchmarks
    };

    // Include AI reasoning if available
    if (result.reasoning) {
        report.aiReasoning = result.reasoning;
        console.log(`📝 CEO Report includes ${result.reasoning.length} chars of AI reasoning`);
    }

    report.generatedAt = new Date().toISOString();
    return report;
};

// ═══════════════════════════════════════════════════════════════
// INTERVIEW WITH MEMORY
// ═══════════════════════════════════════════════════════════════

/**
 * Get interview response with conversation memory
 * Remembers previous Q&A and adapts follow-ups
 */
export const getInterviewResponseWithMemory = async (question, candidateAnswer, interviewId, jobContext = '') => {
    const sessionId = `interview_${interviewId}`;

    // Get conversation history
    const memory = getMemory(sessionId);
    const previousQA = memory.messages.filter(m => m.role === 'user' || m.role === 'assistant');

    const systemPrompt = `You are an AI interviewer conducting a live technical interview.
Be conversational, professional, and encouraging.
${previousQA.length > 0 ? `
IMPORTANT: You have asked ${Math.floor(previousQA.length / 2)} questions so far.
Do NOT repeat questions. Build on what the candidate has already shared.
` : ''}
Provide real-time feedback and natural follow-up questions.`;

    const contextFromMemory = previousQA.slice(-6).map(m => ({
        role: m.role,
        content: m.content.substring(0, 500)
    }));

    const userPrompt = `Current question: "${question}"
Candidate's answer: "${candidateAnswer}"
${jobContext ? `Job context: ${jobContext}` : ''}

Provide:
1. Brief feedback on their answer (acknowledge what they said)
2. A natural follow-up OR new question (don't repeat previous topics)
3. Score 1-10 for this answer

Return JSON:
{
    "feedback": "<conversational feedback referencing their answer>",
    "followUp": "<follow-up question or new topic>",
    "score": <1-10>,
    "strengths": ["<what they did well>"],
    "improvements": ["<areas to improve>"],
    "shouldContinue": <true if more questions needed>
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        ...contextFromMemory,
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.7,
        maxTokens: 500,
        feature: 'LIVE_INTERVIEW',
        sessionId,
        includeMemory: false // We handle memory manually above
    });

    // Store this exchange in memory
    addToMemory(sessionId, 'user', `Q: ${question}\nA: ${candidateAnswer}`);
    addToMemory(sessionId, 'assistant', result.content);

    const response = parseAIJson(result.content);
    response.questionsAsked = Math.floor(previousQA.length / 2) + 1;

    return response;
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Index a job for semantic matching
 */
export const indexJob = async (jobId, jobData) => {
    return await addJobVector(jobId, jobData);
};

/**
 * Index a resume for similarity search
 */
export const indexResume = async (candidateId, resumeData) => {
    return await addResumeVector(candidateId, resumeData);
};

/**
 * Get RAG system statistics
 */
export const getRAGStats = () => {
    return {
        vectorStore: getVectorStoreStats(),
        features: ['resumeAnalysisWithRAG', 'jobMatchingWithRAG', 'ceoReportWithRAG', 'interviewWithMemory']
    };
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    // RAG-enhanced features
    analyzeResumeWithRAG,
    findJobsWithRAG,
    generateCEOReportWithRAG,
    getInterviewResponseWithMemory,

    // Indexing
    indexJob,
    indexResume,

    // Stats
    getRAGStats
};
