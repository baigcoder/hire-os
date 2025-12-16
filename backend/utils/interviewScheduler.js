/**
 * Interview Scheduler
 * Automatically sends email reminders for upcoming interviews
 */

import { Interview } from '../models/interview.model.js';
import { User } from '../models/user.model.js';
import { Job } from '../models/job.model.js';
import { sendInterviewReminder } from './email.js';
import { Notification } from '../models/notification.model.js';

// Reminder intervals in milliseconds
const REMINDER_24H = 24 * 60 * 60 * 1000;
const REMINDER_1H = 60 * 60 * 1000;
const REMINDER_15MIN = 15 * 60 * 1000;

// Track sent reminders to avoid duplicates (in-memory, use Redis in production)
const sentReminders = new Map();

/**
 * Check and send interview reminders
 * Should be called periodically (e.g., every 5 minutes)
 */
export const checkAndSendReminders = async () => {
    try {
        const now = new Date();

        // Find upcoming interviews in the next 25 hours
        const upcomingInterviews = await Interview.find({
            scheduledAt: {
                $gte: now,
                $lte: new Date(now.getTime() + 25 * 60 * 60 * 1000)
            },
            status: { $in: ['scheduled', 'confirmed'] }
        })
            .populate('candidateId', 'fullname email')
            .populate('jobId', 'title')
            .populate({
                path: 'jobId',
                populate: { path: 'company', select: 'name' }
            })
            .populate('interviewerId', 'fullname');

        console.log(`📅 Checking ${upcomingInterviews.length} upcoming interviews for reminders...`);

        for (const interview of upcomingInterviews) {
            const timeUntilInterview = interview.scheduledAt.getTime() - now.getTime();
            const reminderKey = `${interview._id}`;
            const sentTypes = sentReminders.get(reminderKey) || [];

            // Determine which reminder to send
            let reminderType = null;

            if (timeUntilInterview <= REMINDER_15MIN && !sentTypes.includes('15min')) {
                reminderType = '15min';
            } else if (timeUntilInterview <= REMINDER_1H && timeUntilInterview > REMINDER_15MIN && !sentTypes.includes('1h')) {
                reminderType = '1h';
            } else if (timeUntilInterview <= REMINDER_24H && timeUntilInterview > REMINDER_1H && !sentTypes.includes('24h')) {
                reminderType = '24h';
            }

            if (reminderType) {
                await sendReminderForInterview(interview, reminderType);
                sentTypes.push(reminderType);
                sentReminders.set(reminderKey, sentTypes);
            }
        }

        // Clean up old reminders from memory
        cleanupOldReminders();

    } catch (error) {
        console.error('❌ Error checking interview reminders:', error);
    }
};

/**
 * Send reminder for a specific interview
 */
const sendReminderForInterview = async (interview, reminderType) => {
    try {
        const candidate = interview.candidateId;
        const job = interview.jobId;
        const company = job?.company;
        const interviewer = interview.interviewerId;

        if (!candidate?.email) {
            console.log(`⚠️ No candidate email for interview ${interview._id}`);
            return;
        }

        const interviewDetails = {
            jobTitle: job?.title || 'Position',
            companyName: company?.name || 'Company',
            interviewDate: interview.scheduledAt,
            interviewTime: interview.scheduledAt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            interviewType: interview.type || 'video',
            meetingLink: interview.meetingLink || `${process.env.FRONTEND_URL}/interview/live/${interview._id}`,
            recruiterName: interviewer?.fullname,
            reminderType
        };

        // Send email
        await sendInterviewReminder(candidate.email, candidate.fullname, interviewDetails);

        // Create in-app notification
        await Notification.create({
            userId: candidate._id,
            type: 'interview_reminder',
            title: reminderType === '15min' ? '⏰ Interview Starting Soon!' :
                reminderType === '1h' ? '📅 Interview in 1 Hour' :
                    '📅 Interview Tomorrow',
            message: `Your interview for ${job?.title} is ${reminderType === '15min' ? 'starting in 15 minutes' :
                    reminderType === '1h' ? 'in 1 hour' :
                        'tomorrow'
                }. ${interview.meetingLink ? 'Click to join!' : ''}`,
            relatedEntities: {
                interviewId: interview._id,
                jobId: job?._id
            },
            priority: reminderType === '15min' ? 'urgent' : 'normal',
            actionUrl: interview.meetingLink || `/interview/live/${interview._id}`
        });

        console.log(`✅ Sent ${reminderType} reminder for interview ${interview._id}`);

    } catch (error) {
        console.error(`❌ Failed to send reminder for interview ${interview._id}:`, error);
    }
};

/**
 * Clean up old reminders from memory
 */
const cleanupOldReminders = () => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // This is a simple cleanup - in production, use Redis with TTL
    if (sentReminders.size > 1000) {
        sentReminders.clear();
        console.log('🧹 Cleared reminder cache');
    }
};

/**
 * Start the reminder scheduler
 * Runs every 5 minutes
 */
export const startInterviewScheduler = () => {
    // Initial check
    checkAndSendReminders();

    // Schedule to run every 5 minutes
    const intervalId = setInterval(checkAndSendReminders, 5 * 60 * 1000);

    console.log('⏰ Interview reminder scheduler started (runs every 5 minutes)');

    return intervalId;
};

/**
 * Schedule a specific interview and send initial notification
 */
export const scheduleInterview = async (interviewData) => {
    try {
        const {
            candidateId,
            jobId,
            recruiterId,
            scheduledAt,
            duration = 30,
            type = 'video'
        } = interviewData;

        // Generate meeting link
        const meetingId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const meetingLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/interview/live/${meetingId}`;

        // Create interview record
        const interview = await Interview.create({
            candidateId,
            jobId,
            interviewerId: recruiterId,
            scheduledAt: new Date(scheduledAt),
            duration,
            type,
            meetingLink,
            meetingId,
            status: 'scheduled'
        });

        // Get details for notification
        const [candidate, job] = await Promise.all([
            User.findById(candidateId),
            Job.findById(jobId).populate('company')
        ]);

        // Send immediate confirmation email & notification
        if (candidate?.email) {
            const interviewDetails = {
                jobTitle: job?.title || 'Position',
                companyName: job?.company?.name || 'Company',
                interviewDate: scheduledAt,
                interviewTime: new Date(scheduledAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                interviewType: type,
                meetingLink,
                reminderType: 'scheduled'
            };

            // Create notification
            await Notification.create({
                userId: candidateId,
                type: 'interview_scheduled',
                title: '🎉 Interview Scheduled!',
                message: `Your interview for ${job?.title} has been scheduled for ${new Date(scheduledAt).toLocaleDateString()}.`,
                relatedEntities: {
                    interviewId: interview._id,
                    jobId
                },
                actionUrl: meetingLink
            });
        }

        console.log(`📅 Interview scheduled: ${interview._id} for ${scheduledAt}`);

        return interview;

    } catch (error) {
        console.error('❌ Error scheduling interview:', error);
        throw error;
    }
};

export default {
    checkAndSendReminders,
    startInterviewScheduler,
    scheduleInterview
};
