/**
 * AI Service V2 - Industrial Grade
 * Multi-Provider Support: ChatAnywhere → Groq → Gemini
 * Features: LangChain Compatible, Memory Support, RAG Ready
 * 
 * Primary: gpt-4o-mini (979ms fastest)
 * Reasoning: deepseek-r1 (chain-of-thought)
 * Fallback: Groq llama-3.3-70b → Gemini 1.5 Flash
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION - Using getters for runtime env access
// ═══════════════════════════════════════════════════════════════

// API URLs
const GPT5_API_URL = 'https://api.chatanywhere.tech/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Getter functions for API keys (runtime access for dotenv compatibility)
const getGPT5Key = () => process.env.GPT5_API_KEY;
const getGroqKey = () => process.env.GROQ_API_KEY;
const getGeminiKey = () => process.env.GEMINI_API_KEY;

// ═══════════════════════════════════════════════════════════════
// AI MODELS - Verified Dec 2024
// ChatAnywhere: gpt-4o-mini, deepseek-r1
// Groq: llama, mixtral (via api.groq.com)
// Gemini: flash, pro (via generativelanguage.googleapis.com)
// ═══════════════════════════════════════════════════════════════

export const AI_MODELS = {
    // ChatAnywhere Models (ONLY these work via chatanywhere.tech)
    GPT4O_MINI: 'gpt-4o-mini',           // 979ms ⚡ FASTEST - Primary for all features
    DEEPSEEK_R1: 'deepseek-r1',          // 57910ms 🧠 REASONING - For CEO reports

    // Groq Models (via api.groq.com - Super Fast!)
    GROQ_LLAMA: 'llama-3.3-70b-versatile',   // Fast inference
    GROQ_MIXTRAL: 'mixtral-8x7b-32768',      // Good for code

    // Gemini Models (via Google API)
    GEMINI_FLASH: 'gemini-1.5-flash',    // Fast, free tier
    GEMINI_PRO: 'gemini-1.5-pro'         // More capable
};

// Feature-to-Model Mapping - All use gpt-4o-mini except CEO reports
export const FEATURE_MODELS = {
    LIVE_INTERVIEW: AI_MODELS.GPT4O_MINI,      // 979ms - Real-time needed
    MCQ_GENERATION: AI_MODELS.GPT4O_MINI,      // 979ms - Fast generation
    RESUME_ANALYSIS: AI_MODELS.GPT4O_MINI,     // 979ms - Quick screening
    FRAUD_DETECTION: AI_MODELS.GPT4O_MINI,     // 979ms - Instant alerts
    JOB_MATCHING: AI_MODELS.GPT4O_MINI,        // 979ms - Quick matching
    APPLICANT_RANKING: AI_MODELS.GPT4O_MINI,   // 979ms - ATS scoring
    CEO_REPORTS: AI_MODELS.DEEPSEEK_R1         // 🧠 Chain-of-thought reasoning
};

// ═══════════════════════════════════════════════════════════════
// PROVIDER DEFINITIONS - Each with their own API endpoints
// ═══════════════════════════════════════════════════════════════

const PROVIDERS = {
    CHATANYWHERE: {
        name: 'ChatAnywhere',
        url: GPT5_API_URL,
        getKey: getGPT5Key,
        models: [AI_MODELS.GPT4O_MINI, AI_MODELS.DEEPSEEK_R1], // Only these work!
        format: 'openai'
    },
    GROQ: {
        name: 'Groq',
        url: GROQ_API_URL,  // api.groq.com
        getKey: getGroqKey,
        models: [AI_MODELS.GROQ_LLAMA, AI_MODELS.GROQ_MIXTRAL],
        format: 'openai'
    },
    GEMINI: {
        name: 'Gemini',
        url: GEMINI_API_URL,  // generativelanguage.googleapis.com
        getKey: getGeminiKey,
        models: [AI_MODELS.GEMINI_FLASH, AI_MODELS.GEMINI_PRO],
        format: 'gemini'
    }
};

// Fallback chain: ChatAnywhere (primary) → Groq → Gemini
const FALLBACK_CHAIN = ['CHATANYWHERE', 'GROQ', 'GEMINI'];

// ═══════════════════════════════════════════════════════════════
// MEMORY STORE (LangChain Compatible)
// ═══════════════════════════════════════════════════════════════

const memoryStore = new Map();

/**
 * Get or create memory for a session
 */
export const getMemory = (sessionId) => {
    if (!memoryStore.has(sessionId)) {
        memoryStore.set(sessionId, {
            messages: [],
            entities: {},
            summary: '',
            createdAt: new Date(),
            lastAccess: new Date()
        });
    }
    const memory = memoryStore.get(sessionId);
    memory.lastAccess = new Date();
    return memory;
};

/**
 * Add message to memory
 */
export const addToMemory = (sessionId, role, content, metadata = {}) => {
    const memory = getMemory(sessionId);
    memory.messages.push({
        role,
        content,
        timestamp: new Date(),
        ...metadata
    });

    // Keep last 50 messages max (buffer window)
    if (memory.messages.length > 50) {
        memory.messages = memory.messages.slice(-50);
    }

    return memory;
};

/**
 * Get conversation context from memory
 */
export const getContext = (sessionId, maxMessages = 10) => {
    const memory = getMemory(sessionId);
    return memory.messages.slice(-maxMessages);
};

/**
 * Update entity in memory (candidate info, job details, etc.)
 */
export const updateEntity = (sessionId, entityType, entityId, data) => {
    const memory = getMemory(sessionId);
    if (!memory.entities[entityType]) {
        memory.entities[entityType] = {};
    }
    memory.entities[entityType][entityId] = {
        ...memory.entities[entityType][entityId],
        ...data,
        updatedAt: new Date()
    };
    return memory;
};

/**
 * Clear old memories (cleanup every hour)
 */
const MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, memory] of memoryStore.entries()) {
        if (now - memory.lastAccess.getTime() > MEMORY_TTL) {
            memoryStore.delete(sessionId);
        }
    }
}, 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
// CORE AI FUNCTION - Multi-Provider with Fallback
// ═══════════════════════════════════════════════════════════════

/**
 * Call AI with intelligent multi-provider fallback
 * @param {string|Array} messages - Message content or array of messages
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} AI response with content and metadata
 */
export const callAI = async (messages, options = {}) => {
    const {
        temperature = 0.7,
        maxTokens = 4000,
        feature = null,
        useReasoning = false,
        sessionId = null,
        includeMemory = false,
        responseFormat = 'text'
    } = options;

    // Select model based on feature or reasoning flag
    let primaryModel = AI_MODELS.GPT4O_MINI; // Default fastest

    if (useReasoning) {
        primaryModel = AI_MODELS.DEEPSEEK_R1;
    } else if (feature && FEATURE_MODELS[feature]) {
        primaryModel = FEATURE_MODELS[feature];
    }

    // Build message array
    let messageArray = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: messages }];

    // Include memory context if requested
    if (includeMemory && sessionId) {
        const contextMessages = getContext(sessionId, 10);
        messageArray = [...contextMessages, ...messageArray];
    }

    // Try each provider in fallback chain
    let lastError = null;

    for (const providerKey of FALLBACK_CHAIN) {
        const provider = PROVIDERS[providerKey];
        const apiKey = provider.getKey();

        if (!apiKey) {
            console.log(`⏭️ Skipping ${provider.name} - no API key`);
            continue;
        }

        // Select appropriate model for this provider
        let modelToUse = primaryModel;
        if (!provider.models.includes(primaryModel)) {
            modelToUse = provider.models[0]; // Use provider's best model
        }

        try {
            console.log(`🤖 Calling ${provider.name} (${modelToUse})...`);
            const startTime = Date.now();

            let result;
            if (provider.format === 'gemini') {
                result = await callGemini(messageArray, modelToUse, temperature, maxTokens);
            } else {
                result = await callOpenAIFormat(provider.url, apiKey, modelToUse, messageArray, temperature, maxTokens, responseFormat);
            }

            const latency = Date.now() - startTime;
            console.log(`✅ ${provider.name} response (${result.tokens || 0} tokens, ${latency}ms)`);

            // Store in memory if session provided
            if (sessionId) {
                const userMsg = messageArray[messageArray.length - 1];
                addToMemory(sessionId, 'user', userMsg.content);
                addToMemory(sessionId, 'assistant', result.content, { model: modelToUse });
            }

            return {
                content: result.content,
                reasoning: result.reasoning,
                model: modelToUse,
                provider: provider.name,
                tokens: result.tokens || 0,
                latency,
                success: true
            };
        } catch (error) {
            console.error(`❌ ${provider.name} failed:`, error.message);
            lastError = error;

            // Check for rate limit - try next provider
            if (error.message.includes('rate') || error.message.includes('limit') || error.message.includes('限制')) {
                console.log(`⚠️ Rate limited, trying next provider...`);
                continue;
            }
        }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`);
};

/**
 * Call OpenAI-compatible API (ChatAnywhere, Groq)
 */
async function callOpenAIFormat(url, apiKey, model, messages, temperature, maxTokens, responseFormat) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            ...(responseFormat === 'json' && { response_format: { type: 'json_object' } })
        })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const content = data.choices?.[0]?.message?.content;
    const reasoning = data.choices?.[0]?.message?.reasoning_content;

    if (!content) {
        throw new Error('No content in response');
    }

    return {
        content,
        reasoning,
        tokens: data.usage?.total_tokens || 0
    };
}

/**
 * Call Gemini API
 */
async function callGemini(messages, model, temperature, maxTokens) {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens
                }
            })
        }
    );

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
        throw new Error('No content in Gemini response');
    }

    return { content, tokens: 0 };
}

// ═══════════════════════════════════════════════════════════════
// JSON PARSING UTILITY
// ═══════════════════════════════════════════════════════════════

export const parseAIJson = (text) => {
    try {
        return JSON.parse(text);
    } catch {
        // Extract from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1].trim());
        }
        // Try to find JSON object
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            return JSON.parse(objectMatch[0]);
        }
        // Try to find JSON array
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }
        throw new Error('Could not parse JSON from response');
    }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Resume Analysis with Memory
 */
export const analyzeResume = async (resumeText, jobDescription = '', candidateId = null) => {
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) and resume analyst with 20+ years experience.
Analyze resumes thoroughly, identifying skills, experience, education, and fit for the role.
Be accurate, objective, and provide actionable insights.`;

    const userPrompt = `Analyze this resume for the position.

RESUME:
${resumeText.substring(0, 8000)}

${jobDescription ? `JOB DESCRIPTION:\n${jobDescription.substring(0, 2000)}` : ''}

Return JSON:
{
    "overallScore": <0-100>,
    "recommendation": "<Strong Match|Good Match|Partial Match|Not Recommended>",
    "skills": {
        "technical": ["<skill1>", "<skill2>"],
        "soft": ["<skill1>", "<skill2>"],
        "match_rate": <0-100>
    },
    "experience": {
        "years": <number>,
        "relevance": "<High|Medium|Low>",
        "highlights": ["<key achievement>"]
    },
    "education": {
        "level": "<PhD|Masters|Bachelors|etc>",
        "field": "<field of study>",
        "relevance": "<High|Medium|Low>"
    },
    "strengths": ["<top 3 strengths>"],
    "concerns": ["<any red flags>"],
    "interviewQuestions": ["<3 questions to ask>"],
    "salaryExpectation": "<estimated range>"
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.3,
        feature: 'RESUME_ANALYSIS',
        sessionId: candidateId ? `resume_${candidateId}` : null,
        includeMemory: !!candidateId
    });

    const analysis = parseAIJson(result.content);
    analysis.analyzedBy = result.model;
    analysis.provider = result.provider;
    analysis.latency = result.latency;
    analysis.analyzedAt = new Date().toISOString();

    return analysis;
};

/**
 * MCQ Generation
 */
export const generateMCQ = async (jobTitle, skills, experienceLevel = 'Mid', questionCount = 15) => {
    const systemPrompt = `You are an expert technical interviewer creating assessment questions.
Generate challenging, specific questions that test real knowledge - not generic trivia.
Each question must have exactly 4 options with one correct answer.`;

    const userPrompt = `Generate ${questionCount} MCQ questions for a ${jobTitle} interview.

SKILLS TO TEST: ${skills.join(', ')}
EXPERIENCE LEVEL: ${experienceLevel}

Requirements:
- 30% Easy, 50% Medium, 20% Hard
- 60% Technical, 20% Problem-solving, 20% Situational
- Questions must be SPECIFIC to the role

Return JSON:
{
    "questions": [
        {
            "id": 1,
            "question": "Detailed question text?",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": 0,
            "difficulty": "medium",
            "category": "technical",
            "skill": "JavaScript",
            "explanation": "Why this is correct"
        }
    ],
    "metadata": {
        "totalQuestions": ${questionCount},
        "skillsCovered": ["<skills>"],
        "difficultyBreakdown": {"easy": 0, "medium": 0, "hard": 0}
    }
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.7,
        maxTokens: 6000,
        feature: 'MCQ_GENERATION'
    });

    const mcqData = parseAIJson(result.content);
    mcqData.generatedBy = result.model;
    mcqData.provider = result.provider;
    mcqData.latency = result.latency;

    return mcqData;
};

/**
 * Live Interview Response with Memory
 */
export const getInterviewResponse = async (question, candidateAnswer, jobContext, interviewId) => {
    const sessionId = `interview_${interviewId}`;

    const systemPrompt = `You are an AI interviewer conducting a live technical interview.
Be conversational, professional, and encouraging.
Provide real-time feedback and natural follow-up questions.
Keep responses concise (2-3 sentences feedback, then follow-up).`;

    const userPrompt = `Current question: "${question}"
Candidate's answer: "${candidateAnswer}"
${jobContext ? `Job context: ${jobContext}` : ''}

Provide:
1. Brief feedback on their answer
2. A natural follow-up question OR acknowledgment
3. Score 1-10 for this answer

Return JSON:
{
    "feedback": "<conversational feedback>",
    "followUp": "<follow-up question or acknowledgment>",
    "score": <1-10>,
    "strengths": ["<what they did well>"],
    "improvements": ["<areas to improve>"],
    "shouldContinue": <true if follow-up needed>
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.7,
        maxTokens: 500,
        feature: 'LIVE_INTERVIEW',
        sessionId,
        includeMemory: true
    });

    return parseAIJson(result.content);
};

/**
 * Fraud Detection
 */
export const analyzeFraud = async (behaviorData, contextData = {}) => {
    const systemPrompt = `You are a fraud detection AI analyzing interview behavior patterns.
Identify suspicious activities like cheating, tab switching, copy-pasting, or impersonation.
Be objective and provide risk scores with clear reasoning.`;

    const userPrompt = `Analyze this interview behavior for fraud:

BEHAVIOR DATA:
- Average response time: ${behaviorData.avgResponseTime}ms
- Tab switches: ${behaviorData.tabSwitches}
- Copy-paste events: ${behaviorData.copyPasteCount}
- Camera status: ${behaviorData.cameraOn ? 'ON' : 'OFF'}
- Face detected: ${behaviorData.faceDetected ? 'YES' : 'NO'}
- Multiple faces: ${behaviorData.multipleFaces ? 'YES' : 'NO'}

${contextData.notes ? `NOTES: ${contextData.notes}` : ''}

Return JSON:
{
    "riskScore": <0-100>,
    "riskLevel": "<Low|Medium|High|Critical>",
    "indicators": [
        {"type": "<indicator>", "severity": "<low|medium|high>", "evidence": "<description>"}
    ],
    "recommendation": "<action to take>",
    "confidence": <0-100>
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.3,
        feature: 'FRAUD_DETECTION'
    });

    return parseAIJson(result.content);
};

/**
 * CEO Report with Chain-of-Thought Reasoning
 */
export const generateCEOReport = async (interviewData) => {
    const systemPrompt = `You are an executive AI assistant generating comprehensive interview reports for CEO review.
Provide deep analysis, strategic recommendations, and data-driven insights.
Think through each aspect carefully before making recommendations.`;

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

Generate a comprehensive executive report:
{
    "executiveSummary": "<2-3 paragraph summary for CEO>",
    "overallScore": <0-100>,
    "recommendation": "<Strong Hire|Hire|Maybe|No Hire>",
    "keyStrengths": ["<top 3 strengths>"],
    "concerns": ["<any concerns>"],
    "cultureFit": "<High|Medium|Low>",
    "growthPotential": "<High|Medium|Low>",
    "salaryRecommendation": "<suggested range>",
    "startDate": "<recommended start timeline>",
    "trainingNeeds": ["<areas needing development>"],
    "teamFit": "<which team would benefit>",
    "riskFactors": ["<any risks to consider>"],
    "nextSteps": ["<recommended actions>"],
    "comparativeAnalysis": "<how they compare to role requirements>"
}`;

    const result = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ], {
        temperature: 0.4,
        maxTokens: 2500,
        useReasoning: true, // Use deepseek-r1 for chain-of-thought!
        feature: 'CEO_REPORTS'
    });

    const report = parseAIJson(result.content);
    report.generatedBy = result.model;
    report.provider = result.provider;
    report.latency = result.latency;
    report.generatedAt = new Date().toISOString();

    // Include AI reasoning if available (deepseek-r1)
    if (result.reasoning) {
        report.aiReasoning = result.reasoning;
        console.log(`📝 CEO Report includes ${result.reasoning.length} chars of AI reasoning`);
    }

    return report;
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

// Legacy compatibility - map old function names
export const callGPT5 = callAI;
export const analyzeResumeWithGPT5 = analyzeResume;
export const generateMCQWithGPT5 = generateMCQ;
export const analyzeFraudWithAI = analyzeFraud;
export const generateReportWithGPT5 = generateCEOReport;

export default {
    // Core
    callAI,
    parseAIJson,

    // Features
    analyzeResume,
    generateMCQ,
    getInterviewResponse,
    analyzeFraud,
    generateCEOReport,

    // Memory
    getMemory,
    addToMemory,
    getContext,
    updateEntity,

    // Config
    AI_MODELS,
    FEATURE_MODELS,

    // Legacy
    callGPT5,
    analyzeResumeWithGPT5,
    generateMCQWithGPT5,
    analyzeFraudWithAI,
    generateReportWithGPT5
};
