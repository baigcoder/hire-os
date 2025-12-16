/**
 * Mock Interview AI Routes
 * Live AI-powered interview practice with GPT-5
 */

import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { callGPT5, parseAIJson, getInterviewResponse, AI_MODELS } from '../utils/aiService.js';

const router = express.Router();

/**
 * Generate interview questions dynamically
 * POST /api/v1/mock-interview/generate-questions
 */
router.post('/generate-questions', isAuthenticated, async (req, res) => {
    try {
        const { type = 'behavioral', jobTitle = 'Software Developer', skills = [], candidateName = 'there' } = req.body;
        console.log(`🎤 [Interview] Generating ${type} questions for ${jobTitle}`);

        const prompts = {
            behavioral: `Generate 5 behavioral interview questions using the STAR method. Focus on leadership, teamwork, conflict resolution, and problem-solving for a ${jobTitle} role.`,
            technical: `Generate 5 technical interview questions for ${jobTitle}. Cover ${skills.length > 0 ? skills.join(', ') : 'data structures, algorithms, system design'}.`,
            hr: `Generate 5 HR interview questions about career goals, salary expectations, company fit for a ${jobTitle} position.`,
            mixed: `Generate 5 mixed interview questions (2 behavioral, 2 technical, 1 HR) for ${jobTitle}.`
        };

        const result = await callGPT5(`You are an experienced, friendly interviewer. ${prompts[type] || prompts.behavioral}

IMPORTANT: 
- Questions should feel natural, like a real conversation
- Start with easier questions to build confidence
- Questions should test real skills, not memorization

Return JSON array:
[
    {
        "question": "The interview question (conversational tone)",
        "category": "Leadership|Technical|HR|Problem-Solving",
        "tips": "What makes a great answer",
        "difficulty": "easy|medium|hard",
        "followUp": "A natural follow-up question to dig deeper"
    }
]

Also include an introduction as the first item:
{
    "question": "Hello ${candidateName}! I'm Alex, your AI interviewer today. Thank you for joining this ${type} interview session. Before we begin, take a moment to relax - this is a safe space to practice. Are you ready to start?",
    "category": "Introduction",
    "tips": "Respond naturally, greet back, and confirm you're ready",
    "difficulty": "intro",
    "followUp": null
}`, {
            temperature: 0.7,
            maxTokens: 2000,
            feature: 'LIVE_INTERVIEW'
        });

        const questions = parseAIJson(result.content);
        console.log(`✅ [Interview] Generated ${questions.length} questions using ${result.model}`);

        res.json({
            success: true,
            questions,
            generatedBy: result.model,
            interviewType: type,
            aiName: 'Alex' // AI interviewer name
        });

    } catch (error) {
        console.error('❌ [Interview] Generate questions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate questions',
            fallback: true
        });
    }
});

/**
 * Get AI feedback for a candidate's response
 * POST /api/v1/mock-interview/feedback
 */
router.post('/feedback', isAuthenticated, async (req, res) => {
    try {
        const { question, answer, jobContext = '', previousQA = [] } = req.body;

        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: 'Question and answer are required'
            });
        }

        // Use the specialized interview response function
        const feedback = await getInterviewResponse(question, answer, jobContext, previousQA);

        res.json({
            success: true,
            feedback
        });

    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate feedback'
        });
    }
});

/**
 * Get overall interview assessment
 * POST /api/v1/mock-interview/assessment
 */
router.post('/assessment', isAuthenticated, async (req, res) => {
    try {
        const { responses, interviewType = 'mixed' } = req.body;

        if (!responses || responses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No responses to assess'
            });
        }

        const prompt = `Analyze this mock interview performance and provide comprehensive feedback.

INTERVIEW TYPE: ${interviewType}

QUESTIONS AND ANSWERS:
${responses.map((r, i) => `
Q${i + 1}: ${r.question}
A${i + 1}: ${r.answer}
Score: ${r.score || 'N/A'}/10
`).join('\n')}

Provide overall assessment JSON:
{
    "overallScore": <0-100>,
    "grade": "<A+|A|B+|B|C+|C|D|F>",
    "verdict": "<Exceptional|Strong|Good|Average|Needs Improvement>",
    "strengths": ["Top 3 things done well"],
    "areasToImprove": ["Top 3 areas to work on"],
    "communicationScore": <0-100>,
    "technicalScore": <0-100>,
    "confidenceScore": <0-100>,
    "starMethodUsage": <0-100>,
    "recommendations": ["Specific action items"],
    "readyForRealInterview": <true|false>,
    "summary": "2-3 sentence overall summary"
}`;

        const result = await callGPT5(prompt, {
            temperature: 0.3,
            maxTokens: 1000,
            feature: 'RESUME_ANALYSIS' // Using accurate model for assessment
        });

        const assessment = parseAIJson(result.content);
        assessment.generatedBy = result.model;

        res.json({
            success: true,
            assessment
        });

    } catch (error) {
        console.error('Assessment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate assessment'
        });
    }
});

/**
 * Real-time conversational AI response
 * POST /api/v1/mock-interview/chat
 */
router.post('/chat', isAuthenticated, async (req, res) => {
    try {
        const { message, context = '', conversationHistory = [] } = req.body;

        const messages = [
            {
                role: 'system',
                content: `You are an experienced interviewer conducting a live mock interview. 
Be professional, encouraging, and provide helpful feedback.
Keep responses concise (2-3 sentences).
${context ? `Interview context: ${context}` : ''}`
            },
            ...conversationHistory.map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.content
            })),
            { role: 'user', content: message }
        ];

        const result = await callGPT5(messages, {
            temperature: 0.7,
            maxTokens: 200,
            model: AI_MODELS.CHAT // Use chat-optimized model
        });

        res.json({
            success: true,
            response: result.content,
            model: result.model
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI response'
        });
    }
});

export default router;
