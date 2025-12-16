/**
 * Insights Routes - AI-Generated Hiring Insights
 */

import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { getHiringInsights, refreshInsights } from '../controllers/insights.controller.js';

const router = express.Router();

// Get AI hiring insights for CEO dashboard
router.route('/hiring').get(isAuthenticated, getHiringInsights);

// Force refresh insights
router.route('/refresh').post(isAuthenticated, refreshInsights);

export default router;
