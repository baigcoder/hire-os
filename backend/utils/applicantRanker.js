/**
 * Applicant Ranking & ATS Scoring Utility
 * Calculates comprehensive scores for job applicants
 * Helps recruiters identify top candidates quickly
 */

import { User } from '../models/user.model.js';
import { Job } from '../models/job.model.js';
import { Application } from '../models/application.model.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Score breakdown weights (total = 100)
 */
const SCORE_WEIGHTS = {
    skillsMatch: 35,       // Skills alignment
    experienceMatch: 25,   // Experience level
    educationMatch: 15,    // Education requirements
    resumeQuality: 15,     // Resume completeness/quality
    profileComplete: 10    // Profile completion
};

/**
 * Calculate comprehensive ATS score for an applicant
 * @param {Object} application - Application with populated applicant
 * @param {Object} job - Job with requirements
 * @returns {Object} Score breakdown and recommendations
 */
export async function calculateApplicantScore(application, job) {
    try {
        const applicant = application.applicant;
        const breakdown = {};
        let totalScore = 0;

        // 1. Skills Match (35 points)
        const skillsScore = calculateSkillsMatch(applicant, job);
        breakdown.skills = skillsScore;
        totalScore += skillsScore.points;

        // 2. Experience Match (25 points)
        const expScore = calculateExperienceMatch(applicant, job);
        breakdown.experience = expScore;
        totalScore += expScore.points;

        // 3. Education Match (15 points)
        const eduScore = calculateEducationMatch(applicant, job);
        breakdown.education = eduScore;
        totalScore += eduScore.points;

        // 4. Resume Quality (15 points)
        const resumeScore = calculateResumeQuality(applicant);
        breakdown.resume = resumeScore;
        totalScore += resumeScore.points;

        // 5. Profile Completeness (10 points)
        const profileScore = calculateProfileCompleteness(applicant);
        breakdown.profile = profileScore;
        totalScore += profileScore.points;

        // Get star rating (1-5)
        const stars = getStarRating(totalScore);

        // Generate quick AI recommendation for top candidates
        let aiInsight = null;
        if (totalScore >= 70) {
            aiInsight = await getAIInsight(applicant, job, totalScore);
        }

        return {
            totalScore: Math.round(totalScore),
            stars,
            rating: getRatingLabel(totalScore),
            breakdown,
            matchedSkills: skillsScore.matched,
            missingSkills: skillsScore.missing,
            aiInsight,
            recommendation: getRecommendation(totalScore),
            autoAction: totalScore < 30 ? 'reject' : totalScore >= 80 ? 'interview' : 'review'
        };

    } catch (error) {
        console.error('Applicant scoring error:', error);
        return {
            totalScore: 50,
            stars: 3,
            rating: 'Needs Review',
            error: error.message
        };
    }
}

/**
 * Calculate skills match score
 */
function calculateSkillsMatch(applicant, job) {
    const applicantSkills = (applicant.profile?.skills || []).map(s => s.toLowerCase().trim());
    const jobSkills = (job.skills || job.requirements || []).map(s => s.toLowerCase().trim());

    if (jobSkills.length === 0) {
        return { points: SCORE_WEIGHTS.skillsMatch * 0.7, matched: [], missing: [], ratio: 0.7 };
    }

    const matched = [];
    const missing = [];

    jobSkills.forEach(skill => {
        if (applicantSkills.some(as => as.includes(skill) || skill.includes(as))) {
            matched.push(skill);
        } else {
            missing.push(skill);
        }
    });

    const ratio = matched.length / jobSkills.length;
    const points = Math.round(SCORE_WEIGHTS.skillsMatch * ratio);

    return { points, matched, missing, ratio };
}

/**
 * Calculate experience match score
 */
function calculateExperienceMatch(applicant, job) {
    const applicantExp = applicant.profile?.experience || [];
    const yearsExp = applicantExp.length; // Rough estimate
    const requiredLevel = (job.experienceLevel || '').toString().toLowerCase();

    const levelYears = {
        'entry': 0, 'fresher': 0, '0': 0,
        'junior': 1, '1': 1,
        'mid': 3, '2': 2, '3': 3,
        'senior': 5, '4': 4, '5': 5,
        'lead': 7, 'principal': 8
    };

    const required = levelYears[requiredLevel] || 0;

    let ratio = 1;
    if (required > 0) {
        ratio = Math.min(1, yearsExp / required);
    }

    const points = Math.round(SCORE_WEIGHTS.experienceMatch * ratio);

    return {
        points,
        applicantYears: yearsExp,
        requiredYears: required,
        meetsRequirement: yearsExp >= required
    };
}

/**
 * Calculate education match score
 */
function calculateEducationMatch(applicant, job) {
    const education = applicant.profile?.education || [];

    if (education.length === 0) {
        return { points: 5, hasEducation: false };
    }

    // Check for degree levels
    const educationText = JSON.stringify(education).toLowerCase();
    let points = SCORE_WEIGHTS.educationMatch * 0.5; // Base for having education

    if (educationText.includes('bachelor') || educationText.includes('bs') || educationText.includes('ba')) {
        points = SCORE_WEIGHTS.educationMatch * 0.8;
    }
    if (educationText.includes('master') || educationText.includes('ms') || educationText.includes('ma')) {
        points = SCORE_WEIGHTS.educationMatch * 0.95;
    }
    if (educationText.includes('phd') || educationText.includes('doctorate')) {
        points = SCORE_WEIGHTS.educationMatch;
    }

    return { points: Math.round(points), hasEducation: true };
}

/**
 * Calculate resume quality score
 */
function calculateResumeQuality(applicant) {
    let points = 0;
    const factors = [];

    // Has resume file
    if (applicant.profile?.resume) {
        points += 5;
        factors.push('Resume uploaded');
    }

    // Has bio/summary
    if (applicant.profile?.bio && applicant.profile.bio.length > 50) {
        points += 4;
        factors.push('Professional summary');
    }

    // Has skills listed
    if (applicant.profile?.skills?.length >= 5) {
        points += 3;
        factors.push('Skills listed');
    }

    // Has experience entries
    if (applicant.profile?.experience?.length > 0) {
        points += 3;
        factors.push('Experience detailed');
    }

    return { points: Math.min(SCORE_WEIGHTS.resumeQuality, points), factors };
}

/**
 * Calculate profile completeness score
 */
function calculateProfileCompleteness(applicant) {
    let complete = 0;
    const missing = [];

    // Check each profile section
    if (applicant.fullname) complete += 1;
    else missing.push('Full name');

    if (applicant.email) complete += 1;

    if (applicant.phoneNumber) complete += 1;
    else missing.push('Phone');

    if (applicant.profile?.bio) complete += 2;
    else missing.push('Bio');

    if (applicant.profile?.skills?.length > 0) complete += 2;
    else missing.push('Skills');

    if (applicant.profile?.resume) complete += 2;
    else missing.push('Resume');

    if (applicant.profile?.profilePhoto) complete += 1;
    else missing.push('Photo');

    const points = Math.min(SCORE_WEIGHTS.profileComplete, complete);

    return { points, completeness: complete * 10, missing };
}

/**
 * Get star rating (1-5) based on score
 */
function getStarRating(score) {
    if (score >= 90) return 5;
    if (score >= 75) return 4;
    if (score >= 60) return 3;
    if (score >= 40) return 2;
    return 1;
}

/**
 * Get rating label
 */
function getRatingLabel(score) {
    if (score >= 85) return 'Excellent Candidate';
    if (score >= 70) return 'Strong Candidate';
    if (score >= 55) return 'Good Candidate';
    if (score >= 40) return 'Potential Candidate';
    return 'Below Requirements';
}

/**
 * Get recommendation based on score
 */
function getRecommendation(score) {
    if (score >= 85) return 'Highly Recommended - Fast-track to interview';
    if (score >= 70) return 'Recommended - Schedule initial screening';
    if (score >= 55) return 'Consider - Review resume in detail';
    if (score >= 40) return 'Hold - May need additional qualifications';
    return 'Not Recommended - Does not meet minimum requirements';
}

/**
 * Get AI insight for top candidates
 */
async function getAIInsight(applicant, job, score) {
    try {
        const prompt = `Brief hiring insight (2 sentences max):
Candidate: ${applicant.fullname}, Skills: ${(applicant.profile?.skills || []).join(', ')}
Position: ${job.title}
Match Score: ${score}%

What makes them stand out and one question to ask in interview:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 150 }
            })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;

    } catch (error) {
        return null;
    }
}

/**
 * Rank all applicants for a job
 */
export async function rankApplicantsForJob(jobId) {
    try {
        const job = await Job.findById(jobId).lean();
        if (!job) throw new Error('Job not found');

        const applications = await Application.find({ job: jobId })
            .populate('applicant', 'fullname email phoneNumber profile')
            .lean();

        const rankedApplicants = await Promise.all(
            applications.map(async (app) => {
                const score = await calculateApplicantScore(app, job);
                return {
                    applicationId: app._id,
                    applicant: {
                        _id: app.applicant._id,
                        fullname: app.applicant.fullname,
                        email: app.applicant.email,
                        profilePhoto: app.applicant.profile?.profilePhoto
                    },
                    appliedAt: app.createdAt,
                    status: app.status,
                    score
                };
            })
        );

        // Sort by score descending
        rankedApplicants.sort((a, b) => b.score.totalScore - a.score.totalScore);

        // Add rank
        rankedApplicants.forEach((app, index) => {
            app.rank = index + 1;
        });

        return {
            jobId,
            jobTitle: job.title,
            totalApplicants: rankedApplicants.length,
            topCandidates: rankedApplicants.filter(a => a.score.totalScore >= 70).length,
            applicants: rankedApplicants
        };

    } catch (error) {
        console.error('Rank applicants error:', error);
        throw error;
    }
}

/**
 * Get bulk recommendations for auto-actions
 */
export function getBulkRecommendations(rankedApplicants) {
    return {
        fastTrack: rankedApplicants.filter(a => a.score.totalScore >= 85),
        interview: rankedApplicants.filter(a => a.score.totalScore >= 70 && a.score.totalScore < 85),
        review: rankedApplicants.filter(a => a.score.totalScore >= 50 && a.score.totalScore < 70),
        reject: rankedApplicants.filter(a => a.score.totalScore < 50)
    };
}

export default {
    calculateApplicantScore,
    rankApplicantsForJob,
    getBulkRecommendations
};
