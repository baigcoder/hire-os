/**
 * AI Service - Multi-Model Optimized
 * Uses ChatAnywhere API with optimal model selection per feature
 * Models ranked by capability: gpt-5.1 > gpt-5 > gpt-5-mini > gpt-5-nano
 */

const GPT5_API_KEY = process.env.GPT5_API_KEY;
const GPT5_API_URL = "https://api.chatanywhere.tech/v1/chat/completions";

// Model configuration - VERIFIED via testAIModels.js (Dec 2024)
// Tested models with actual latency: gpt-4o-mini (979ms), gpt-5-mini-ca (1344ms),
// gpt-5-ca (1945ms), gpt-5.1-ca (2807ms), deepseek-r1 (57910ms with reasoning)
const AI_MODELS = {
  // Most accurate - for deep analysis (verified working)
  ACCURATE: "gpt-5.1-ca", // 2807ms latency
  // Balanced - for generation tasks (verified working)
  BALANCED: "gpt-5-ca", // 1945ms latency
  // Fast - for real-time responses (verified working)
  FAST: "gpt-5-mini-ca", // 1344ms latency
  // Ultra-fast - for instant feedback (FASTEST verified)
  INSTANT: "gpt-4o-mini", // 979ms latency ⚡
  // Reasoning - for complex problem solving (verified with 7079 char reasoning)
  REASONING: "deepseek-r1", // 57910ms but includes chain-of-thought
  // Nano fallback
  NANO: "gpt-5-nano-ca",
};

// Feature-to-Model mapping - optimized based on test results
const FEATURE_MODELS = {
  RESUME_ANALYSIS: AI_MODELS.ACCURATE, // Deep, thorough analysis
  MCQ_GENERATION: AI_MODELS.BALANCED, // Creative, accurate questions
  LIVE_INTERVIEW: AI_MODELS.INSTANT, // Real-time (gpt-4o-mini fastest!)
  FRAUD_DETECTION: AI_MODELS.INSTANT, // Instant risk assessment
  REPORT_GENERATION: AI_MODELS.REASONING, // CEO reports with reasoning
  JOB_MATCHING: AI_MODELS.FAST, // Quick matching
  APPLICANT_RANKING: AI_MODELS.BALANCED, // ATS scoring
};

// TTS API configuration
const TTS_API_URL = "https://api.chatanywhere.tech/v1/audio/speech";

// Fallback to Gemini if ChatAnywhere unavailable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Call AI API with intelligent model selection and multi-fallback
 * Priority: gpt-4o-mini (fastest) → Requested model → Alternative models → Gemini
 * @param {string|Array} messages - Message content or array of messages
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} AI response with content and metadata
 */
export const callGPT5 = async (messages, options = {}) => {
  const {
    temperature = 0.6,
    maxTokens = 4000,
    responseFormat = "text",
    retries = 2,
    model = AI_MODELS.INSTANT, // Default to gpt-4o-mini (fastest!)
    feature = null,
    useReasoning = false, // Force deepseek-r1 for reasoning
    preferSpeed = true, // Prefer faster models
  } = options;

  // Auto-select model based on feature or preferences
  let selectedModel = feature ? FEATURE_MODELS[feature] || model : model;

  // Override for speed if requested
  if (preferSpeed && !useReasoning) {
    selectedModel = AI_MODELS.INSTANT; // gpt-4o-mini (979ms)
  }

  // Override for reasoning tasks
  if (useReasoning) {
    selectedModel = AI_MODELS.REASONING; // deepseek-r1
  }

  // Fallback model chain (fastest to most accurate)
  const FALLBACK_CHAIN = [
    selectedModel,
    AI_MODELS.INSTANT, // gpt-4o-mini (979ms)
    AI_MODELS.FAST, // gpt-5-mini-ca (1344ms)
    AI_MODELS.BALANCED, // gpt-5-ca (1945ms)
    "gemini-1.5-flash", // Gemini fallback
  ];

  // Remove duplicates while preserving order
  const modelsToTry = [...new Set(FALLBACK_CHAIN)];

  // Try ChatAnywhere models
  if (GPT5_API_KEY) {
    for (const modelToTry of modelsToTry) {
      // Skip Gemini in this loop (handled separately)
      if (modelToTry.includes("gemini")) continue;

      try {
        console.log(`🤖 Calling ${modelToTry}...`);
        const startTime = Date.now();

        const response = await fetch(GPT5_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GPT5_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelToTry,
            messages: Array.isArray(messages)
              ? messages
              : [{ role: "user", content: messages }],
            temperature,
            max_tokens: maxTokens,
            ...(responseFormat === "json" && {
              response_format: { type: "json_object" },
            }),
          }),
        });

        const data = await response.json();
        const latency = Date.now() - startTime;

        // Check for rate limit error
        if (
          data.error?.message?.includes("限制") ||
          data.error?.message?.includes("limit")
        ) {
          console.warn(`⚠️ ${modelToTry} rate limited, trying next model...`);
          continue;
        }

        // Check for model not supported
        if (
          data.error?.message?.includes("不支持") ||
          data.error?.message?.includes("not supported")
        ) {
          console.warn(`⚠️ ${modelToTry} not supported, trying next model...`);
          continue;
        }

        if (data.error) {
          console.error(`❌ ${modelToTry} error:`, data.error.message);
          continue;
        }

        const content = data.choices?.[0]?.message?.content;
        const reasoning = data.choices?.[0]?.message?.reasoning_content;

        if (!content) {
          console.error(`❌ ${modelToTry} returned no content`);
          continue;
        }

        console.log(
          `✅ ${modelToTry} response (${data.usage?.total_tokens || 0} tokens, ${latency}ms)`,
        );

        return {
          content,
          reasoning, // Only for deepseek-r1
          model: data.model || modelToTry,
          tokens: data.usage?.total_tokens || 0,
          latency,
          success: true,
        };
      } catch (error) {
        console.error(`❌ ${modelToTry} failed:`, error.message);
        continue;
      }
    }
  }

  // Final fallback: Gemini
  if (GEMINI_API_KEY) {
    try {
      console.log("🤖 Falling back to Gemini...");
      const prompt = Array.isArray(messages)
        ? messages.map((m) => `${m.role}: ${m.content}`).join("\n")
        : messages;

      const startTime = Date.now();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const latency = Date.now() - startTime;

      if (!content) {
        throw new Error("No content in Gemini response");
      }

      console.log(`✅ Gemini response (${latency}ms)`);

      return {
        content,
        model: "gemini-1.5-flash",
        latency,
        success: true,
      };
    } catch (error) {
      console.error("❌ Gemini fallback failed:", error.message);
    }
  }

  throw new Error(
    "All AI services failed - no API keys configured or all models rate limited",
  );
};

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export const parseAIJson = (text) => {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Extract from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try to find JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error("Could not parse JSON from response");
  }
};

/**
 * Generate TTS audio using OpenAI-compatible API
 */
export const generateSpeech = async (text, voice = "alloy") => {
  if (!GPT5_API_KEY) {
    throw new Error("TTS requires GPT5_API_KEY");
  }

  const response = await fetch(TTS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GPT5_API_KEY}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text.substring(0, 4096), // TTS limit
      voice, // alloy, echo, fable, onyx, nova, shimmer
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status}`);
  }

  return response.arrayBuffer();
};

/**
 * Resume Analysis with GPT-5
 */
export const analyzeResumeWithGPT5 = async (
  resumeText,
  jobDescription = "",
) => {
  const systemPrompt = `You are an expert resume analyst, career coach, and ATS (Applicant Tracking System) specialist with 20+ years of experience in recruiting and talent acquisition.

Your analysis must be:
- Accurate and data-driven
- Based on industry standards
- Actionable with specific recommendations
- Fair and unbiased
- SPECIFIC to THIS resume - no generic placeholders

Always return valid JSON with ALL requested fields.`;

  const userPrompt = `Analyze this resume thoroughly and provide a comprehensive evaluation.

RESUME:
"""
${resumeText}
"""

${jobDescription ? `JOB DESCRIPTION FOR MATCHING:\n"""\n${jobDescription}\n"""` : "No specific job provided - analyze for general software/tech roles."}

Return a detailed JSON analysis with ALL of these fields (be specific to this resume):
{
    "score": <0-100 overall score>,
    "overallFit": "<Excellent|Strong|Good|Fair|Needs Improvement>",
    "atsScore": <0-100 ATS compatibility score>,
    
    "candidate": {
        "estimatedExperience": <years>,
        "level": "<Entry|Junior|Mid|Senior|Lead|Principal>",
        "strengths": ["<top 3-5 strengths>"],
        "gaps": ["<areas needing improvement>"]
    },
    
    "skills": {
        "technical": ["<detected technical skills>"],
        "matched": ["<skills matching job if provided>"],
        "missing": ["<required skills not found>"],
        "emerging": ["<modern/in-demand skills detected>"]
    },
    
    "sections": {
        "found": ["contact", "summary", "experience", "education", "skills"],
        "missing": ["<sections that should be added>"],
        "quality": {
            "experience": <1-5>,
            "projects": <1-5>,
            "education": <1-5>
        }
    },
    
    "experience": {
        "totalYears": <estimated>,
        "yearsEstimate": <estimated>,
        "hasQuantifiedResults": <true|false>,
        "impactfulActions": ["<action verbs and results found>"],
        "companies": ["<company names detected>"],
        "level": "<Entry|Mid|Senior>"
    },
    
    "education": {
        "level": "<PhD|Masters|Bachelors|Associate|High School>",
        "field": "<field of study>",
        "institutions": ["<schools/universities>"]
    },
    
    "projects": {
        "count": <number>,
        "hasLinks": <true|false>,
        "technologies": ["<tech used in projects>"]
    },
    
    "scoreBreakdown": {
        "skills": <0-30>,
        "experience": <0-25>,
        "projects": <0-20>,
        "education": <0-15>,
        "ats": <0-10>
    },
    
    "suggestions": [
        "<specific actionable improvement 1>",
        "<specific actionable improvement 2>",
        "<specific actionable improvement 3>",
        "<specific actionable improvement 4>"
    ],
    
    "keyStrengths": [
        "<strength 1 based on this specific resume>",
        "<strength 2 based on this specific resume>",
        "<strength 3 based on this specific resume>"
    ],
    
    "interviewQuestions": [
        {
            "question": "<specific interview question based on their experience>",
            "reason": "<why an interviewer would ask this based on their resume>",
            "howToPrepare": "<specific advice on how to prepare for this question>"
        },
        {
            "question": "<second relevant question>",
            "reason": "<the reasoning behind this question>",
            "howToPrepare": "<preparation tips>"
        },
        {
            "question": "<third relevant question>",
            "reason": "<why this question matters>",
            "howToPrepare": "<how to answer effectively>"
        },
        {
            "question": "<fourth question based on their background>",
            "reason": "<connection to their experience>",
            "howToPrepare": "<specific preparation advice>"
        }
    ],
    
    "quickWins": [
        "<quick fix 1 that can be done in 30 minutes>",
        "<quick fix 2>"
    ],
    
    "learningResources": [
        {
            "skill": "<missing skill from their resume>",
            "resource": "<specific course or resource name>",
            "platform": "<Coursera|Udemy|YouTube|LinkedIn Learning|etc>",
            "priority": "<Critical|High|Medium>",
            "estimatedTime": "<2-4 hours>"
        }
    ],
    
    "competitorComparison": {
        "marketPosition": "<Top 10%|Top 25%|Top 50%|Average|Below Average>",
        "standoutFactor": "<what makes them unique>",
        "competitiveAdvantage": "<their main advantage over other candidates>"
    },
    
    "warnings": [
        "<potential red flags or missing elements>"
    ]
}

IMPORTANT: Make ALL content SPECIFIC to THIS resume. Use actual skills, projects, and experience mentioned. No generic placeholders.`;

  try {
    const result = await callGPT5(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.4,
        maxTokens: 4000,
        feature: "RESUME_ANALYSIS", // Uses gpt-5.1-ca for deep analysis
        preferSpeed: false, // Accuracy over speed
      },
    );

    const analysis = parseAIJson(result.content);
    analysis.source = result.model;
    analysis.analyzedAt = new Date().toISOString();

    return analysis;
  } catch (error) {
    console.error("Resume analysis error:", error);
    throw error;
  }
};

/**
 * Generate Dynamic MCQ Questions with GPT-5
 */
export const generateMCQWithGPT5 = async (
  jobTitle,
  skills,
  experienceLevel = "Mid",
  questionCount = 15,
) => {
  const systemPrompt = `You are an expert technical interviewer and assessment designer. 
Create challenging, realistic interview questions that accurately test candidate knowledge.
Questions must be specific, not generic, and have exactly one correct answer.`;

  const userPrompt = `Generate ${questionCount} multiple choice questions for a job interview assessment.

JOB TITLE: ${jobTitle}
REQUIRED SKILLS: ${skills.join(", ")}
EXPERIENCE LEVEL: ${experienceLevel}

Requirements:
1. Generate EXACTLY ${questionCount} questions
2. Mix of difficulty: 30% easy, 50% medium, 20% hard
3. Categories: 60% technical, 20% problem-solving, 20% situational/behavioral
4. Each question MUST have exactly 4 options
5. Only ONE correct answer per question
6. Questions must be SPECIFIC to ${jobTitle} and the listed skills - NO generic questions

Return JSON:
{
    "questions": [
        {
            "question": "Detailed question text that tests real knowledge?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0,
            "difficulty": "medium",
            "category": "technical",
            "skill": "JavaScript",
            "explanation": "Brief explanation why this answer is correct"
        }
    ],
    "metadata": {
        "totalQuestions": ${questionCount},
        "distribution": {
            "easy": <count>,
            "medium": <count>,
            "hard": <count>
        },
        "skillsCovered": ["<unique skills covered>"]
    }
}`;

  try {
    const result = await callGPT5(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: 6000,
        feature: "MCQ_GENERATION", // Uses gpt-5-ca for creative generation
      },
    );

    const mcqData = parseAIJson(result.content);
    mcqData.generatedBy = result.model;
    mcqData.generatedAt = new Date().toISOString();

    return mcqData;
  } catch (error) {
    console.error("GPT-5 MCQ generation error:", error);
    throw error;
  }
};

/**
 * Live AI Interview - Conversational Response
 */
export const getInterviewResponse = async (
  question,
  candidateAnswer,
  jobContext = "",
  previousQA = [],
) => {
  const systemPrompt = `You are an AI interviewer conducting a live technical interview. 
Be conversational, professional, and encouraging. 
Provide real-time feedback and follow-up questions.
Keep responses concise (2-3 sentences for feedback, then the follow-up).`;

  const contextHistory = previousQA
    .map((qa) => [
      { role: "assistant", content: `Question: ${qa.question}` },
      { role: "user", content: qa.answer },
    ])
    .flat();

  const userPrompt = `Current question asked: "${question}"

Candidate's answer: "${candidateAnswer}"

${jobContext ? `Job context: ${jobContext}` : ""}

Provide:
1. Brief feedback on their answer (what was good, what could be better)
2. A natural follow-up question OR acknowledgment if answer was complete
3. A score from 1-10 for this answer

Return JSON:
{
    "feedback": "<conversational feedback>",
    "followUp": "<follow-up question or acknowledgment>",
    "score": <1-10>,
    "strengths": ["<what they did well>"],
    "improvements": ["<areas to improve>"],
    "shouldContinue": <true if follow-up needed, false if ready for next question>
}`;

  try {
    const result = await callGPT5(
      [
        { role: "system", content: systemPrompt },
        ...contextHistory,
        { role: "assistant", content: `Question: ${question}` },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: 500,
        feature: "LIVE_INTERVIEW", // Uses gpt-5-mini-ca for fast responses
      },
    );

    return parseAIJson(result.content);
  } catch (error) {
    console.error("GPT-5 interview response error:", error);
    return {
      feedback: "I heard your response. Let me process that.",
      followUp: "Could you elaborate on that point?",
      score: 5,
      strengths: [],
      improvements: [],
      shouldContinue: true,
    };
  }
};

/**
 * Enhanced Fraud Detection with AI
 */
export const analyzeFraudWithAI = async (behaviorData, contextData = {}) => {
  const prompt = `Analyze this interview behavior data for potential fraud/cheating indicators.

BEHAVIOR DATA:
- Tab switches: ${behaviorData.tabSwitches || 0}
- Window blurs: ${behaviorData.windowBlurs || 0}
- Copy/paste attempts: ${behaviorData.copyPasteAttempts || 0}
- Rapid answers (< 5 sec): ${behaviorData.rapidAnswers || 0}
- Face detection away: ${behaviorData.faceDetectionAway || 0}%
- Fullscreen exits: ${behaviorData.fullscreenExits || 0}
- Idle periods (> 30s): ${behaviorData.idlePeriods || 0}

CONTEXT:
- Test duration: ${contextData.duration || "Unknown"}
- Total questions: ${contextData.totalQuestions || "Unknown"}
- Test type: ${contextData.testType || "MCQ"}

Provide fraud analysis:
{
    "riskScore": <0-100>,
    "riskLevel": "<low|medium|high|critical>",
    "confidence": <0-100 how confident in assessment>,
    "alerts": [
        {
            "type": "<alert type>",
            "severity": "<low|medium|high|critical>",
            "message": "<human-readable message>",
            "evidence": "<specific data point>"
        }
    ],
    "recommendation": "<proceed|review|flag|reject>",
    "summary": "<1-2 sentence summary>"
}`;

  try {
    const result = await callGPT5(prompt, {
      temperature: 0.2,
      maxTokens: 800,
      feature: "FRAUD_DETECTION", // Uses gpt-5-nano-ca for instant assessment
    });
    return parseAIJson(result.content);
  } catch (error) {
    console.error("GPT-5 fraud analysis error:", error);
    // Return basic algorithmic analysis on error
    return null;
  }
};

/**
 * Generate Interview Report with GPT-5
 */
export const generateReportWithGPT5 = async (interviewData) => {
  const prompt = `Generate a comprehensive interview report for CEO review.

CANDIDATE: ${interviewData.candidateName} (${interviewData.candidateEmail})
POSITION: ${interviewData.jobTitle}
COMPANY: ${interviewData.companyName}
INTERVIEWER: ${interviewData.recruiterName}
DATE: ${interviewData.interviewDate}
DURATION: ${interviewData.interviewDuration}

SCORES:
- MCQ: ${interviewData.mcqScore}/${interviewData.mcqTotal} (${Math.round((interviewData.mcqScore / interviewData.mcqTotal) * 100)}%)
- Resume Score: ${interviewData.resumeScore}/100
- Fraud Risk: ${interviewData.fraudRiskScore}/100

RECRUITER NOTES:
${interviewData.recruiterNotes || "None provided"}

Generate executive summary:
{
    "executiveSummary": "<2-3 paragraph summary for CEO>",
    "overallScore": <0-100>,
    "recommendation": "<Strong Hire|Hire|Maybe|No Hire>",
    "keyStrengths": ["<top 3 strengths>"],
    "concerns": ["<any concerns>"],
    "salaryBand": "<suggested salary range>",
    "fitScore": <0-100>,
    "cultureFit": "<assessment of culture fit>",
    "nextSteps": ["<recommended actions>"]
}`;

  try {
    const result = await callGPT5(prompt, {
      temperature: 0.4,
      maxTokens: 2000,
      useReasoning: true, // Use deepseek-r1 for chain-of-thought reasoning!
      preferSpeed: false, // Accuracy over speed for CEO reports
    });

    const report = parseAIJson(result.content);
    report.generatedBy = result.model;
    report.generatedAt = new Date().toISOString();

    // Include reasoning if available (deepseek-r1)
    if (result.reasoning) {
      report.aiReasoning = result.reasoning;
      console.log(
        `📝 CEO Report includes ${result.reasoning.length} chars of AI reasoning`,
      );
    }

    return report;
  } catch (error) {
    console.error("Report generation error:", error);
    throw error;
  }
};

// Export models and features for external use
export { AI_MODELS, FEATURE_MODELS };

export default {
  callGPT5,
  parseAIJson,
  generateSpeech,
  analyzeResumeWithGPT5,
  generateMCQWithGPT5,
  getInterviewResponse,
  analyzeFraudWithAI,
  generateReportWithGPT5,
  AI_MODELS,
  FEATURE_MODELS,
};
