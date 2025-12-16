import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { User } from '../models/user.model.js';
import { callAI, parseAIJson } from '../utils/aiServiceV3.js';

const router = express.Router();

async function generateMCQWithAI(prompt, topic) {
    console.log('🔥 [MCQ AI] Starting AI generation for topic:', topic);
    const startTime = Date.now();

    try {
        console.log('🤖 [MCQ AI] Calling gpt-4o-mini...');
        const response = await callAI([
            {
                role: 'system',
                content: 'You are an expert interview question designer. Generate realistic MCQ questions based on the user prompt. Always follow the requested JSON schema exactly and do not add any text outside JSON.'
            },
            {
                role: 'user',
                content: prompt
            }
        ], {
            temperature: 0.6,
            maxTokens: 2500,
            feature: 'MCQ_GENERATION'
        });

        if (response && response.content) {
            const responseTime = Date.now() - startTime;
            console.log(`✅ [MCQ AI] Response from gpt-4o-mini (${responseTime}ms)`);
            console.log(`📊 [MCQ AI] Response length: ${response.content.length} chars`);
            const parsed = parseAIJson(response.content);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (Array.isArray(parsed.questions)) {
                return parsed.questions;
            }
            throw new Error('MCQ AI response did not contain questions array');
        }
    } catch (error) {
        console.log('⚠️ [MCQ AI] gpt-4o-mini failed:', error.message);
    }

    // Fallback to Gemini if available
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
        try {
            console.log('🔄 [MCQ AI] Trying Gemini fallback...');
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                })
            });

            const data = await response.json();
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const responseTime = Date.now() - startTime;
                console.log(`✅ [MCQ AI] Response from Gemini (${responseTime}ms)`);
                const text = data.candidates[0].content.parts[0].text;
                const parsed = parseAIJson(text);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
                if (Array.isArray(parsed.questions)) {
                    return parsed.questions;
                }
                throw new Error('Gemini MCQ response did not contain questions array');
            }
        } catch (error) {
            console.log('⚠️ [MCQ AI] Gemini failed:', error.message);
        }
    }

    console.log('❌ [MCQ AI] All AI providers failed');
    throw new Error('All AI providers failed');
}

// Store practice tests in memory (consider MongoDB for production)
const practiceTestsStore = new Map();

// Practice test categories
const CATEGORIES = {
    'technical': {
        topics: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Data Structures', 'Algorithms'],
        description: 'Programming & Technical Skills'
    },
    'hr': {
        topics: ['Behavioral', 'Situational', 'Teamwork', 'Leadership', 'Problem Solving'],
        description: 'HR & Behavioral Interview'
    },
    'aptitude': {
        topics: ['Logical Reasoning', 'Quantitative', 'Verbal', 'Data Interpretation'],
        description: 'Aptitude & Reasoning'
    },
    'domain': {
        topics: ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data Science', 'Mobile Development'],
        description: 'Domain Specific'
    }
};

// Generate practice MCQ test
router.post('/mcq/generate', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;
        const {
            category = 'technical',
            topic = null,
            difficulty = 'medium',
            questionCount = 10,
            timeLimit = 15 // minutes
        } = req.body;

        // Get user's skills for personalization
        const user = await User.findById(userId).select('profile.skills fullname profile.experienceYears');
        const userSkills = user?.profile?.skills || [];
        const experienceYears = user?.profile?.experienceYears || null;

        // Determine test topic
        const categoryData = CATEGORIES[category] || CATEGORIES.technical;
        const selectedTopic = topic || (userSkills.length > 0
            ? userSkills[Math.floor(Math.random() * userSkills.length)]
            : categoryData.topics[Math.floor(Math.random() * categoryData.topics.length)]);

        const difficultyDescriptions = {
            easy: 'entry-level concepts, suitable for beginners and freshers',
            medium: 'intermediate level, testing practical knowledge for 1-3 years of experience',
            hard: 'senior level concepts, testing deep understanding and edge cases for 4+ years of experience'
        };

        const prompt = `You are an expert technical interviewer. Generate exactly ${questionCount} high-quality multiple choice questions for a REAL job interview practice test.

Topic: ${selectedTopic}
Category: ${categoryData.description}
Difficulty: ${difficultyDescriptions[difficulty] || difficultyDescriptions.medium}
CandidateSkills: ${userSkills.join(', ') || 'Not specified'}
CandidateExperienceYears: ${experienceYears ?? 'Not specified'}

IMPORTANT: Generate questions that are actually asked in real technical interviews at top companies like Google, Microsoft, Amazon, Meta, etc.

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks, no explanation outside the JSON):
[
  {
    "id": 1,
    "question": "Detailed, practical question that tests real understanding?",
    "options": ["Correct answer", "Plausible wrong answer 1", "Plausible wrong answer 2", "Plausible wrong answer 3"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this is correct and why other options are wrong",
    "difficulty": "${difficulty}"
  }
]

Requirements:
- Questions MUST feel like real interview questions at modern tech companies
- Focus on practical problem-solving, debugging, and real-world tradeoffs
- Include short code snippets or scenarios where appropriate (plain text, no markdown)
- All 4 options should be plausible and non-trivial
- correctAnswer is the 0-based index of the correct option
- Explanations should clearly teach why the answer is correct and others are wrong
- Include scenario-based questions like "What happens when..." or "Which approach would you use..."
- Adapt difficulty so that at least 40% of the questions match the candidate skills
- For ${selectedTopic}, focus on commonly asked interview topics`;

        let questions = [];
        console.log('📝 [MCQ] Generating questions for:', selectedTopic, '| Difficulty:', difficulty);

        try {
            const aiQuestions = await generateMCQWithAI(prompt, selectedTopic);

            questions = aiQuestions
                .map((q, index) => {
                    const options = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
                    const safeOptions = options.length === 4 ? options : options.concat(
                        Array(Math.max(0, 4 - options.length)).fill('Option')
                    ).slice(0, 4);

                    let correctAnswer = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
                    if (correctAnswer < 0 || correctAnswer >= safeOptions.length) {
                        correctAnswer = 0;
                    }

                    const difficultyValue = q.difficulty || difficulty;

                    return {
                        id: q.id || index + 1,
                        question: String(q.question || '').trim(),
                        options: safeOptions.map(o => String(o)),
                        correctAnswer,
                        explanation: q.explanation || 'Review the concepts behind this question to understand why this option is correct.',
                        difficulty: difficultyValue
                    };
                })
                .filter(q =>
                    q.question &&
                    Array.isArray(q.options) &&
                    q.options.length === 4
                )
                .slice(0, questionCount);

            console.log(`✅ [MCQ] Prepared ${questions.length} validated questions from AI`);

        } catch (error) {
            console.error('❌ [MCQ] AI generation failed:', error.message);
            questions = generateFallbackQuestions(selectedTopic, difficulty, questionCount);
        }

        // Ensure we have minimum questions
        if (questions.length < 5) {
            questions = generateFallbackQuestions(selectedTopic, difficulty, questionCount);
        }

        // Create practice test session
        const testId = `practice_${userId}_${Date.now()}`;
        const test = {
            testId,
            userId,
            category,
            topic: selectedTopic,
            difficulty,
            questions: questions.map((q, idx) => ({
                ...q,
                id: idx + 1,
                userAnswer: null
            })),
            totalQuestions: questions.length,
            timeLimit,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + timeLimit * 60 * 1000),
            status: 'in_progress'
        };

        practiceTestsStore.set(testId, test);

        // Return test without correct answers
        const testForCandidate = {
            ...test,
            questions: test.questions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options,
                difficulty: q.difficulty
            }))
        };

        res.status(200).json({
            success: true,
            message: 'Practice test generated successfully',
            test: testForCandidate
        });

    } catch (error) {
        console.error('Generate practice test error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate test' });
    }
});

// Submit practice test
router.post('/mcq/submit', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;
        const { testId, answers } = req.body;

        const test = practiceTestsStore.get(testId);

        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found or expired' });
        }

        if (test.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Calculate results
        let correct = 0;
        const detailedResults = test.questions.map((q, idx) => {
            const userAnswer = answers?.[idx] ?? answers?.[q.id] ?? null;
            const isCorrect = userAnswer === q.correctAnswer;
            if (isCorrect) correct++;

            return {
                id: q.id,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                userAnswer,
                isCorrect,
                explanation: q.explanation
            };
        });

        const score = Math.round((correct / test.questions.length) * 100);
        const timeTaken = Math.round((Date.now() - new Date(test.startedAt).getTime()) / 1000);

        const result = {
            testId,
            category: test.category,
            topic: test.topic,
            difficulty: test.difficulty,
            totalQuestions: test.questions.length,
            correctAnswers: correct,
            score,
            timeTaken,
            timeLimit: test.timeLimit * 60,
            passed: score >= 60,
            grade: getGrade(score),
            completedAt: new Date(),
            detailedResults
        };

        // Store result
        test.status = 'completed';
        test.result = result;
        practiceTestsStore.set(testId, test);

        res.status(200).json({
            success: true,
            message: score >= 60 ? 'Great job! You passed!' : 'Keep practicing!',
            result
        });

    } catch (error) {
        console.error('Submit practice test error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit test' });
    }
});

// Get practice test (for resuming)
router.get('/mcq/:testId', isAuthenticated, async (req, res) => {
    try {
        const { testId } = req.params;
        const userId = req.id;

        const test = practiceTestsStore.get(testId);

        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        if (test.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Check expiry
        if (new Date() > new Date(test.expiresAt) && test.status === 'in_progress') {
            test.status = 'expired';
            return res.status(400).json({ success: false, message: 'Test has expired' });
        }

        // Return based on status
        if (test.status === 'completed') {
            return res.json({
                success: true,
                test: {
                    ...test,
                    result: test.result
                }
            });
        }

        // Return without answers for in-progress test
        res.json({
            success: true,
            test: {
                ...test,
                questions: test.questions.map(q => ({
                    id: q.id,
                    question: q.question,
                    options: q.options,
                    difficulty: q.difficulty,
                    userAnswer: q.userAnswer
                }))
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get test' });
    }
});

// Get categories
router.get('/categories', (req, res) => {
    res.json({
        success: true,
        categories: Object.entries(CATEGORIES).map(([key, value]) => ({
            id: key,
            name: value.description,
            topics: value.topics
        }))
    });
});

// Helper functions
function getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

function generateFallbackQuestions(topic, difficulty, count) {
    const questions = [
        {
            question: `What is a key feature of ${topic}?`,
            options: ['High performance', 'Complex syntax', 'Limited scalability', 'Poor documentation'],
            correctAnswer: 0,
            explanation: `${topic} is known for its high performance and efficiency.`
        },
        {
            question: `Which best practice is recommended when working with ${topic}?`,
            options: ['Follow coding standards', 'Skip testing', 'Ignore documentation', 'Avoid version control'],
            correctAnswer: 0,
            explanation: 'Following coding standards ensures maintainability and collaboration.'
        },
        {
            question: `What is an important consideration for ${topic} projects?`,
            options: ['Scalability', 'Ignoring user feedback', 'Skipping code reviews', 'No error handling'],
            correctAnswer: 0,
            explanation: 'Scalability ensures the project can grow with user demands.'
        },
        {
            question: 'What is the primary purpose of unit testing?',
            options: ['Test individual components', 'Test entire system', 'Performance optimization', 'User interface design'],
            correctAnswer: 0,
            explanation: 'Unit testing verifies that individual components work correctly in isolation.'
        },
        {
            question: 'Which approach helps in managing project complexity?',
            options: ['Modular design', 'Monolithic architecture', 'No documentation', 'Ignoring edge cases'],
            correctAnswer: 0,
            explanation: 'Modular design breaks down complex systems into manageable, reusable components.'
        },
        {
            question: 'What is the benefit of version control?',
            options: ['Track changes over time', 'Faster execution', 'Reduced memory usage', 'Better graphics'],
            correctAnswer: 0,
            explanation: 'Version control allows teams to track, manage, and collaborate on code changes.'
        },
        {
            question: 'What should be prioritized in code development?',
            options: ['Clean, readable code', 'Complex solutions', 'Undocumented features', 'Quick hacks'],
            correctAnswer: 0,
            explanation: 'Clean, readable code is easier to maintain and debug.'
        },
        {
            question: 'How should errors typically be handled?',
            options: ['Gracefully with proper messages', 'Ignored silently', 'Crash the application', 'Show technical details to users'],
            correctAnswer: 0,
            explanation: 'Graceful error handling improves user experience and debugging.'
        },
        {
            question: 'What is important for team collaboration?',
            options: ['Clear communication', 'Working in isolation', 'Avoiding meetings', 'No code reviews'],
            correctAnswer: 0,
            explanation: 'Clear communication ensures team alignment and reduces misunderstandings.'
        },
        {
            question: 'What helps in maintaining code quality?',
            options: ['Regular code reviews', 'Skipping tests', 'No documentation', 'Ignoring best practices'],
            correctAnswer: 0,
            explanation: 'Regular code reviews catch issues early and share knowledge among team members.'
        }
    ];

    return questions.slice(0, count).map((q, idx) => ({
        ...q,
        id: idx + 1,
        difficulty
    }));
}

export default router;
