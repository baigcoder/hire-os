/**
 * Live Interview Route - Real-time AI Voice Interview
 *
 * Features:
 * - ElevenLabs TTS for natural AI voice
 * - GPT-4o-mini for intelligent conversation
 * - Session-based conversation memory
 * - Natural interviewer personality
 */

import express from "express";
import crypto from "crypto";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { callAI, parseAIJson } from "../utils/aiServiceV3.js";
import {
  textToSpeech,
  textToSpeechStream,
  getCharacterUsage,
  hasCharacterBudget,
  VOICES,
  VOICE_OPTIONS,
  getVoiceOptions,
  getLanguages,
  getSpeedPresets,
  getStylePresets,
  LANGUAGES,
} from "../utils/elevenLabsService.js";
import PracticeHistory from "../models/practiceHistory.model.js";

const router = express.Router();

// In-memory session storage (use Redis in production)
const interviewSessions = new Map();

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// AI Interviewer personas
const INTERVIEWER_PERSONAS = {
  technical: {
    name: "Alex",
    personality: `You are Alex, a Senior Technical Interviewer at a top tech company.
You have 15+ years of experience interviewing software engineers at companies like Google, Meta, and Amazon.
Be professional but friendly. Ask follow-up questions to dig deeper. Evaluate technical depth.
Keep responses concise (2-3 sentences) but insightful. Use natural conversational language.`,
    style: "analytical, thorough, but encouraging",
  },
  behavioral: {
    name: "Sarah",
    personality: `You are Sarah, a Talent Acquisition Lead specializing in behavioral interviews.
You're warm, empathetic, and skilled at helping candidates show their best selves.
Use the STAR method to probe deeper into answers. Look for genuine experiences and growth.
Keep responses short (2-3 sentences), positive but honest. Make candidates feel comfortable.`,
    style: "warm, supportive, insightful",
  },
  hr: {
    name: "Michael",
    personality: `You are Michael, an HR Director with expertise in culture fit and career development.
You're professional, straightforward, and focused on mutual fit.
Ask about career goals, work style, and expectations. Be transparent about what you're looking for.
Keep responses brief (2-3 sentences) and authentic. Build rapport naturally.`,
    style: "professional, direct, genuine",
  },
};

/**
 * Start a new interview session
 * POST /api/v1/live-interview/start
 */
router.post("/start", isAuthenticated, async (req, res) => {
  try {
    const {
      type = "behavioral",
      candidateName = "there",
      jobTitle = "Software Developer",
      voiceId = null, // Custom voice selection
      callType = "video", // 'video' or 'audio'
    } = req.body;
    const userId = req.id;

    console.log(
      `🎤 [LiveInterview] Starting ${type} interview for ${candidateName}`,
    );
    console.log(
      `📞 [LiveInterview] Call type: ${callType}, Voice: ${voiceId || "auto"}`,
    );

    // Check character budget
    if (!hasCharacterBudget(500)) {
      return res.status(429).json({
        success: false,
        message:
          "Voice character limit reached for this month. Try again next month.",
        usage: getCharacterUsage(),
      });
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const persona =
      INTERVIEWER_PERSONAS[type] || INTERVIEWER_PERSONAS.behavioral;

    // Determine voice to use
    const selectedVoice =
      voiceId ||
      (type === "behavioral"
        ? VOICES.MATILDA
        : type === "technical"
          ? VOICES.LIAM
          : VOICES.RACHEL);

    console.log(`🔊 [LiveInterview] Selected voice ID: ${selectedVoice}`);

    // Generate personalized greeting
    const greetingPrompt = `You are ${persona.name}. Generate a warm, natural greeting for starting an interview.
Candidate name: ${candidateName}
Position: ${jobTitle}
Interview type: ${type}

Create a greeting that:
- Welcomes them by name
- Introduces yourself briefly
- Sets a comfortable tone
- Mentions this is a practice interview
- Ends with asking if they're ready

Keep it under 150 characters for voice generation.`;

    const greetingResult = await callAI(greetingPrompt, {
      temperature: 0.8,
      maxTokens: 200,
    });

    const greetingText = greetingResult.content.replace(/"/g, "").trim();
    console.log(`💬 [LiveInterview] Greeting: ${greetingText}`);

    // Generate audio for greeting
    let audioData = null;
    try {
      console.log(
        `🎤 [ElevenLabs] Calling TTS API with voice: ${selectedVoice}`,
      );
      audioData = await textToSpeech(greetingText, {
        voiceId: selectedVoice,
      });
      console.log(
        `✅ [ElevenLabs] Audio generated successfully - ${audioData.charCount} chars used`,
      );
    } catch (audioError) {
      console.error(
        "❌ [ElevenLabs] Audio generation failed:",
        audioError.message,
      );
    }

    // Generate first question
    const questionPrompt = `Generate the first interview question for a ${type} interview.
Position: ${jobTitle}
Question should be an icebreaker that helps candidate relax.

Return JSON: { "question": "...", "category": "...", "tips": "..." }`;

    const questionResult = await callAI(questionPrompt, {
      temperature: 0.7,
      maxTokens: 300,
    });

    let firstQuestion;
    try {
      firstQuestion = parseAIJson(questionResult.content);
    } catch {
      firstQuestion = {
        question: "Tell me a bit about yourself and your background.",
        category: "Introduction",
        tips: "Give a brief overview focusing on recent relevant experience",
      };
    }

    // Store session
    const session = {
      id: sessionId,
      userId,
      type,
      candidateName,
      jobTitle,
      persona,
      conversationHistory: [
        { role: "ai", content: greetingText, timestamp: Date.now() },
      ],
      questions: [firstQuestion],
      currentQuestionIndex: 0,
      responses: [],
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    interviewSessions.set(sessionId, session);

    // Clean up old sessions
    cleanupOldSessions();

    console.log(`✅ [LiveInterview] Session ${sessionId} created`);

    res.json({
      success: true,
      sessionId,
      interviewer: {
        name: persona.name,
        type,
      },
      greeting: {
        text: greetingText,
        audioBase64: audioData?.audioBase64 || null,
        audioType: audioData?.audioType || null,
      },
      firstQuestion,
      characterUsage: getCharacterUsage(),
    });
  } catch (error) {
    console.error("❌ [LiveInterview] Start error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start interview",
      error: error.message,
    });
  }
});

/**
 * Process candidate response and get AI reply
 * POST /api/v1/live-interview/respond
 */
router.post("/respond", isAuthenticated, async (req, res) => {
  try {
    const { sessionId, userSpeech, isInterrupt = false } = req.body;

    if (!sessionId || !userSpeech) {
      return res.status(400).json({
        success: false,
        message: "Session ID and user speech are required",
      });
    }

    const session = interviewSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found or expired",
      });
    }

    console.log(
      `🎤 [LiveInterview] User: "${userSpeech.substring(0, 100)}..."`,
    );

    // Check character budget
    if (!hasCharacterBudget(300)) {
      return res.status(429).json({
        success: false,
        message: "Voice character limit reached. Continuing without voice.",
        textOnly: true,
      });
    }

    // Update session activity
    session.lastActivity = Date.now();

    // Add user response to history
    session.conversationHistory.push({
      role: "user",
      content: userSpeech,
      timestamp: Date.now(),
    });

    // Store response
    const currentQuestion = session.questions[session.currentQuestionIndex];
    session.responses.push({
      question: currentQuestion,
      answer: userSpeech,
      timestamp: Date.now(),
    });

    // Build conversation context
    const recentHistory = session.conversationHistory
      .slice(-6)
      .map(
        (msg) =>
          `${msg.role === "ai" ? session.persona.name : "Candidate"}: ${msg.content}`,
      )
      .join("\n");

    // Generate AI response (optimized for speed)
    const responsePrompt = `${session.persona.personality}

Context: ${session.type} interview for ${session.jobTitle}
Candidate said: "${userSpeech}"

Respond naturally in 1-2 SHORT sentences (max 150 chars). Either acknowledge + follow-up OR move to next topic.`;

    const aiResult = await callAI(responsePrompt, {
      temperature: 0.7,
      maxTokens: 120,  // Reduced for faster response
    });

    const aiText = aiResult.content.replace(/"/g, "").trim().substring(0, 180);
    console.log(`💬 [LiveInterview] AI: "${aiText}"`);

    // Generate audio
    let audioData = null;
    try {
      audioData = await textToSpeech(aiText, {
        voiceId: session.type === "behavioral" ? VOICES.BELLA : VOICES.ADAM,
      });
    } catch (audioError) {
      console.error("⚠️ [LiveInterview] Audio failed:", audioError.message);
    }

    // Add AI response to history
    session.conversationHistory.push({
      role: "ai",
      content: aiText,
      timestamp: Date.now(),
    });

    // Determine if we should move to next question
    const questionsAsked = session.responses.length;
    const shouldContinue = questionsAsked < 5; // Limit to 5 questions
    const shouldMoveToNext =
      session.responses.filter(
        (r) => r.question?.question === currentQuestion?.question,
      ).length >= 2; // After 2 exchanges per question, move on

    if (shouldMoveToNext && shouldContinue) {
      session.currentQuestionIndex++;
      // Generate next question if needed
      if (!session.questions[session.currentQuestionIndex]) {
        try {
          const nextQResult = await callAI(
            `Generate the next ${session.type} interview question.
Position: ${session.jobTitle}
This is question ${session.currentQuestionIndex + 1} of 5.
Make it progressively more challenging.
Return JSON: { "question": "...", "category": "...", "tips": "..." }`,
            {
              temperature: 0.7,
              maxTokens: 200,
            },
          );
          session.questions.push(parseAIJson(nextQResult.content));
        } catch {
          session.questions.push({
            question: "What excites you most about this role?",
            category: "Motivation",
            tips: "Show genuine enthusiasm",
          });
        }
      }
    }

    res.json({
      success: true,
      aiResponse: {
        text: aiText,
        audioBase64: audioData?.audioBase64 || null,
        audioType: audioData?.audioType || null,
      },
      progress: {
        currentQuestion: session.currentQuestionIndex + 1,
        totalQuestions: 5,
        shouldContinue,
        nextQuestion: shouldContinue
          ? session.questions[session.currentQuestionIndex]
          : null,
      },
      characterUsage: getCharacterUsage(),
    });
  } catch (error) {
    console.error("❌ [LiveInterview] Respond error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process response",
      error: error.message,
    });
  }
});

/**
 * End interview and get summary
 * POST /api/v1/live-interview/end
 */
router.post("/end", isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = interviewSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    console.log(`🏁 [LiveInterview] Ending session ${sessionId}`);

    // Check participation level
    const userResponses = session.responses.filter(
      (r) => r.answer && r.answer.trim().length > 10,
    );
    const hasParticipated = userResponses.length > 0;
    const participationLevel = userResponses.length;

    // Generate appropriate closing message based on participation
    let closingText;
    if (!hasParticipated) {
      closingText = `Thank you ${session.candidateName} for joining this practice session. It looks like we didn't get to complete the interview today. Feel free to try again whenever you're ready. Good luck with your interview preparation!`;
    } else if (participationLevel === 1) {
      closingText = `Thank you ${session.candidateName} for this brief practice session. We only covered one question, but it's a good start! Consider trying a full interview session for more comprehensive feedback. Good luck!`;
    } else if (participationLevel <= 3) {
      closingText = `Thank you ${session.candidateName} for this interview. We covered ${participationLevel} questions today. You're making progress! Practice makes perfect. Take care and good luck!`;
    } else {
      closingText = `Thank you ${session.candidateName} for this interview. I really enjoyed our conversation and you answered ${participationLevel} questions. You did great! Take care and good luck!`;
    }

    // Generate audio for closing
    let audioData = null;
    try {
      audioData = await textToSpeech(closingText);
    } catch (audioError) {
      console.error("⚠️ [LiveInterview] Closing audio failed");
    }

    // Generate summary and feedback based on participation
    let summaryPrompt;
    if (!hasParticipated) {
      summaryPrompt = `The candidate joined an interview session but did not provide any answers.

Interview Type: ${session.type}
Position: ${session.jobTitle}
Candidate: ${session.candidateName}

Provide a supportive JSON response for a candidate who didn't participate:
{
    "overallScore": 0,
    "grade": "N/A",
    "strengths": ["Took the initiative to start a practice session"],
    "improvements": ["Complete at least one practice question", "Prepare answers beforehand", "Try the session again when ready"],
    "communicationScore": 0,
    "confidenceScore": 0,
    "summary": "The practice session was started but no questions were answered. We encourage you to try again when you're ready to practice.",
    "readyForRealInterview": false,
    "tips": ["Prepare some stories using the STAR method", "Practice speaking your answers out loud", "Try again - practice makes perfect!"]
}`;
    } else {
      summaryPrompt = `Analyze this interview and provide feedback.

Interview Type: ${session.type}
Position: ${session.jobTitle}
Candidate: ${session.candidateName}

Questions and Answers:
${session.responses
          .map(
            (r, i) => `
Q${i + 1}: ${r.question?.question || "Introduction"}
A${i + 1}: ${r.answer}
`,
          )
          .join("\n")}

Provide JSON:
{
    "overallScore": <0-100>,
    "grade": "<A+|A|B+|B|C+|C|D>",
    "strengths": ["<top 3 things done well>"],
    "improvements": ["<top 3 areas to improve>"],
    "communicationScore": <0-100>,
    "confidenceScore": <0-100>,
    "summary": "<2 sentence overall assessment>",
    "readyForRealInterview": <true|false>,
    "tips": ["<3 actionable tips for improvement>"]
}`;
    }

    let summary = {
      overallScore: 70,
      grade: "B",
      strengths: ["Good communication"],
      improvements: ["Be more specific"],
      summary: "Solid interview performance.",
      readyForRealInterview: true,
    };

    try {
      const summaryResult = await callAI(summaryPrompt, {
        temperature: 0.3,
        maxTokens: 600,
      });
      summary = parseAIJson(summaryResult.content);
    } catch (summaryError) {
      console.error("⚠️ [LiveInterview] Summary generation failed");
    }

    // Calculate duration
    const duration = Math.round((Date.now() - session.startTime) / 1000);

    // Save to practice history
    try {
      const historyEntry = new PracticeHistory({
        user: req.id,
        type: "mock_interview",
        score: summary.overallScore || 0,
        grade: summary.grade || "N/A",
        duration,
        sessionId,
        interviewData: {
          interviewType: session.type,
          voiceUsed: session.voiceId || "default",
          language: session.language || "en",
          questionsAnswered: userResponses.length,
          responses: session.responses.map((r) => ({
            question: r.question?.question || "Introduction",
            answer: r.answer || "",
            feedback: r.feedback || "",
          })),
          summary: {
            overallScore: summary.overallScore || 0,
            communicationScore: summary.communicationScore || 0,
            confidenceScore: summary.confidenceScore || 0,
            strengths: summary.strengths || [],
            improvements: summary.improvements || [],
            tips: summary.tips || [],
            readyForRealInterview: summary.readyForRealInterview || false,
          },
        },
      });
      await historyEntry.save();
      console.log(
        `📊 [LiveInterview] Saved to practice history for user ${req.id}`,
      );
    } catch (historyError) {
      console.error(
        "⚠️ [LiveInterview] Failed to save to history:",
        historyError.message,
      );
    }

    // Clean up session
    interviewSessions.delete(sessionId);

    res.json({
      success: true,
      closing: {
        text: closingText,
        audioBase64: audioData?.audioBase64 || null,
        audioType: audioData?.audioType || null,
      },
      summary: {
        ...summary,
        duration,
        questionsAnswered: session.responses.length,
        interviewType: session.type,
      },
      characterUsage: getCharacterUsage(),
    });
  } catch (error) {
    console.error("❌ [LiveInterview] End error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to end interview",
    });
  }
});

/**
 * Get interview status
 * GET /api/v1/live-interview/status/:sessionId
 */
router.get("/status/:sessionId", isAuthenticated, async (req, res) => {
  const session = interviewSessions.get(req.params.sessionId);

  if (!session) {
    return res.json({ success: false, active: false });
  }

  res.json({
    success: true,
    active: true,
    progress: {
      currentQuestion: session.currentQuestionIndex + 1,
      totalQuestions: 5,
      responsesGiven: session.responses.length,
      duration: Math.round((Date.now() - session.startTime) / 1000),
    },
    characterUsage: getCharacterUsage(),
  });
});

/**
 * Get ElevenLabs usage info
 * GET /api/v1/live-interview/usage
 */
router.get("/usage", isAuthenticated, async (req, res) => {
  res.json({
    success: true,
    usage: getCharacterUsage(),
  });
});

/**
 * Get available voices for selection
 * GET /api/v1/live-interview/voices
 */
router.get("/voices", async (req, res) => {
  console.log("🎤 [LiveInterview] Fetching available voices");

  const voices = getVoiceOptions();
  console.log(`✅ [LiveInterview] Returning ${voices.length} voices`);

  res.json({
    success: true,
    voices,
    defaultVoice: "RACHEL",
  });
});

/**
 * Get available languages for multilingual interviews
 * GET /api/v1/live-interview/languages
 */
router.get("/languages", async (req, res) => {
  console.log("🌐 [LiveInterview] Fetching available languages");

  const languages = getLanguages();
  console.log(`✅ [LiveInterview] Returning ${languages.length} languages`);

  res.json({
    success: true,
    languages,
    defaultLanguage: "en",
  });
});

/**
 * Get voice settings options (speed and style presets)
 * GET /api/v1/live-interview/settings
 */
router.get("/settings", async (req, res) => {
  console.log("⚙️ [LiveInterview] Fetching voice settings options");

  res.json({
    success: true,
    speedPresets: [
      { id: "slow", name: "Slow", description: "Clear and deliberate speech" },
      {
        id: "normal",
        name: "Normal",
        description: "Natural conversational pace",
      },
      { id: "fast", name: "Fast", description: "Quick and dynamic speech" },
    ],
    stylePresets: [
      {
        id: "professional",
        name: "Professional",
        description: "Formal and clear",
      },
      { id: "casual", name: "Casual", description: "Relaxed and friendly" },
      {
        id: "expressive",
        name: "Expressive",
        description: "Animated and varied",
      },
    ],
    defaults: {
      speed: "normal",
      style: "professional",
    },
  });
});

/**
 * Stream audio response (for longer texts)
 * POST /api/v1/live-interview/stream
 */
router.post("/stream", isAuthenticated, async (req, res) => {
  try {
    const {
      text,
      voiceId,
      language = "en",
      speedPreset = "normal",
      stylePreset = "professional",
    } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required for streaming",
      });
    }

    console.log(
      `🔊 [LiveInterview] Streaming audio: ${text.length} chars, lang=${language}`,
    );

    // Set headers for streaming audio
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");

    try {
      const stream = await textToSpeechStream(text, {
        voiceId: voiceId || VOICES.RACHEL,
        language,
        speedPreset,
        stylePreset,
      });

      // Pipe the stream to response
      stream.pipe(res);

      stream.on("end", () => {
        console.log("✅ [LiveInterview] Stream completed");
      });

      stream.on("error", (error) => {
        console.error("❌ [LiveInterview] Stream error:", error.message);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Stream error" });
        }
      });
    } catch (streamError) {
      console.error(
        "❌ [LiveInterview] Stream setup error:",
        streamError.message,
      );
      res.status(500).json({
        success: false,
        message: "Failed to start audio stream",
        error: streamError.message,
      });
    }
  } catch (error) {
    console.error("❌ [LiveInterview] Stream route error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stream audio",
      error: error.message,
    });
  }
});

/**
 * Clean up expired sessions
 */
function cleanupOldSessions() {
  const now = Date.now();
  for (const [sessionId, session] of interviewSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(
        `🧹 [LiveInterview] Cleaning up expired session ${sessionId}`,
      );
      interviewSessions.delete(sessionId);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupOldSessions, 5 * 60 * 1000);

export default router;
