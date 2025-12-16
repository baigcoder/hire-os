import express from 'express';
import { analyzeResume, getQuickResumeScore } from '../controllers/resume.controller.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';

const router = express.Router();

// Analyze resume with AI
router.post('/analyze', isAuthenticated, analyzeResume);

// Get quick resume score for dashboard
router.get('/quick-score', isAuthenticated, getQuickResumeScore);

export default router;
