/**
 * Interview Feedback Routes
 * For collecting and managing interview feedback
 */

import express from 'express';
import isAuthenticated, { isRecruiter } from '../middlewares/isAuthenticated.js';
import { InterviewFeedback } from '../models/interviewFeedback.model.js';
import { Interview } from '../models/interview.model.js';
import { Application } from '../models/application.model.js';
import { User } from '../models/user.model.js';
import { Company } from '../models/company.model.js';

const router = express.Router();

/**
 * POST /api/v1/interview-feedback
 * Create or update feedback for an interview
 */
router.post('/', isAuthenticated, isRecruiter, async (req, res) => {
    try {
        const {
            interviewId,
            applicationId,
            scorecard,
            recommendation,
            strengths,
            weaknesses,
            notes,
            privateNotes,
            isSubmitted
        } = req.body;
        const userId = req.id;

        if (!interviewId || !applicationId || !recommendation) {
            return res.status(400).json({
                success: false,
                message: 'Interview ID, Application ID, and recommendation are required'
            });
        }

        // Verify interview exists
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        // Verify application exists
        const application = await Application.findById(applicationId).populate('job');
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        // Check if feedback already exists
        let feedback = await InterviewFeedback.findOne({
            interviewId,
            reviewerId: userId
        });

        if (feedback) {
            // Update existing feedback
            feedback.scorecard = scorecard || feedback.scorecard;
            feedback.recommendation = recommendation;
            feedback.strengths = strengths || feedback.strengths;
            feedback.weaknesses = weaknesses || feedback.weaknesses;
            feedback.notes = notes || feedback.notes;
            feedback.privateNotes = privateNotes || feedback.privateNotes;

            if (isSubmitted && !feedback.isSubmitted) {
                feedback.isSubmitted = true;
                feedback.submittedAt = new Date();
            }
        } else {
            // Create new feedback
            feedback = new InterviewFeedback({
                interviewId,
                applicationId,
                jobId: application.job._id,
                reviewerId: userId,
                candidateId: application.applicant,
                scorecard,
                recommendation,
                strengths,
                weaknesses,
                notes,
                privateNotes,
                isSubmitted: isSubmitted || false,
                submittedAt: isSubmitted ? new Date() : null
            });
        }

        await feedback.save();

        // If submitted, update application timeline
        if (feedback.isSubmitted) {
            await Application.findByIdAndUpdate(applicationId, {
                $push: {
                    timeline: {
                        action: 'feedback_submitted',
                        performedBy: userId,
                        timestamp: new Date(),
                        metadata: {
                            recommendation: feedback.recommendation,
                            overallScore: feedback.overallScore
                        }
                    }
                }
            });
        }

        return res.status(201).json({
            success: true,
            feedback,
            message: feedback.isSubmitted ? 'Feedback submitted successfully' : 'Feedback saved as draft'
        });
    } catch (error) {
        console.error('Create feedback error:', error);
        return res.status(500).json({ success: false, message: 'Error saving feedback' });
    }
});

/**
 * GET /api/v1/interview-feedback/interview/:interviewId
 * Get all feedback for an interview
 */
router.get('/interview/:interviewId', isAuthenticated, isRecruiter, async (req, res) => {
    try {
        const { interviewId } = req.params;

        const feedbacks = await InterviewFeedback.find({
            interviewId,
            isSubmitted: true
        })
            .populate('reviewerId', 'fullname profile.profilePhoto')
            .sort({ submittedAt: -1 });

        return res.status(200).json({
            success: true,
            feedbacks
        });
    } catch (error) {
        console.error('Get interview feedback error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching feedback' });
    }
});

/**
 * GET /api/v1/interview-feedback/application/:applicationId
 * Get all feedback for an application (across all interviews)
 */
router.get('/application/:applicationId', isAuthenticated, isRecruiter, async (req, res) => {
    try {
        const { applicationId } = req.params;

        const feedbacks = await InterviewFeedback.find({
            applicationId,
            isSubmitted: true
        })
            .populate('reviewerId', 'fullname profile.profilePhoto')
            .populate('interviewId', 'type scheduledAt')
            .sort({ submittedAt: -1 });

        // Get aggregated scores
        const averageScores = await InterviewFeedback.getCandidateAverageScores(applicationId);

        return res.status(200).json({
            success: true,
            feedbacks,
            summary: averageScores
        });
    } catch (error) {
        console.error('Get application feedback error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching feedback' });
    }
});

/**
 * GET /api/v1/interview-feedback/my-drafts
 * Get current user's draft feedbacks
 */
router.get('/my-drafts', isAuthenticated, isRecruiter, async (req, res) => {
    try {
        const userId = req.id;

        const drafts = await InterviewFeedback.find({
            reviewerId: userId,
            isSubmitted: false
        })
            .populate('applicationId', 'status')
            .populate('jobId', 'title')
            .populate('candidateId', 'fullname profile.profilePhoto')
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            drafts
        });
    } catch (error) {
        console.error('Get drafts error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching drafts' });
    }
});

/**
 * GET /api/v1/interview-feedback/:id
 * Get specific feedback
 */
router.get('/:id', isAuthenticated, isRecruiter, async (req, res) => {
    try {
        const { id } = req.params;

        const feedback = await InterviewFeedback.findById(id)
            .populate('reviewerId', 'fullname profile.profilePhoto')
            .populate('candidateId', 'fullname email profile.profilePhoto')
            .populate('jobId', 'title')
            .populate('interviewId');

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        return res.status(200).json({
            success: true,
            feedback
        });
    } catch (error) {
        console.error('Get feedback error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching feedback' });
    }
});

/**
 * DELETE /api/v1/interview-feedback/:id
 * Delete feedback (only if not submitted)
 */
router.delete('/:id', isAuthenticated, isRecruiter, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;

        const feedback = await InterviewFeedback.findOne({
            _id: id,
            reviewerId: userId
        });

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        if (feedback.isSubmitted) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete submitted feedback'
            });
        }

        await InterviewFeedback.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Draft deleted successfully'
        });
    } catch (error) {
        console.error('Delete feedback error:', error);
        return res.status(500).json({ success: false, message: 'Error deleting feedback' });
    }
});

/**
 * GET /api/v1/interview-feedback/pending
 * Get interviews pending feedback from current user
 */
router.get('/pending/list', isAuthenticated, isRecruiter, async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);

        let company;
        if (user.role === 'company_admin') {
            company = await Company.findOne({ adminUser: userId });
        } else {
            company = await Company.findById(user.companyId);
        }

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // Find completed interviews where user was interviewer but hasn't submitted feedback
        const completedInterviews = await Interview.find({
            company: company._id,
            status: 'completed',
            $or: [
                { conductedBy: userId },
                { interviewers: userId }
            ]
        })
            .populate('applicationId', 'status')
            .populate({
                path: 'applicationId',
                populate: {
                    path: 'applicant',
                    select: 'fullname profile.profilePhoto'
                }
            })
            .populate('jobId', 'title');

        // Filter out interviews with feedback already submitted
        const feedbackSubmitted = await InterviewFeedback.find({
            reviewerId: userId,
            isSubmitted: true
        }).select('interviewId');

        const submittedInterviewIds = feedbackSubmitted.map(f => f.interviewId.toString());

        const pendingFeedback = completedInterviews.filter(
            interview => !submittedInterviewIds.includes(interview._id.toString())
        );

        return res.status(200).json({
            success: true,
            pendingFeedback: pendingFeedback.map(interview => ({
                interviewId: interview._id,
                applicationId: interview.applicationId?._id,
                candidate: interview.applicationId?.applicant,
                job: interview.jobId,
                completedAt: interview.completedAt || interview.scheduledAt,
                type: interview.type
            }))
        });
    } catch (error) {
        console.error('Get pending feedback error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching pending feedback' });
    }
});

export default router;
