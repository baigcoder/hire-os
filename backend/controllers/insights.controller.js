/**
 * Insights Controller - AI-Generated Hiring Insights
 * Provides executive-level AI summaries for CEO dashboard
 */

import { callGPT5, parseAIJson } from '../utils/aiService.js';
import { User } from '../models/user.model.js';
import { Company } from '../models/company.model.js';

/**
 * Generate AI Hiring Insights for CEO
 * GET /api/v1/insights/hiring
 */
export const getHiringInsights = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);

        if (!user || (user.role !== 'company_admin' && user.role !== 'recruiter')) {
            return res.status(403).json({
                success: false,
                message: 'Only company admin or recruiter can access insights'
            });
        }

        // Get company data
        let company;
        if (user.role === 'company_admin') {
            company = await Company.findOne({ adminUser: userId });
        } else {
            company = await Company.findById(user.companyId);
        }

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Gather hiring data for AI analysis
        const { Job } = await import('../models/job.model.js');
        const { Application } = await import('../models/application.model.js');

        const jobs = await Job.find({ company: company._id }).lean();
        const jobIds = jobs.map(j => j._id);

        const applications = await Application.find({
            job: { $in: jobIds }
        }).populate('applicant', 'fullname').lean();

        // Calculate metrics
        const totalApplications = applications.length;
        const activeJobs = jobs.filter(j => j.isActive !== false).length;
        const pendingApprovals = applications.filter(a => a.status === 'pending_ceo_approval').length;
        const hired = applications.filter(a => a.status === 'hired').length;
        const rejected = applications.filter(a => a.status === 'rejected').length;
        const inInterview = applications.filter(a => a.status === 'interview').length;

        // Calculate conversion rate
        const conversionRate = totalApplications > 0
            ? Math.round((hired / totalApplications) * 100)
            : 0;

        // Calculate average time to hire (mock for now)
        const avgTimeToHire = 14; // days

        // Generate AI insights
        const insightsData = {
            companyName: company.name,
            activeJobs,
            totalApplications,
            pendingApprovals,
            hired,
            rejected,
            inInterview,
            conversionRate,
            avgTimeToHire,
            recruitersCount: company.recruiters?.filter(r => r.status === 'active').length || 0
        };

        let aiInsights;
        try {
            aiInsights = await generateAIInsights(insightsData);
        } catch (aiError) {
            console.error('AI insights generation failed:', aiError);
            // Fallback to algorithmic insights
            aiInsights = generateFallbackInsights(insightsData);
        }

        return res.status(200).json({
            success: true,
            insights: {
                ...aiInsights,
                metrics: insightsData,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Get hiring insights error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating insights'
        });
    }
};

/**
 * Generate AI-powered insights using GPT
 */
async function generateAIInsights(data) {
    const prompt = `You are an expert HR analytics consultant. Generate executive hiring insights.

COMPANY: ${data.companyName}
CURRENT METRICS:
- Active Jobs: ${data.activeJobs}
- Total Applications: ${data.totalApplications}
- Pending CEO Approvals: ${data.pendingApprovals}
- Hired This Period: ${data.hired}
- Rejected: ${data.rejected}
- In Interview: ${data.inInterview}
- Conversion Rate: ${data.conversionRate}%
- Avg Time to Hire: ${data.avgTimeToHire} days
- Active Recruiters: ${data.recruitersCount}

Generate concise executive insights in JSON:
{
    "executiveSummary": "<2-3 sentence summary of hiring health>",
    "performanceRating": "<Excellent|Good|Needs Attention|Critical>",
    "keyHighlights": ["<3 positive highlights>"],
    "actionItems": ["<3 recommended actions>"],
    "riskAreas": ["<any risk areas or empty array>"],
    "prediction": "<1 sentence prediction for next month>",
    "efficiencyScore": <0-100>
}`;

    const result = await callGPT5([
        { role: 'system', content: 'You are a hiring analytics expert. Be concise and actionable.' },
        { role: 'user', content: prompt }
    ], {
        temperature: 0.4,
        maxTokens: 800,
        feature: 'CEO_INSIGHTS'
    });

    const insights = parseAIJson(result.content);
    insights.generatedBy = result.model;
    insights.aiPowered = true;

    return insights;
}

/**
 * Fallback insights when AI is unavailable
 */
function generateFallbackInsights(data) {
    let performanceRating = 'Good';
    let executiveSummary = '';
    const keyHighlights = [];
    const actionItems = [];
    const riskAreas = [];

    // Analyze conversion rate
    if (data.conversionRate >= 15) {
        performanceRating = 'Excellent';
        keyHighlights.push(`Strong ${data.conversionRate}% conversion rate`);
    } else if (data.conversionRate >= 8) {
        keyHighlights.push(`Healthy ${data.conversionRate}% conversion rate`);
    } else if (data.conversionRate > 0) {
        performanceRating = 'Needs Attention';
        riskAreas.push(`Low ${data.conversionRate}% conversion rate`);
        actionItems.push('Review candidate quality and job requirements alignment');
    }

    // Check pending approvals
    if (data.pendingApprovals > 5) {
        riskAreas.push(`${data.pendingApprovals} candidates awaiting CEO review`);
        actionItems.push('Review pending approvals to prevent candidate loss');
    } else if (data.pendingApprovals > 0) {
        keyHighlights.push(`${data.pendingApprovals} candidates ready for final review`);
    }

    // Check pipeline health
    if (data.inInterview > 0) {
        keyHighlights.push(`${data.inInterview} candidates in active interview stage`);
    }

    if (data.activeJobs > 0 && data.totalApplications === 0) {
        riskAreas.push('No applications received for active jobs');
        actionItems.push('Consider improving job visibility or descriptions');
    }

    // Generate summary
    if (performanceRating === 'Excellent') {
        executiveSummary = `${data.companyName} hiring is performing excellently with ${data.hired} successful hires and strong application flow. The team is efficiently managing ${data.activeJobs} active positions.`;
    } else if (performanceRating === 'Good') {
        executiveSummary = `${data.companyName} hiring operations are healthy with ${data.totalApplications} applications across ${data.activeJobs} positions. ${data.pendingApprovals > 0 ? `${data.pendingApprovals} candidates await your review.` : 'Pipeline is flowing well.'}`;
    } else {
        executiveSummary = `${data.companyName} hiring needs attention. Review the action items below to optimize your recruitment pipeline.`;
    }

    // Add default action if empty
    if (actionItems.length === 0) {
        actionItems.push('Continue current hiring momentum');
    }

    return {
        executiveSummary,
        performanceRating,
        keyHighlights: keyHighlights.length > 0 ? keyHighlights : ['Hiring operations running smoothly'],
        actionItems,
        riskAreas,
        prediction: data.inInterview > 0
            ? `Expect ${Math.ceil(data.inInterview * 0.4)}-${Math.ceil(data.inInterview * 0.6)} hires from current pipeline`
            : 'Focus on building interview pipeline',
        efficiencyScore: Math.min(100, Math.round(
            (data.conversionRate * 2) +
            (data.hired * 5) +
            (data.recruitersCount > 0 ? 20 : 0) +
            (data.pendingApprovals < 5 ? 20 : 0)
        )),
        generatedBy: 'algorithmic-fallback',
        aiPowered: false
    };
}

/**
 * Force refresh insights (regenerate)
 * POST /api/v1/insights/refresh
 */
export const refreshInsights = async (req, res) => {
    // Clear any cached insights and regenerate
    return getHiringInsights(req, res);
};

export default {
    getHiringInsights,
    refreshInsights
};
