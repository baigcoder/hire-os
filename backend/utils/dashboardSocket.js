/**
 * Dashboard Socket Handlers - Real-time CEO Dashboard Updates
 * Handles dashboard rooms and broadcasts updates
 */

// Store for dashboard connections
const dashboardRooms = new Map(); // companyId -> Set of socketIds

/**
 * Initialize dashboard socket handlers
 * @param {Socket.io Server} io - The Socket.io server instance
 */
export const initializeDashboardSockets = (io) => {
    io.on('connection', (socket) => {
        // ========== CEO DASHBOARD EVENTS ==========

        /**
         * CEO joins their company dashboard room
         */
        socket.on('join-ceo-dashboard', async (data) => {
            try {
                const { companyId } = typeof data === 'string' ? { companyId: data } : data;

                if (!companyId) {
                    socket.emit('error', { message: 'Company ID required' });
                    return;
                }

                // Verify user is CEO (check socket.user set by auth middleware)
                if (socket.user?.role !== 'company_admin' && socket.user?.role !== 'recruiter') {
                    socket.emit('error', { message: 'Unauthorized - CEO/Recruiter access only' });
                    return;
                }

                const roomName = `dashboard:${companyId}`;

                // Initialize room if not exists
                if (!dashboardRooms.has(companyId)) {
                    dashboardRooms.set(companyId, new Set());
                }

                dashboardRooms.get(companyId).add(socket.id);
                socket.join(roomName);

                // Store company ID on socket for cleanup
                socket.dashboardCompanyId = companyId;

                socket.emit('dashboard-joined', {
                    companyId,
                    connectedAt: new Date(),
                    message: 'Real-time updates enabled'
                });

                console.log(`📊 [Dashboard] ${socket.user?.fullname || 'User'} joined company dashboard: ${companyId}`);
            } catch (error) {
                console.error('Join dashboard error:', error);
                socket.emit('error', { message: 'Failed to join dashboard' });
            }
        });

        /**
         * Leave dashboard room
         */
        socket.on('leave-ceo-dashboard', () => {
            if (socket.dashboardCompanyId) {
                handleLeaveDashboard(socket);
            }
        });

        /**
         * Handle disconnect - cleanup dashboard room
         */
        socket.on('disconnect', () => {
            if (socket.dashboardCompanyId) {
                handleLeaveDashboard(socket);
            }
            if (socket.studentDashboardUserId) {
                handleLeaveStudentDashboard(socket);
            }
        });

        // ========== STUDENT DASHBOARD EVENTS ==========

        /**
         * Student subscribes to their dashboard for real-time updates
         */
        socket.on('subscribe-dashboard', async (data) => {
            try {
                const { userId, role } = data;

                if (!userId) {
                    socket.emit('error', { message: 'User ID required' });
                    return;
                }

                const roomName = `student-dashboard:${userId}`;
                socket.join(roomName);
                socket.studentDashboardUserId = userId;

                socket.emit('dashboard-subscribed', {
                    userId,
                    subscribedAt: new Date(),
                    message: 'Real-time updates enabled'
                });

                console.log(`📊 [Student Dashboard] User ${userId} subscribed to real-time updates`);
            } catch (error) {
                console.error('Subscribe dashboard error:', error);
                socket.emit('error', { message: 'Failed to subscribe to dashboard' });
            }
        });

        /**
         * Student unsubscribes from dashboard
         */
        socket.on('unsubscribe-dashboard', (data) => {
            if (socket.studentDashboardUserId) {
                handleLeaveStudentDashboard(socket);
            }
        });

        /**
         * Request stats refresh
         */
        socket.on('request-stats-refresh', (data) => {
            const { userId } = data;
            // This would trigger a stats recalculation and emit back to the user
            console.log(`📊 [Student Dashboard] Stats refresh requested for ${userId}`);
        });
    });

    console.log('📊 Dashboard socket handlers initialized (CEO + Student)');
};

/**
 * Handle user leaving dashboard
 */
const handleLeaveDashboard = (socket) => {
    const companyId = socket.dashboardCompanyId;
    if (!companyId) return;

    const room = dashboardRooms.get(companyId);
    if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
            dashboardRooms.delete(companyId);
        }
    }

    socket.leave(`dashboard:${companyId}`);
    socket.dashboardCompanyId = null;
};

/**
 * Handle student leaving dashboard
 */
const handleLeaveStudentDashboard = (socket) => {
    const userId = socket.studentDashboardUserId;
    if (!userId) return;

    socket.leave(`student-dashboard:${userId}`);
    socket.studentDashboardUserId = null;
    console.log(`📊 [Student Dashboard] User ${userId} unsubscribed from updates`);
};

/**
 * Broadcast new application to company dashboard
 */
export const broadcastNewApplication = (io, companyId, applicationData) => {
    const roomName = `dashboard:${companyId}`;

    io.to(roomName).emit('new-application', {
        type: 'NEW_APPLICATION',
        timestamp: new Date(),
        data: {
            applicantName: applicationData.applicantName,
            jobTitle: applicationData.jobTitle,
            jobId: applicationData.jobId,
            applicationId: applicationData.applicationId
        }
    });

    console.log(`📊 [Dashboard] Broadcasted new application to ${roomName}`);
};

/**
 * Broadcast new pending approval to CEO dashboard
 */
export const broadcastNewApproval = (io, companyId, approvalData) => {
    const roomName = `dashboard:${companyId}`;

    io.to(roomName).emit('new-approval', {
        type: 'NEW_APPROVAL',
        timestamp: new Date(),
        data: {
            applicantName: approvalData.applicantName,
            jobTitle: approvalData.jobTitle,
            applicationId: approvalData.applicationId,
            recruiterName: approvalData.recruiterName,
            recommendation: approvalData.recommendation
        }
    });

    console.log(`📊 [Dashboard] Broadcasted new approval to ${roomName}`);
};

/**
 * Broadcast stats update to company dashboard
 */
export const broadcastStatsUpdate = (io, companyId, statsData) => {
    const roomName = `dashboard:${companyId}`;

    io.to(roomName).emit('stats-update', {
        type: 'STATS_UPDATE',
        timestamp: new Date(),
        data: statsData
    });
};

/**
 * Get connected dashboard users count for a company
 */
export const getDashboardConnections = (companyId) => {
    const room = dashboardRooms.get(companyId);
    return room ? room.size : 0;
};

/**
 * Broadcast stats update to student dashboard
 */
export const broadcastStudentStatsUpdate = (io, userId, statsData) => {
    const roomName = `student-dashboard:${userId}`;

    io.to(roomName).emit('stats-update', {
        type: 'STATS_UPDATE',
        timestamp: new Date(),
        data: statsData
    });

    console.log(`📊 [Student Dashboard] Stats update sent to ${userId}`);
};

/**
 * Broadcast application status change to student
 */
export const broadcastApplicationUpdate = (io, userId, applicationData) => {
    const roomName = `student-dashboard:${userId}`;

    io.to(roomName).emit('application-update', {
        type: 'APPLICATION_UPDATE',
        timestamp: new Date(),
        data: applicationData
    });

    console.log(`📊 [Student Dashboard] Application update sent to ${userId}`);
};

export default {
    initializeDashboardSockets,
    broadcastNewApplication,
    broadcastNewApproval,
    broadcastStatsUpdate,
    getDashboardConnections,
    broadcastStudentStatsUpdate,
    broadcastApplicationUpdate
};
