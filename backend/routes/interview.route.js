import express from 'express';
import {
    createInterview,
    getInterview,
    getInterviewsByJob,
    getInterviewsByStudent,
    getInterviewsByRecruiter,
    updateInterviewStatus,

    // MCQ Test
    getMCQQuestions,
    startMCQTest,
    submitMCQAnswers,
    getMCQResult,

    // Video Interview
    startVideoInterview,
    joinVideoInterview,
    endVideoInterview,
    reportFraudAlert,
    sendChatMessage,

    // Report & Offer
    generateReport,
    submitReport,
    submitReportToCEO,
    ceoDecision,
    getPendingReportsForCEO,
    createOfferLetter,
    sendOfferLetter,
    respondToOffer,

    // Admin
    cancelInterview,
    rescheduleInterview
} from '../controllers/interview.controller.js';
import isAuthenticated, { isRecruiter, isCompanyAdmin, checkFeatureAccess } from '../middlewares/isAuthenticated.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// ========== Interview CRUD ==========
router.post('/create', isRecruiter, checkFeatureAccess('videoInterviews'), createInterview);
router.get('/:id', getInterview);
router.get('/job/:jobId', isRecruiter, getInterviewsByJob);
router.get('/student/my-interviews', getInterviewsByStudent);
router.get('/recruiter/my-interviews', isRecruiter, getInterviewsByRecruiter);
router.put('/:id/status', isRecruiter, updateInterviewStatus);
router.put('/:id/reschedule', isRecruiter, rescheduleInterview);
router.put('/:id/cancel', isRecruiter, cancelInterview);

// ========== MCQ Test Routes ==========
router.get('/:id/mcq', getMCQQuestions);
router.post('/:id/mcq/start', startMCQTest);
router.post('/:id/mcq/submit', submitMCQAnswers);
router.get('/:id/mcq/result', getMCQResult);

// ========== Video Interview Routes ==========
router.post('/:id/video/start', isRecruiter, startVideoInterview);
router.post('/:id/video/join', joinVideoInterview);
router.post('/:id/video/end', endVideoInterview);
router.post('/:id/video/fraud-alert', reportFraudAlert);
router.post('/:id/video/chat', sendChatMessage);

// ========== Report Routes ==========
router.post('/:id/report/generate', isRecruiter, generateReport);
router.post('/:id/report/submit', isRecruiter, submitReport);
router.post('/:id/report/send-to-ceo', isRecruiter, submitReportToCEO);

// ========== CEO Review Routes ==========
router.get('/ceo/pending-reports', isCompanyAdmin, getPendingReportsForCEO);
router.post('/:id/ceo/decision', isCompanyAdmin, ceoDecision);

// ========== Offer Letter Routes ==========
router.post('/:id/offer/create', isRecruiter, createOfferLetter);
router.post('/:id/offer/send', isRecruiter, sendOfferLetter);
router.post('/:id/offer/respond', respondToOffer);

export default router;

