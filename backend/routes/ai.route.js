import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Generate AI content using Gemini
 * Used for job description suggestions, requirements, salary recommendations, etc.
 */
router.post('/generate', isAuthenticated, async (req, res) => {
    try {
        const { prompt, maxTokens = 500 } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required'
            });
        }

        if (!GEMINI_API_KEY) {
            // Return intelligent fallback if no API key
            return res.status(200).json({
                success: true,
                content: null,
                fallback: true,
                message: 'AI service not configured'
            });
        }

        const response = await fetch(
            `${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: maxTokens
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            return res.status(200).json({
                success: true,
                content: null,
                fallback: true,
                message: 'AI service temporarily unavailable'
            });
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            return res.status(200).json({
                success: true,
                content: null,
                fallback: true,
                message: 'No content generated'
            });
        }

        return res.status(200).json({
            success: true,
            content: content.trim(),
            model: 'gemini-1.5-flash'
        });

    } catch (error) {
        console.error('AI generation error:', error);
        return res.status(200).json({
            success: true,
            content: null,
            fallback: true,
            message: 'AI service error'
        });
    }
});

/**
 * Generate job posting suggestions
 */
router.post('/job-suggestions', isAuthenticated, async (req, res) => {
    try {
        const { title, type, experience, company } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Job title is required'
            });
        }

        const prompt = `You are a professional HR content writer. Generate suggestions for a job posting with the following details:

Job Title: ${title}
${type ? `Job Type: ${type}` : ''}
${experience ? `Experience Level: ${experience}` : ''}
${company ? `Company: ${company}` : ''}

Provide JSON with:
{
    "description": "A compelling 2-3 paragraph job description",
    "requirements": "Comma-separated list of 6-8 requirements",
    "salary": "Suggested salary range in PKR"
}

Return ONLY valid JSON, no markdown or explanation.`;

        if (!GEMINI_API_KEY) {
            // Return intelligent fallback
            return res.status(200).json({
                success: true,
                suggestions: {
                    description: `We are seeking a talented ${title} to join our innovative team. In this role, you will work on exciting projects and collaborate with skilled professionals.\n\nThe ideal candidate will bring expertise, passion, and a collaborative mindset to help drive our success.`,
                    requirements: `Bachelor's degree in relevant field, Strong analytical skills, Excellent communication, Team player, Problem-solving abilities, ${experience || '2+ years'} of experience`,
                    salary: experience?.includes('Fresher') ? '50,000 - 80,000 PKR' : '100,000 - 180,000 PKR'
                },
                fallback: true
            });
        }

        const response = await fetch(
            `${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (content) {
            const suggestions = JSON.parse(content);
            return res.status(200).json({
                success: true,
                suggestions,
                model: 'gemini-1.5-flash'
            });
        }

        throw new Error('No content generated');

    } catch (error) {
        console.error('Job suggestions error:', error);
        return res.status(200).json({
            success: true,
            suggestions: null,
            fallback: true,
            message: 'Using fallback suggestions'
        });
    }
});

export default router;
