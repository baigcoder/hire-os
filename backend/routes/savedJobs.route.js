/**
 * Saved Jobs Routes
 * Allows students to bookmark/save jobs for later
 */

import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { User } from '../models/user.model.js';
import { Job } from '../models/job.model.js';

const router = express.Router();

/**
 * Save a job
 * POST /api/v1/saved-jobs/save/:jobId
 */
router.post('/save/:jobId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;
        const { jobId } = req.params;

        // Verify job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Add to saved jobs (avoid duplicates)
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { savedJobs: jobId } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Job saved successfully',
            savedCount: user.savedJobs.length
        });

    } catch (error) {
        console.error('Save job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save job'
        });
    }
});

/**
 * Unsave a job
 * DELETE /api/v1/saved-jobs/unsave/:jobId
 */
router.delete('/unsave/:jobId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;
        const { jobId } = req.params;

        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { savedJobs: jobId } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Job removed from saved',
            savedCount: user.savedJobs.length
        });

    } catch (error) {
        console.error('Unsave job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unsave job'
        });
    }
});

/**
 * Get all saved jobs
 * GET /api/v1/saved-jobs
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;

        const user = await User.findById(userId)
            .populate({
                path: 'savedJobs',
                populate: {
                    path: 'company',
                    select: 'name logo location'
                }
            })
            .select('savedJobs');

        // Filter out any null jobs (deleted jobs)
        const savedJobs = (user.savedJobs || []).filter(job => job != null);

        res.status(200).json({
            success: true,
            count: savedJobs.length,
            savedJobs
        });

    } catch (error) {
        console.error('Get saved jobs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get saved jobs'
        });
    }
});

/**
 * Check if a job is saved
 * GET /api/v1/saved-jobs/check/:jobId
 */
router.get('/check/:jobId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;
        const { jobId } = req.params;

        const user = await User.findById(userId).select('savedJobs');
        const isSaved = user.savedJobs.includes(jobId);

        res.status(200).json({
            success: true,
            isSaved
        });

    } catch (error) {
        console.error('Check saved job error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check saved status'
        });
    }
});

/**
 * Toggle save status
 * POST /api/v1/saved-jobs/toggle/:jobId
 */
router.post('/toggle/:jobId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.id;
        const { jobId } = req.params;

        const user = await User.findById(userId).select('savedJobs');
        const isSaved = user.savedJobs.includes(jobId);

        if (isSaved) {
            await User.findByIdAndUpdate(userId, { $pull: { savedJobs: jobId } });
        } else {
            // Verify job exists
            const job = await Job.findById(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }
            await User.findByIdAndUpdate(userId, { $addToSet: { savedJobs: jobId } });
        }

        res.status(200).json({
            success: true,
            isSaved: !isSaved,
            message: isSaved ? 'Job removed from saved' : 'Job saved successfully'
        });

    } catch (error) {
        console.error('Toggle save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle save status'
        });
    }
});

export default router;
