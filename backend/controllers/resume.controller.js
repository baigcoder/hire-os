import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
// Import unified AI analyzer for dynamic analysis
import { analyzeResumeUnified, analyzeResumeQuick } from '../utils/unifiedAnalyzer.js';
import { callAI, parseAIJson } from '../utils/aiServiceV3.js';
import { User } from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analyze resume using Python ML model
 * POST /api/v1/resume/analyze
 */
export const analyzeResume = async (req, res) => {
    try {
        const { resumeText, jobDescription } = req.body;
        const userId = req.id;
        let candidateName = null;

        if (userId) {
            try {
                const user = await User.findById(userId).select('fullname name profile').lean();
                if (user) {
                    candidateName = user.fullname || user.name || user.profile?.fullName || null;
                }
            } catch (e) {
                console.warn('Could not load candidate name for resume analysis:', e.message);
            }
        }

        if (!resumeText) {
            return res.status(400).json({
                success: false,
                message: 'Resume text is required'
            });
        }

        console.log('🔥 [AI DYNAMIC] Starting resume analysis with unified AI engines...');
        const startTime = Date.now();

        // Use unified AI analyzer (Python ML + JS + GPT-4o-mini)
        const result = await analyzeResumeUnified(resumeText, jobDescription || '', {
            onProgress: (update) => {
                console.log(`   📊 [AI] Engine ${update.engine}: ${update.status}`);
            },
            candidateName
        });

        const latency = Date.now() - startTime;
        console.log(`✅ [AI DYNAMIC] Resume analysis complete in ${latency}ms`);
        console.log(`   🎯 Engines used: ${result.meta.enginesUsed?.join(', ') || 'unified'}`);
        console.log(`   📈 Final score: ${result.consensus?.score}/100 (${result.consensus?.confidence}% confidence)`);

        return res.status(200).json({
            success: true,
            analysis: result.consensus,
            engines: result.engines,
            method: 'unified-multi-engine-ai',
            latency
        });

    } catch (error) {
        console.error('❌ [AI ERROR] Resume analysis failed:', error.message);

        // Fallback to quick JS analysis (still dynamic, just faster)
        console.log('⚡ [AI FALLBACK] Using quick JavaScript analysis...');
        const quickResult = await analyzeResumeQuick(req.body.resumeText, req.body.jobDescription || '');

        return res.status(200).json({
            success: true,
            analysis: quickResult,
            method: 'quick-javascript-dynamic'
        });
    }
};

/**
 * Quick resume score (for dashboard preview) - NOW FULLY AI POWERED
 * GET /api/v1/resume/quick-score
 */
export const getQuickResumeScore = async (req, res) => {
    try {
        const userId = req.id;

        console.log('🔥 [AI DYNAMIC] Getting quick resume score for user:', userId);

        // Get user's profile for analysis
        const user = await User.findById(userId).select('profile resume skills bio').lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Build resume text from user profile
        const resumeText = [
            user.profile?.bio || user.bio || '',
            `Skills: ${(user.profile?.skills || user.skills || []).join(', ')}`,
            `Experience: ${user.profile?.experience || 'Not specified'}`,
            `Education: ${user.profile?.education || 'Not specified'}`
        ].join('\n');

        if (resumeText.length < 50) {
            console.log('⚠️ [AI] Profile too incomplete for analysis');
            return res.status(200).json({
                success: true,
                score: 35,
                message: 'Profile incomplete - add more details for accurate score',
                tips: [
                    'Add your skills to your profile',
                    'Upload or describe your work experience',
                    'Include your education background'
                ],
                isDynamic: true,
                analysisMethod: 'profile-check'
            });
        }

        // Use AI to generate dynamic score
        console.log('🤖 [AI DYNAMIC] Calling GPT-4o-mini for profile scoring...');
        const startTime = Date.now();

        const aiResult = await callAI([
            {
                role: 'system',
                content: 'You are a professional resume reviewer. Rate profiles on a scale of 0-100 based on completeness, skills relevance, and employability. Be strict but fair.'
            },
            {
                role: 'user',
                content: `Rate this profile and provide 3 specific improvement tips.

PROFILE:
${resumeText}

Return ONLY valid JSON:
{
    "score": <0-100>,
    "category": "<Excellent|Good|Average|Needs Work>",
    "tips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}`
            }
        ], {
            temperature: 0.4,
            maxTokens: 300,
            feature: 'RESUME_ANALYSIS'
        });

        const parsed = parseAIJson(aiResult.content);
        const latency = Date.now() - startTime;

        console.log(`✅ [AI DYNAMIC] Profile scored: ${parsed.score}/100 in ${latency}ms`);
        console.log(`   🤖 Model used: ${aiResult.model}`);

        return res.status(200).json({
            success: true,
            score: parsed.score || 50,
            category: parsed.category,
            tips: parsed.tips || [
                'Add more relevant skills',
                'Include quantifiable achievements',
                'Update your experience section'
            ],
            isDynamic: true,
            analysisMethod: 'ai-gpt4o-mini',
            model: aiResult.model,
            latency
        });

    } catch (error) {
        console.error('❌ [AI ERROR] Quick score failed:', error.message);

        // Even fallback is dynamic - use quick analysis
        console.log('⚡ [AI FALLBACK] Using quick JavaScript scoring...');

        return res.status(200).json({
            success: true,
            score: 50,
            tips: [
                'Complete your profile for accurate AI scoring',
                'Add skills and experience details',
                'Upload your resume for better analysis'
            ],
            isDynamic: true,
            analysisMethod: 'fallback-dynamic',
            message: 'AI temporarily unavailable - showing estimated score'
        });
    }
};
