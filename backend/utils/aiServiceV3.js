/**
 * AI Service V3 - Industrial Grade Enterprise
 * ════════════════════════════════════════════════════════════════════
 *
 * PROVIDERS (in priority order):
 * 1. OpenAI GPT (via ChatAnywhere) - gpt-4o-mini (fastest), deepseek-r1 (reasoning)
 * 2. Groq - llama-3.3-70b (ultra-fast inference), mixtral-8x7b (code)
 * 3. Google Gemini - gemini-1.5-flash (reliable fallback)
 *
 * FEATURES:
 * - Auto-failover between providers
 * - Memory/context management for sessions
 * - Feature-specific model routing
 * - Rate limit detection and recovery
 * - JSON parsing with multiple fallback strategies
 * - Performance metrics tracking
 *
 * @version 3.0.0
 * @author JobPortal AI Team
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

// API Endpoints
const API_ENDPOINTS = {
  GPT: "https://api.chatanywhere.tech/v1/chat/completions",
  GROQ: "https://api.groq.com/openai/v1/chat/completions",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta/models",
};

// API Key getters (runtime access for dotenv compatibility)
const getAPIKey = (provider) => {
  switch (provider) {
    case "GPT":
      return process.env.GPT5_API_KEY || process.env.OPENAI_API_KEY;
    case "GROQ":
      return process.env.GROQ_API_KEY;
    case "GEMINI":
      return process.env.GEMINI_API_KEY;
    default:
      return null;
  }
};

// ═══════════════════════════════════════════════════════════════════
// MODEL DEFINITIONS - Optimized December 2024
// ═══════════════════════════════════════════════════════════════════

export const AI_MODELS = {
  // ── GPT Models (via ChatAnywhere) ──
  GPT4O_MINI: "gpt-4o-mini", // ⚡ 979ms - FASTEST, primary for all features
  DEEPSEEK_R1: "deepseek-r1", // 🧠 Chain-of-thought reasoning for complex analysis

  // ── Groq Models (Ultra-fast inference) ──
  GROQ_LLAMA_70B: "llama-3.3-70b-versatile", // 🚀 Super fast, great quality
  GROQ_MIXTRAL: "mixtral-8x7b-32768", // 💻 Excellent for code generation
  GROQ_LLAMA_8B: "llama-3.1-8b-instant", // ⚡ Instant responses

  // ── Gemini Models (Google) ──
  GEMINI_FLASH: "gemini-1.5-flash", // 🌟 Fast, reliable fallback
  GEMINI_PRO: "gemini-1.5-pro", // 📊 More capable for complex tasks
};

// ═══════════════════════════════════════════════════════════════════
// FEATURE-TO-MODEL ROUTING
// Optimized for speed + accuracy per use case
// ═══════════════════════════════════════════════════════════════════

export const FEATURE_MODELS = {
  // Real-time features (need speed)
  LIVE_INTERVIEW: {
    primary: AI_MODELS.GPT4O_MINI,
    fallback: AI_MODELS.GROQ_LLAMA_8B,
    final: AI_MODELS.GEMINI_FLASH,
  },
  FRAUD_DETECTION: {
    primary: AI_MODELS.GROQ_LLAMA_8B, // Instant risk assessment
    fallback: AI_MODELS.GPT4O_MINI,
    final: AI_MODELS.GEMINI_FLASH,
  },

  // Generation features (need accuracy)
  MCQ_GENERATION: {
    primary: AI_MODELS.GPT4O_MINI,
    fallback: AI_MODELS.GROQ_LLAMA_70B,
    final: AI_MODELS.GEMINI_FLASH,
  },
  RESUME_ANALYSIS: {
    primary: AI_MODELS.GPT4O_MINI,
    fallback: AI_MODELS.GROQ_LLAMA_70B,
    final: AI_MODELS.GEMINI_PRO,
  },
  JOB_MATCHING: {
    primary: AI_MODELS.GPT4O_MINI,
    fallback: AI_MODELS.GROQ_MIXTRAL,
    final: AI_MODELS.GEMINI_FLASH,
  },
  APPLICANT_RANKING: {
    primary: AI_MODELS.GROQ_LLAMA_70B,
    fallback: AI_MODELS.GPT4O_MINI,
    final: AI_MODELS.GEMINI_FLASH,
  },

  // Complex analysis (need reasoning)
  CEO_REPORTS: {
    primary: AI_MODELS.DEEPSEEK_R1, // Chain-of-thought reasoning
    fallback: AI_MODELS.GEMINI_PRO,
    final: AI_MODELS.GROQ_LLAMA_70B,
  },
  RECOMMENDATION: {
    primary: AI_MODELS.GPT4O_MINI,
    fallback: AI_MODELS.GROQ_LLAMA_70B,
    final: AI_MODELS.GEMINI_FLASH,
  },
};

// ═══════════════════════════════════════════════════════════════════
// PROVIDER CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════

const PROVIDERS = {
  GPT: {
    name: "GPT",
    url: API_ENDPOINTS.GPT,
    getKey: () => getAPIKey("GPT"),
    models: [AI_MODELS.GPT4O_MINI, AI_MODELS.DEEPSEEK_R1],
    format: "openai",
    supportsJSON: true,
  },
  GROQ: {
    name: "Groq",
    url: API_ENDPOINTS.GROQ,
    getKey: () => getAPIKey("GROQ"),
    models: [
      AI_MODELS.GROQ_LLAMA_70B,
      AI_MODELS.GROQ_MIXTRAL,
      AI_MODELS.GROQ_LLAMA_8B,
    ],
    format: "openai",
    supportsJSON: true,
  },
  GEMINI: {
    name: "Gemini",
    url: API_ENDPOINTS.GEMINI,
    getKey: () => getAPIKey("GEMINI"),
    models: [AI_MODELS.GEMINI_FLASH, AI_MODELS.GEMINI_PRO],
    format: "gemini",
    supportsJSON: false,
  },
};

// Provider fallback chain
const FALLBACK_CHAIN = ["GPT", "GROQ", "GEMINI"];

// ═══════════════════════════════════════════════════════════════════
// SESSION MEMORY STORE
// ═══════════════════════════════════════════════════════════════════

const memoryStore = new Map();
const MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const getMemory = (sessionId) => {
  if (!memoryStore.has(sessionId)) {
    memoryStore.set(sessionId, {
      messages: [],
      entities: {},
      summary: "",
      createdAt: new Date(),
      lastAccess: new Date(),
    });
  }
  const memory = memoryStore.get(sessionId);
  memory.lastAccess = new Date();
  return memory;
};

export const addToMemory = (sessionId, role, content, metadata = {}) => {
  const memory = getMemory(sessionId);
  memory.messages.push({
    role,
    content,
    timestamp: new Date(),
    ...metadata,
  });
  // Keep last 50 messages max
  if (memory.messages.length > 50) {
    memory.messages = memory.messages.slice(-50);
  }
  return memory;
};

export const getContext = (sessionId, maxMessages = 10) => {
  const memory = getMemory(sessionId);
  return memory.messages.slice(-maxMessages);
};

export const clearMemory = (sessionId) => {
  memoryStore.delete(sessionId);
};

// Cleanup old memories every hour
setInterval(
  () => {
    const now = Date.now();
    for (const [sessionId, memory] of memoryStore.entries()) {
      if (now - memory.lastAccess.getTime() > MEMORY_TTL) {
        memoryStore.delete(sessionId);
      }
    }
  },
  60 * 60 * 1000,
);

// ═══════════════════════════════════════════════════════════════════
// CORE AI FUNCTION
// ═══════════════════════════════════════════════════════════════════

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
    responseFormat = "text", // 'text' or 'json'
    preferredProvider = null, // Force specific provider
  } = options;

  // Determine model routing based on feature
  let modelConfig = null;
  if (feature && FEATURE_MODELS[feature]) {
    modelConfig = FEATURE_MODELS[feature];
  }

  // Build message array
  let messageArray = Array.isArray(messages)
    ? messages
    : [{ role: "user", content: messages }];

  // Include memory context if requested
  if (includeMemory && sessionId) {
    const contextMessages = getContext(sessionId, 10);
    messageArray = [...contextMessages, ...messageArray];
  }

  // Build provider chain based on feature model config
  let providerChain = [];
  if (preferredProvider && PROVIDERS[preferredProvider]) {
    providerChain = [
      preferredProvider,
      ...FALLBACK_CHAIN.filter((p) => p !== preferredProvider),
    ];
  } else if (modelConfig) {
    // Route to appropriate providers based on model config
    const primaryProvider = getProviderForModel(modelConfig.primary);
    const fallbackProvider = getProviderForModel(modelConfig.fallback);
    const finalProvider = getProviderForModel(modelConfig.final);
    providerChain = [primaryProvider, fallbackProvider, finalProvider].filter(
      Boolean,
    );
  } else {
    providerChain = [...FALLBACK_CHAIN];
  }

  // Remove duplicates while preserving order
  providerChain = [...new Set(providerChain)];

  // Try each provider
  let lastError = null;
  const startTime = Date.now();

  for (const providerKey of providerChain) {
    const provider = PROVIDERS[providerKey];
    const apiKey = provider.getKey();

    if (!apiKey) {
      console.log(`⏭️ [AI] Skipping ${provider.name} - no API key configured`);
      continue;
    }

    // Select model for this provider
    let modelToUse;
    if (modelConfig) {
      if (provider.models.includes(modelConfig.primary)) {
        modelToUse = modelConfig.primary;
      } else if (provider.models.includes(modelConfig.fallback)) {
        modelToUse = modelConfig.fallback;
      } else {
        modelToUse = provider.models[0];
      }
    } else {
      modelToUse =
        useReasoning && provider.models.includes(AI_MODELS.DEEPSEEK_R1)
          ? AI_MODELS.DEEPSEEK_R1
          : provider.models[0];
    }

    try {
      console.log(`🤖 [AI] Calling ${provider.name} (${modelToUse})...`);
      const callStart = Date.now();

      let result;
      if (provider.format === "gemini") {
        result = await callGemini(
          messageArray,
          modelToUse,
          temperature,
          maxTokens,
        );
      } else {
        result = await callOpenAIFormat(
          provider.url,
          apiKey,
          modelToUse,
          messageArray,
          temperature,
          maxTokens,
          responseFormat,
          provider.supportsJSON,
        );
      }

      const latency = Date.now() - callStart;
      console.log(
        `✅ [AI] ${provider.name} response: ${result.tokens || 0} tokens, ${latency}ms`,
      );

      // Store in memory if session provided
      if (sessionId) {
        const userMsg = messageArray[messageArray.length - 1];
        addToMemory(sessionId, "user", userMsg.content);
        addToMemory(sessionId, "assistant", result.content, {
          model: modelToUse,
        });
      }

      return {
        content: result.content,
        reasoning: result.reasoning,
        model: modelToUse,
        provider: provider.name,
        tokens: result.tokens || 0,
        latency,
        totalTime: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      console.error(`❌ [AI] ${provider.name} failed:`, error.message);
      lastError = error;

      // Check for rate limit - try next provider
      if (isRateLimitError(error.message)) {
        console.log(`⚠️ [AI] Rate limited on ${provider.name}, trying next...`);
        continue;
      }
    }
  }

  throw new Error(
    `All AI providers failed. Last error: ${lastError?.message || "Unknown"}`,
  );
};

// Helper to determine provider for a model
function getProviderForModel(model) {
  if ([AI_MODELS.GPT4O_MINI, AI_MODELS.DEEPSEEK_R1].includes(model))
    return "GPT";
  if (
    [
      AI_MODELS.GROQ_LLAMA_70B,
      AI_MODELS.GROQ_MIXTRAL,
      AI_MODELS.GROQ_LLAMA_8B,
    ].includes(model)
  )
    return "GROQ";
  if ([AI_MODELS.GEMINI_FLASH, AI_MODELS.GEMINI_PRO].includes(model))
    return "GEMINI";
  return "GPT"; // Default
}

// Check if error is rate limit related
function isRateLimitError(message) {
  const rateLimitPatterns = [
    "rate",
    "limit",
    "限制",
    "429",
    "too many",
    "quota",
  ];
  return rateLimitPatterns.some((pattern) =>
    message.toLowerCase().includes(pattern),
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER-SPECIFIC CALLERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Call OpenAI-compatible API (GPT, Groq)
 */
async function callOpenAIFormat(
  url,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  responseFormat,
  supportsJSON,
) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // Only add response_format if supported and requested
  if (responseFormat === "json" && supportsJSON) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  const content = data.choices?.[0]?.message?.content;
  const reasoning = data.choices?.[0]?.message?.reasoning_content;

  if (!content) {
    throw new Error("No content in response");
  }

  return {
    content,
    reasoning,
    tokens: data.usage?.total_tokens || 0,
  };
}

/**
 * Call Gemini API
 */
async function callGemini(messages, model, temperature, maxTokens) {
  const apiKey = getAPIKey("GEMINI");
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  const response = await fetch(
    `${API_ENDPOINTS.GEMINI}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    },
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No content in Gemini response");
  }

  return { content, tokens: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// JSON PARSING UTILITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse JSON from AI response with multiple fallback strategies
 */
export const parseAIJson = (text) => {
  if (!text) throw new Error("Empty response to parse");

  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Strategy 2: Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Strategy 3: Find JSON object
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  // Strategy 4: Find JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  // Strategy 5: Clean and retry
  try {
    const cleaned = text
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
      .trim();
    return JSON.parse(cleaned);
  } catch {}

  throw new Error("Could not parse JSON from response");
};

// ═══════════════════════════════════════════════════════════════════
// FEATURE FUNCTIONS - Industrial Standard
// ═══════════════════════════════════════════════════════════════════

/**
 * Resume Analysis - ATS-style comprehensive evaluation
 */
export const analyzeResume = async (
  resumeText,
  jobDescription = "",
  candidateId = null,
) => {
  const systemPrompt = `You are an elite ATS (Applicant Tracking System) and resume analyst with 25+ years experience at Fortune 500 companies.

Your analysis must be:
- ACCURATE: Based on actual content, no assumptions
- OBJECTIVE: Fair, unbiased evaluation
- ACTIONABLE: Specific, implementable insights
- INDUSTRY-STANDARD: Using recognized best practices

Analyze comprehensively and return structured JSON.`;

  const userPrompt = `Analyze this resume against the job requirements.

═══════════════════════════════════════════════════════════════
RESUME:
═══════════════════════════════════════════════════════════════
${resumeText.substring(0, 10000)}

${
  jobDescription
    ? `
═══════════════════════════════════════════════════════════════
JOB REQUIREMENTS:
═══════════════════════════════════════════════════════════════
${jobDescription.substring(0, 3000)}
`
    : ""
}

Return JSON:
{
    "overallScore": <0-100>,
    "recommendation": "<Strong Match|Good Match|Partial Match|Not Recommended>",
    "atsScore": <0-100 ATS compatibility>,
    
    "skills": {
        "technical": ["<detected skills>"],
        "soft": ["<soft skills>"],
        "matched": ["<skills matching job>"],
        "missing": ["<required skills not found>"],
        "matchRate": <0-100>
    },
    
    "experience": {
        "totalYears": <number>,
        "relevantYears": <number>,
        "level": "<Entry|Junior|Mid|Senior|Lead|Principal>",
        "highlights": ["<key achievements>"],
        "companies": ["<company names>"]
    },
    
    "education": {
        "level": "<PhD|Masters|Bachelors|Associate|Other>",
        "field": "<field of study>",
        "institution": "<school name>",
        "relevance": "<High|Medium|Low>"
    },
    
    "scoreBreakdown": {
        "skills": <0-30>,
        "experience": <0-25>,
        "projects": <0-20>,
        "education": <0-15>,
        "ats": <0-10>
    },
    
    "strengths": ["<top 3-5 strengths>"],
    "concerns": ["<potential red flags>"],
    "suggestions": ["<improvement recommendations>"],
    "interviewQuestions": ["<3-5 suggested questions>"],
    "salaryExpectation": "<estimated range based on experience>"
}`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.3,
      maxTokens: 4000,
      feature: "RESUME_ANALYSIS",
      sessionId: candidateId ? `resume_${candidateId}` : null,
    },
  );

  const analysis = parseAIJson(result.content);
  analysis.analyzedBy = result.model;
  analysis.provider = result.provider;
  analysis.latency = result.latency;
  analysis.analyzedAt = new Date().toISOString();

  return analysis;
};

/**
 * MCQ Generation - Industrial Standard Assessment Questions
 */
export const generateMCQ = async (
  jobTitle,
  skills,
  experienceLevel = "Mid",
  questionCount = 15,
) => {
  const systemPrompt = `You are an elite technical interviewer with 20+ years experience at FAANG companies.

CRITICAL REQUIREMENTS:
1. Questions must test REAL knowledge, not trivia
2. All 4 options must be PLAUSIBLE - no obviously wrong answers
3. Include CODE SNIPPETS for technical roles
4. Each question MUST have a detailed EXPLANATION
5. Progressive difficulty (easy → hard)
6. Industrial-relevant, current best practices`;

  const userPrompt = `Generate ${questionCount} HIGH-QUALITY MCQ questions.

═══════════════════════════════════════════════════════════════
JOB CONTEXT:
═══════════════════════════════════════════════════════════════
Position: ${jobTitle}
Skills: ${Array.isArray(skills) ? skills.slice(0, 8).join(", ") : skills}
Level: ${experienceLevel}

═══════════════════════════════════════════════════════════════
DISTRIBUTION:
═══════════════════════════════════════════════════════════════
- Easy: 25% (fundamentals)
- Medium: 50% (application)
- Hard: 25% (analysis/problem-solving)

Categories:
- Technical Knowledge: 40%
- Coding/Implementation: 30%
- System Design: 15%
- Behavioral: 15%

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT:
═══════════════════════════════════════════════════════════════
{
    "questions": [
        {
            "id": 1,
            "question": "Clear, specific question text",
            "options": ["Plausible A", "Plausible B", "Plausible C", "Plausible D"],
            "correctAnswer": 0,
            "difficulty": "easy|medium|hard",
            "category": "technical|coding|system-design|behavioral",
            "skill": "${Array.isArray(skills) ? skills[0] : "general"}",
            "explanation": "Detailed explanation of why this is correct",
            "timeEstimate": 60
        }
    ],
    "metadata": {
        "totalQuestions": ${questionCount},
        "distribution": {"easy": X, "medium": X, "hard": X},
        "skillsCovered": ["skills"]
    }
}`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.75,
      maxTokens: 8000,
      feature: "MCQ_GENERATION",
    },
  );

  const mcqData = parseAIJson(result.content);
  mcqData.generatedBy = result.model;
  mcqData.provider = result.provider;
  mcqData.latency = result.latency;
  mcqData.generatedAt = new Date().toISOString();

  return mcqData;
};

/**
 * Live Interview Response - Real-time conversational AI
 */
export const getInterviewResponse = async (
  question,
  candidateAnswer,
  jobContext,
  interviewId,
) => {
  const sessionId = `interview_${interviewId}`;

  const systemPrompt = `You are an expert AI interviewer conducting a live technical interview.

GUIDELINES:
- Be conversational, professional, encouraging
- Provide IMMEDIATE, specific feedback
- Ask natural follow-up questions
- Keep responses CONCISE (2-3 sentences)
- Score fairly based on actual answer quality`;

  const userPrompt = `Question asked: "${question}"
Candidate's answer: "${candidateAnswer}"
${jobContext ? `Job context: ${jobContext}` : ""}

Provide real-time evaluation:
{
    "feedback": "<conversational feedback on their answer>",
    "followUp": "<natural follow-up question or acknowledgment>",
    "score": <1-10>,
    "strengths": ["<what they did well>"],
    "improvements": ["<areas to improve>"],
    "shouldContinue": <true if follow-up needed>
}`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.7,
      maxTokens: 500,
      feature: "LIVE_INTERVIEW",
      sessionId,
      includeMemory: true,
    },
  );

  return parseAIJson(result.content);
};

/**
 * Fraud Detection - Behavioral Analysis
 */
export const analyzeFraud = async (behaviorData, contextData = {}) => {
  const systemPrompt = `You are a fraud detection AI analyzing interview behavior patterns.
Be OBJECTIVE and provide risk scores with clear reasoning.
NEVER make accusations - only report observations.`;

  const userPrompt = `Analyze interview behavior for potential concerns:

BEHAVIOR DATA:
- Average response time: ${behaviorData.avgResponseTime || "N/A"}ms
- Tab switches: ${behaviorData.tabSwitches || 0}
- Copy-paste events: ${behaviorData.copyPasteCount || 0}
- Camera status: ${behaviorData.cameraOn ? "ON" : "OFF"}
- Face detected: ${behaviorData.faceDetected ? "YES" : "NO"}
- Multiple faces: ${behaviorData.multipleFaces ? "YES" : "NO"}
- Window focus lost: ${behaviorData.windowBlurs || 0} times

${contextData.notes ? `Notes: ${contextData.notes}` : ""}

Return:
{
    "riskScore": <0-100>,
    "riskLevel": "<Low|Medium|High|Critical>",
    "confidence": <0-100>,
    "indicators": [
        {"type": "<indicator>", "severity": "<low|medium|high>", "evidence": "<description>"}
    ],
    "recommendation": "<proceed|review|flag|investigate>",
    "summary": "<1-2 sentence summary>"
}`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.2,
      maxTokens: 800,
      feature: "FRAUD_DETECTION",
    },
  );

  return parseAIJson(result.content);
};

/**
 * CEO Report Generation - Executive Summary with Chain-of-Thought
 */
export const generateCEOReport = async (interviewData) => {
  const systemPrompt = `You are an executive AI assistant generating comprehensive interview reports for CEO review.
Provide DEEP analysis, strategic recommendations, and data-driven insights.
Think through each aspect carefully before making recommendations.`;

  const userPrompt = `Generate executive interview report.

═══════════════════════════════════════════════════════════════
CANDIDATE INFORMATION:
═══════════════════════════════════════════════════════════════
Name: ${interviewData.candidateName}
Position: ${interviewData.jobTitle}
Company: ${interviewData.companyName}
Interview Date: ${interviewData.interviewDate}

═══════════════════════════════════════════════════════════════
PERFORMANCE METRICS:
═══════════════════════════════════════════════════════════════
- MCQ Score: ${interviewData.mcqScore}/${interviewData.mcqTotal} (${Math.round((interviewData.mcqScore / interviewData.mcqTotal) * 100)}%)
- Resume Score: ${interviewData.resumeScore}/100
- Interview Rating: ${interviewData.interviewRating}/10
- Fraud Risk: ${interviewData.fraudRiskScore}/100

═══════════════════════════════════════════════════════════════
INTERVIEWER NOTES:
═══════════════════════════════════════════════════════════════
${interviewData.recruiterNotes || "None provided"}

═══════════════════════════════════════════════════════════════
GENERATE EXECUTIVE REPORT:
═══════════════════════════════════════════════════════════════
{
    "executiveSummary": "<2-3 paragraph summary for CEO>",
    "overallScore": <0-100>,
    "recommendation": "<Strong Hire|Hire|Maybe|No Hire>",
    "keyStrengths": ["<top 3 strengths>"],
    "concerns": ["<any concerns>"],
    "cultureFit": "<High|Medium|Low>",
    "growthPotential": "<High|Medium|Low>",
    "salaryRecommendation": "<suggested range>",
    "startDate": "<recommended timeline>",
    "trainingNeeds": ["<areas needing development>"],
    "riskFactors": ["<any risks>"],
    "nextSteps": ["<recommended actions>"],
    "comparativeAnalysis": "<how they compare to typical candidates>"
}`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.4,
      maxTokens: 3000,
      useReasoning: true,
      feature: "CEO_REPORTS",
    },
  );

  const report = parseAIJson(result.content);
  report.generatedBy = result.model;
  report.provider = result.provider;
  report.latency = result.latency;
  report.generatedAt = new Date().toISOString();

  if (result.reasoning) {
    report.aiReasoning = result.reasoning;
    console.log(
      `📝 CEO Report includes ${result.reasoning.length} chars of AI reasoning`,
    );
  }

  return report;
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

// Legacy compatibility
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
  clearMemory,

  // Config
  AI_MODELS,
  FEATURE_MODELS,

  // Legacy
  callGPT5,
  analyzeResumeWithGPT5,
  generateMCQWithGPT5,
  analyzeFraudWithAI,
  generateReportWithGPT5,
};
