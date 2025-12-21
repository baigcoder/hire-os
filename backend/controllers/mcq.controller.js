import { MCQTest } from "../models/mcq.model.js";
import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { sendInterviewReminder } from "../utils/email.js";
// Use aiServiceV3 for optimized multi-provider support (GPT, Groq, Gemini)
import {
  callAI,
  parseAIJson,
  generateMCQ as generateMCQFromService,
} from "../utils/aiServiceV3.js";

// Initialize AI config - fallback key for Gemini if primary providers fail
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper function to call AI (uses gpt-4o-mini, NOT gpt-5-ca)
const generateMCQWithAI = async (
  jobTitle,
  skills,
  experienceLevel,
  questionCount = 15,
) => {
  try {
    console.log(
      "🚀 [AI DYNAMIC] Generating INDUSTRIAL-STANDARD MCQ with gpt-4o-mini...",
    );

    const systemPrompt = `You are an Elite Technical Interview Assessor with 20+ years experience at FAANG companies (Google, Meta, Amazon, Apple, Netflix) and top tech firms (Microsoft, Stripe, Airbnb).

YOUR EXPERTISE:
- Technical screening for software engineering roles across all levels
- Designing assessments that accurately predict job performance
- Creating questions that differentiate capable candidates from exceptional ones
- Balancing theoretical knowledge with practical application skills

CRITICAL REQUIREMENTS FOR MCQ GENERATION:
1. REAL-WORLD FOCUSED: Every question should test skills that matter in actual job scenarios
2. AVOID TRICK QUESTIONS: Questions should be clear and unambiguous
3. PLAUSIBLE DISTRACTORS: Wrong answers should be common misconceptions or mistakes, not obviously wrong
4. PROGRESSIVE DIFFICULTY: Start easier to build confidence, then increase complexity
5. CODE SNIPPETS: For coding questions, include actual code (properly escaped)
6. EXPLANATIONS: Every question MUST have a detailed explanation of why the correct answer is right
7. INDUSTRY RELEVANCE: Questions should reflect current industry practices, not outdated concepts`;

    const userPrompt = `Generate EXACTLY ${questionCount} HIGH-QUALITY multiple choice questions for a professional job assessment.

═══════════════════════════════════════════
JOB CONTEXT:
═══════════════════════════════════════════
Position: ${jobTitle}
Required Skills: ${skills.slice(0, 8).join(", ")}
Experience Level: ${experienceLevel}

═══════════════════════════════════════════
QUESTION DISTRIBUTION (MANDATORY):
═══════════════════════════════════════════

DIFFICULTY MIX (${questionCount} total):
- Easy (Fundamentals): 4 questions - Test basic concepts and terminology
- Medium (Application): 7 questions - Test ability to apply concepts
- Hard (Analysis/Problem-Solving): 4 questions - Test deep understanding and complex scenarios

CATEGORY MIX:
1. TECHNICAL KNOWLEDGE (6 questions):
   - Core concepts of ${skills[0] || "primary skill"}
   - Best practices and design patterns
   - Common pitfalls and how to avoid them

2. CODING/IMPLEMENTATION (4 questions):
   - Include actual code snippets
   - Debug scenarios (find the bug)
   - Output prediction
   - Code optimization

3. SYSTEM DESIGN & ARCHITECTURE (2 questions):
   - Scalability considerations
   - Trade-offs between approaches
   - Real-world architecture decisions

4. BEHAVIORAL/SITUATIONAL (2 questions):
   - Team collaboration scenarios
   - Problem-solving approaches
   - Communication and decision-making

5. DOMAIN-SPECIFIC (1 question):
   - Industry-specific knowledge for ${jobTitle}

═══════════════════════════════════════════
QUESTION QUALITY REQUIREMENTS:
═══════════════════════════════════════════

For EACH question:
- Question text must be clear and specific (no ambiguity)
- All 4 options must be plausible (no obviously wrong answers)
- Exactly ONE correct answer
- Include context/scenario when helpful
- For code questions, use proper formatting
- Explanation must teach WHY the answer is correct

═══════════════════════════════════════════
RESPONSE FORMAT (STRICT JSON):
═══════════════════════════════════════════

Return ONLY valid JSON with this exact structure:
{
    "questions": [
        {
            "question": "Clear question text. For code questions, include the code block here.",
            "options": ["Option A - must be plausible", "Option B - must be plausible", "Option C - must be plausible", "Option D - must be plausible"],
            "correctAnswer": 0,
            "difficulty": "easy|medium|hard",
            "category": "technical|coding|system-design|behavioral|domain",
            "skill": "${skills[0] || "general"}",
            "explanation": "Detailed explanation of why the correct answer is right and why other options are wrong. This helps candidates learn from the assessment.",
            "timeEstimate": 60
        }
    ]
}

IMPORTANT:
- correctAnswer is 0-indexed (0 = first option, 1 = second, etc.)
- timeEstimate is in seconds (30-120 based on difficulty)
- Escape all special characters in JSON properly
- DO NOT include any text outside the JSON object`;

    const result = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.75, // Slightly higher for variety
        maxTokens: 8000, // More tokens for detailed explanations
        feature: "MCQ_GENERATION",
      },
    );

    const parsed = parseAIJson(result.content);
    console.log(
      `✅ [AI DYNAMIC] Industrial-standard MCQ generated using ${result.model} (${result.latency}ms)`,
    );
    console.log(`   📊 Questions: ${parsed.questions?.length || 0}`);

    // Validate and enhance questions
    const enhancedQuestions = (parsed.questions || []).map((q, idx) => ({
      ...q,
      index: idx,
      timeEstimate:
        q.timeEstimate ||
        (q.difficulty === "hard" ? 120 : q.difficulty === "medium" ? 90 : 60),
    }));

    return {
      questions: enhancedQuestions,
      model: result.model,
      latency: result.latency,
    };
  } catch (error) {
    console.log(
      "⚠️ [AI] Primary model failed, trying Gemini fallback:",
      error.message,
    );
    // Fallback to Gemini
    if (GEMINI_API_KEY) {
      return await generateWithGemini(
        jobTitle,
        skills,
        experienceLevel,
        questionCount,
      );
    }
    throw new Error("No AI service available");
  }
};

// Gemini fallback function
const generateWithGemini = async (
  jobTitle,
  skills,
  experienceLevel,
  questionCount,
) => {
  const prompt = `Generate exactly ${questionCount} multiple choice questions for a job interview assessment.

Job Title: ${jobTitle}
Required Skills: ${skills.join(", ")}
Experience Level: ${experienceLevel}

Requirements:
1. Generate EXACTLY ${questionCount} questions
2. Mix of difficulty: 5 easy, 7 medium, 3 hard
3. Categories: 10 technical questions, 3 problem-solving, 2 situational
4. Each question must have exactly 4 options
5. Only ONE correct answer per question

Return as JSON array with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "difficulty": "medium",
      "category": "technical"
    }
  ]
}

Make questions specific to ${jobTitle} role and ${skills.slice(0, 3).join(", ")} skills.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No content generated");
    }

    return { questions: JSON.parse(text).questions, model: "gemini-1.5-flash" };
  } catch (error) {
    console.error("Gemini MCQ error:", error);
    throw error;
  }
};

// Generate MCQ test for a candidate
export const generateMCQTest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const recruiterId = req.id;

    // Get application with job details
    const application = await Application.findById(applicationId)
      .populate("job")
      .populate("applicant");

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
        success: false,
      });
    }

    // Check if test already exists
    const existingTest = await MCQTest.findOne({
      applicationId,
      status: { $in: ["pending", "in_progress"] },
    });

    if (existingTest) {
      return res.status(400).json({
        message: "An active MCQ test already exists for this application",
        success: false,
        testId: existingTest._id,
      });
    }

    const job = application.job;
    const skills = job.skills || job.requirements || [];
    const experienceLevel = job.experienceLevel || "Entry to Mid";

    console.log("🧠 [AI DYNAMIC] Generating MCQ test with AI...");
    console.log(`   📝 Job: ${job.title}`);
    console.log(`   🎯 Skills: ${skills.slice(0, 5).join(", ")}`);

    let questions;
    let generatedBy = "ai-dynamic";

    try {
      // Use unified AI function (GPT-5 first, then Gemini)
      const result = await generateMCQWithAI(
        job.title,
        skills,
        experienceLevel,
        15,
      );
      questions = result.questions;
      generatedBy = result.model;
      console.log(`✅ [AI DYNAMIC] MCQ generated using ${generatedBy}`);
      console.log(`   📊 Questions: ${questions.length} total`);
    } catch (aiError) {
      console.log(
        "⚠️ [AI RETRY] First attempt failed, retrying with Gemini...",
      );

      // Retry with Gemini only - NO static fallback
      try {
        const retryResult = await generateWithGemini(
          job.title,
          skills,
          experienceLevel,
          15,
        );
        questions = retryResult.questions;
        generatedBy = "gemini-retry";
        console.log(`✅ [AI DYNAMIC] MCQ generated on retry using Gemini`);
      } catch (retryError) {
        console.error(
          "❌ [AI ERROR] All AI attempts failed:",
          retryError.message,
        );
        return res.status(503).json({
          message:
            "AI service temporarily unavailable. Please try again in a moment.",
          success: false,
          error: "AI generation failed after retries",
        });
      }
    }

    // Create MCQ test
    const mcqTest = await MCQTest.create({
      applicationId,
      jobId: job._id,
      candidateId: application.applicant._id,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty || "medium",
        category: q.category || "technical",
        skill: q.skill || null,
        explanation: q.explanation || null,
      })),
      totalQuestions: questions.length,
      duration: 30, // 30 minutes
      passingScore: 60,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to take test
      generatedBy,
      jobSkills: skills,
    });

    // Update application status
    application.status = "mcq_pending";
    await application.save();

    // Notify candidate
    await Notification.create({
      userId: application.applicant._id,
      type: "mcq_test",
      title: "MCQ Test Available",
      message: `Your MCQ test for ${job.title} is ready. Complete it within 7 days.`,
      relatedEntities: {
        applicationId,
        mcqTestId: mcqTest._id,
        jobId: job._id,
      },
    });

    console.log("✅ MCQ test created:", mcqTest._id);

    return res.status(201).json({
      message: "MCQ test generated successfully",
      success: true,
      test: {
        _id: mcqTest._id,
        totalQuestions: mcqTest.totalQuestions,
        duration: mcqTest.duration,
        passingScore: mcqTest.passingScore,
        expiresAt: mcqTest.expiresAt,
      },
    });
  } catch (error) {
    console.error("Generate MCQ test error:", error);
    return res.status(500).json({
      message: "Failed to generate MCQ test",
      success: false,
    });
  }
};

// Get MCQ test for candidate to take
export const getMCQTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const candidateId = req.id;

    const test = await MCQTest.findById(testId)
      .populate("jobId", "title company")
      .populate("applicationId", "status");

    if (!test) {
      return res.status(404).json({
        message: "Test not found",
        success: false,
      });
    }

    // Verify ownership
    if (test.candidateId.toString() !== candidateId) {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    // Check if expired
    if (test.isExpired()) {
      test.status = "expired";
      await test.save();
      return res.status(400).json({
        message: "This test has expired",
        success: false,
      });
    }

    // If pending, mark as started
    if (test.status === "pending") {
      test.status = "in_progress";
      test.startedAt = new Date();
      await test.save();
    }

    // Don't send correct answers to client
    const clientQuestions = test.questions.map((q, index) => ({
      index,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      category: q.category,
      candidateAnswer: q.candidateAnswer,
    }));

    return res.status(200).json({
      success: true,
      test: {
        _id: test._id,
        jobTitle: test.jobId?.title,
        questions: clientQuestions,
        totalQuestions: test.totalQuestions,
        duration: test.duration,
        startedAt: test.startedAt,
        timeRemaining: test.timeRemaining,
        status: test.status,
        tabSwitchCount: test.tabSwitchCount,
        maxTabSwitches: test.maxTabSwitches,
      },
    });
  } catch (error) {
    console.error("Get MCQ test error:", error);
    return res.status(500).json({
      message: "Failed to fetch test",
      success: false,
    });
  }
};

// Submit answer for a question
export const submitAnswer = async (req, res) => {
  try {
    const { testId } = req.params;
    const { questionIndex, answer, timeSpent } = req.body;
    const candidateId = req.id;

    const test = await MCQTest.findById(testId);

    if (!test || test.candidateId.toString() !== candidateId) {
      return res.status(404).json({
        message: "Test not found",
        success: false,
      });
    }

    if (test.status !== "in_progress") {
      return res.status(400).json({
        message: "Test is not in progress",
        success: false,
      });
    }

    if (test.isExpired()) {
      test.status = "expired";
      await test.save();
      return res.status(400).json({
        message: "Test time expired",
        success: false,
      });
    }

    // Update answer
    if (questionIndex >= 0 && questionIndex < test.questions.length) {
      test.questions[questionIndex].candidateAnswer = answer;
      test.questions[questionIndex].isCorrect =
        test.questions[questionIndex].correctAnswer === answer;
      test.questions[questionIndex].timeSpent = timeSpent || 0;
      await test.save();
    }

    return res.status(200).json({
      message: "Answer saved",
      success: true,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return res.status(500).json({
      message: "Failed to save answer",
      success: false,
    });
  }
};

// Submit complete test
export const submitMCQTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers, tabSwitches, suspiciousEvents } = req.body;
    const candidateId = req.id;

    const test = await MCQTest.findById(testId)
      .populate("jobId", "title company")
      .populate("applicationId");

    if (!test || test.candidateId.toString() !== candidateId) {
      return res.status(404).json({
        message: "Test not found",
        success: false,
      });
    }

    if (test.status !== "in_progress") {
      return res.status(400).json({
        message: "Test is not in progress",
        success: false,
      });
    }

    // Update all answers
    if (answers && Array.isArray(answers)) {
      answers.forEach((ans, index) => {
        if (index < test.questions.length && ans !== null) {
          test.questions[index].candidateAnswer = ans;
          test.questions[index].isCorrect =
            test.questions[index].correctAnswer === ans;
        }
      });
    }

    // Log suspicious activity
    test.tabSwitchCount = tabSwitches || test.tabSwitchCount;
    if (suspiciousEvents && Array.isArray(suspiciousEvents)) {
      suspiciousEvents.forEach((event) => {
        test.logSuspiciousActivity(event.type, event.details);
      });
    }

    // Complete the test
    test.completedAt = new Date();
    test.status = test.score >= test.passingScore ? "passed" : "failed";
    await test.save();

    // Update application status
    const application = test.applicationId;
    if (test.status === "passed") {
      application.status = "mcq_passed";

      // Notify recruiter
      await Notification.create({
        userId: application.job?.created_by,
        type: "mcq_passed",
        title: "Candidate Passed MCQ",
        message: `Candidate passed MCQ test for ${test.jobId?.title} with ${test.score}% score`,
        relatedEntities: {
          applicationId: application._id,
          mcqTestId: test._id,
        },
      });
    } else {
      application.status = "mcq_failed";
    }
    await application.save();

    // Notify candidate
    await Notification.create({
      userId: candidateId,
      type: test.status === "passed" ? "mcq_result_pass" : "mcq_result_fail",
      title: test.status === "passed" ? "🎉 You Passed!" : "MCQ Result",
      message:
        test.status === "passed"
          ? `Congratulations! You scored ${test.score}% and qualified for the next round.`
          : `You scored ${test.score}%. Unfortunately, the passing score is ${test.passingScore}%.`,
      relatedEntities: {
        applicationId: application._id,
        mcqTestId: test._id,
      },
    });

    console.log(
      `✅ MCQ test submitted: ${test._id}, Score: ${test.score}%, Status: ${test.status}`,
    );

    return res.status(200).json({
      message:
        test.status === "passed"
          ? "Congratulations! You passed the test!"
          : "Test completed. Unfortunately, you did not meet the passing score.",
      success: true,
      result: {
        score: test.score,
        correctAnswers: test.correctAnswers,
        totalQuestions: test.totalQuestions,
        passed: test.status === "passed",
        passingScore: test.passingScore,
      },
    });
  } catch (error) {
    console.error("Submit test error:", error);
    return res.status(500).json({
      message: "Failed to submit test",
      success: false,
    });
  }
};

// Report suspicious activity
export const reportSuspiciousActivity = async (req, res) => {
  try {
    const { testId } = req.params;
    const { type, details } = req.body;
    const candidateId = req.id;

    const test = await MCQTest.findById(testId);

    if (!test || test.candidateId.toString() !== candidateId) {
      return res.status(404).json({
        message: "Test not found",
        success: false,
      });
    }

    test.logSuspiciousActivity(type, details);
    await test.save();

    // Warn if too many tab switches
    if (test.tabSwitchCount >= test.maxTabSwitches) {
      return res.status(200).json({
        message:
          "Warning: Multiple tab switches detected. Your test may be flagged.",
        success: true,
        warning: true,
        tabSwitches: test.tabSwitchCount,
      });
    }

    return res.status(200).json({
      message: "Activity logged",
      success: true,
      tabSwitches: test.tabSwitchCount,
    });
  } catch (error) {
    console.error("Report suspicious activity error:", error);
    return res.status(500).json({
      message: "Failed to log activity",
      success: false,
    });
  }
};

// Get test results (for recruiter)
export const getMCQTestResults = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await MCQTest.findById(testId)
      .populate("candidateId", "fullname email profile")
      .populate("jobId", "title")
      .populate("applicationId", "status createdAt");

    if (!test) {
      return res.status(404).json({
        message: "Test not found",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      result: {
        candidate: test.candidateId,
        job: test.jobId,
        score: test.score,
        correctAnswers: test.correctAnswers,
        totalQuestions: test.totalQuestions,
        passingScore: test.passingScore,
        passed: test.status === "passed",
        status: test.status,
        duration: test.duration,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
        tabSwitchCount: test.tabSwitchCount,
        suspiciousActivity: test.suspiciousActivity,
        questions: test.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          candidateAnswer: q.candidateAnswer,
          isCorrect: q.isCorrect,
          difficulty: q.difficulty,
          category: q.category,
        })),
      },
    });
  } catch (error) {
    console.error("Get test results error:", error);
    return res.status(500).json({
      message: "Failed to fetch results",
      success: false,
    });
  }
};

// NOTE: Static fallback questions have been REMOVED
// All MCQ generation is now 100% AI-powered (GPT-5 or Gemini)
// If AI fails, user receives error message instead of static questions
