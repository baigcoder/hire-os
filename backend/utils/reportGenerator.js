/**
 * Report Generator - GPT-5 Enhanced
 * Generates comprehensive interview reports for CEO review
 * Uses GPT-5 for superior analysis with Gemini fallback
 */

import { generateReportWithGPT5, callGPT5, parseAIJson } from './aiService.js';

const GPT5_API_KEY = process.env.GPT5_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * Generate AI-powered interview report for CEO
 * Uses GPT-5 first, then Gemini, then fallback
 */
export const generateInterviewReport = async (interviewData) => {
    const {
        candidateName,
        candidateEmail,
        jobTitle,
        jobId,
        companyName,
        recruiterName,
        interviewDate,
        interviewDuration,
        // Scores
        mcqScore,
        mcqTotal,
        videoScores,
        resumeScore,
        fraudRiskScore,
        // Behavioral data
        behaviorNotes,
        recruiterNotes,
        // AI Analysis from interview
        aiAnalysis
    } = interviewData;

    // Calculate overall performance
    const mcqPercentage = mcqTotal > 0 ? Math.round((mcqScore / mcqTotal) * 100) : null;

    // Try GPT-5 first for superior analysis
    if (GPT5_API_KEY) {
        try {
            console.log('🚀 Generating CEO report with GPT-5...');
            const gpt5Report = await generateReportWithGPT5(interviewData);

            return {
                ...gpt5Report,
                candidate: { name: candidateName, email: candidateEmail },
                job: { title: jobTitle, id: jobId },
                company: companyName,
                recruiter: recruiterName,
                interviewDate,
                interviewDuration,
                rawScores: {
                    mcq: { score: mcqScore, total: mcqTotal, percentage: mcqPercentage },
                    resume: resumeScore,
                    fraudRisk: fraudRiskScore,
                    video: videoScores
                },
                recruiterNotes,
                status: 'pending_ceo_review',
                generatedBy: 'gpt-5'
            };
        } catch (error) {
            console.log('GPT-5 report generation failed, trying Gemini:', error.message);
        }
    }

    // Fallback to Gemini
    if (GEMINI_API_KEY) {
        const prompt = `You are an expert HR consultant. Generate a professional, concise interview report for CEO review.

CANDIDATE: ${candidateName}
JOB: ${jobTitle} at ${companyName}
INTERVIEWER: ${recruiterName}
DATE: ${interviewDate}
DURATION: ${interviewDuration} minutes

PERFORMANCE DATA:
- MCQ Test: ${mcqPercentage !== null ? `${mcqPercentage}% (${mcqScore}/${mcqTotal})` : 'Not taken'}
- Resume Match Score: ${resumeScore || 'N/A'}%
- Video Interview Scores: ${videoScores ? JSON.stringify(videoScores) : 'Not conducted'}
- Fraud Risk Level: ${fraudRiskScore || 'Low'}

RECRUITER NOTES:
${recruiterNotes || 'No notes provided'}

AI OBSERVATIONS:
${aiAnalysis || 'No AI analysis available'}

Generate a JSON report with:
{
  "summary": "<2-3 sentence executive summary>",
  "recommendation": "<STRONGLY_RECOMMEND | RECOMMEND | CONSIDER | NOT_RECOMMENDED>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1 if any>"],
  "overallScore": <0-100>,
  "technicalScore": <0-100>,
  "cultureFitScore": <0-100>,
  "communicationScore": <0-100>,
  "hiringRisk": "<LOW | MEDIUM | HIGH>",
  "suggestedSalary": "<salary range suggestion based on skills>",
  "nextSteps": "<suggested next action>"
}`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 1000,
                            responseMimeType: "application/json"
                        }
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error('Empty response from Gemini');
            }

            const aiReport = JSON.parse(text);

            // Combine with raw data
            return {
                ...aiReport,
                candidate: { name: candidateName, email: candidateEmail },
                job: { title: jobTitle, id: jobId },
                company: companyName,
                recruiter: recruiterName,
                interviewDate,
                interviewDuration,
                rawScores: {
                    mcq: { score: mcqScore, total: mcqTotal, percentage: mcqPercentage },
                    resume: resumeScore,
                    fraudRisk: fraudRiskScore,
                    video: videoScores
                },
                recruiterNotes,
                generatedAt: new Date().toISOString(),
                status: 'pending_ceo_review',
                generatedBy: 'gemini-ai'
            };

        } catch (error) {
            console.error('Gemini report generation error:', error);
        }
    }

    // Final fallback to algorithmic report
    return generateFallbackReport(interviewData);
};

/**
 * Fallback report generation (when AI unavailable)
 */
const generateFallbackReport = (interviewData) => {
    const {
        candidateName,
        candidateEmail,
        jobTitle,
        jobId,
        companyName,
        recruiterName,
        interviewDate,
        interviewDuration,
        mcqScore,
        mcqTotal,
        videoScores,
        resumeScore,
        fraudRiskScore,
        recruiterNotes
    } = interviewData;

    const mcqPercentage = mcqTotal > 0 ? Math.round((mcqScore / mcqTotal) * 100) : 0;

    // Calculate overall score based on available data
    let overallScore = 50;
    let factors = 0;

    if (mcqPercentage) { overallScore += mcqPercentage * 0.4; factors++; }
    if (resumeScore) { overallScore += resumeScore * 0.3; factors++; }
    if (videoScores?.overall) { overallScore += videoScores.overall * 0.3; factors++; }

    if (factors > 0) overallScore = Math.round(overallScore / factors);

    // Determine recommendation
    let recommendation;
    if (overallScore >= 80 && fraudRiskScore !== 'high') {
        recommendation = 'STRONGLY_RECOMMEND';
    } else if (overallScore >= 65) {
        recommendation = 'RECOMMEND';
    } else if (overallScore >= 50) {
        recommendation = 'CONSIDER';
    } else {
        recommendation = 'NOT_RECOMMENDED';
    }

    return {
        summary: `Candidate ${candidateName} completed the interview process for ${jobTitle}. ${overallScore >= 70
            ? 'Performance was above average with demonstrated competency.'
            : 'Further evaluation may be needed to assess fit.'
            }`,
        recommendation,
        strengths: [
            mcqPercentage >= 70 ? 'Strong technical knowledge (MCQ)' : null,
            resumeScore >= 70 ? 'Good resume-job match' : null,
            'Completed full interview process'
        ].filter(Boolean),
        concerns: [
            fraudRiskScore === 'high' ? 'Integrity concerns during interview' : null,
            mcqPercentage < 50 ? 'Below average technical performance' : null
        ].filter(Boolean),
        overallScore,
        technicalScore: mcqPercentage || 50,
        cultureFitScore: videoScores?.cultural || 60,
        communicationScore: videoScores?.communication || 60,
        hiringRisk: fraudRiskScore === 'high' ? 'HIGH' : fraudRiskScore === 'medium' ? 'MEDIUM' : 'LOW',
        suggestedSalary: 'Market rate for position',
        nextSteps: recommendation === 'STRONGLY_RECOMMEND' || recommendation === 'RECOMMEND'
            ? 'Proceed with offer preparation'
            : 'Consider second interview or alternative candidates',
        candidate: { name: candidateName, email: candidateEmail },
        job: { title: jobTitle, id: jobId },
        company: companyName,
        recruiter: recruiterName,
        interviewDate,
        interviewDuration,
        rawScores: {
            mcq: { score: mcqScore, total: mcqTotal, percentage: mcqPercentage },
            resume: resumeScore,
            fraudRisk: fraudRiskScore,
            video: videoScores
        },
        recruiterNotes,
        generatedAt: new Date().toISOString(),
        status: 'pending_ceo_review',
        generatedBy: 'fallback'
    };
};

/**
 * Update report with CEO decision
 */
export const processCEODecision = async (reportId, decision, ceoNotes, decidedBy) => {
    return {
        reportId,
        decision, // 'approved' | 'rejected' | 'on_hold'
        ceoNotes,
        decidedBy,
        decidedAt: new Date().toISOString(),
        nextAction: decision === 'approved'
            ? 'Prepare offer letter'
            : decision === 'rejected'
                ? 'Send rejection email'
                : 'Schedule follow-up'
    };
};

/**
 * Generate quick summary for notification
 */
export const generateQuickSummary = (report) => {
    const emoji = {
        'STRONGLY_RECOMMEND': '🌟',
        'RECOMMEND': '✅',
        'CONSIDER': '🤔',
        'NOT_RECOMMENDED': '❌'
    };

    return {
        candidateName: report.candidate?.name,
        jobTitle: report.job?.title,
        recommendation: report.recommendation,
        emoji: emoji[report.recommendation] || '📋',
        overallScore: report.overallScore,
        summary: report.summary?.substring(0, 100) + '...',
        generatedAt: report.generatedAt
    };
};

export default {
    generateInterviewReport,
    processCEODecision,
    generateQuickSummary
};
