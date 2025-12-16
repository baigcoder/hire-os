/**
 * Socket Manager - Industrial-Grade WebSocket Management
 * Handles interview rooms, real-time chat, WebRTC signaling, and presence
 */

import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { Interview } from '../models/interview.model.js';

// Interview room states
const ROOM_STATES = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ENDED: 'ended'
};

// User roles in interview
const ROLES = {
    RECRUITER: 'recruiter',
    CANDIDATE: 'candidate',
    OBSERVER: 'observer'
};

// In-memory store for active rooms (use Redis in production for scaling)
const activeRooms = new Map();
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> { userId, role, interviewId }

/**
 * Initialize Socket.io with optional Redis adapter
 */
export const initializeSocketManager = async (httpServer, allowedOrigins) => {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });

    // Try to connect Redis adapter for horizontal scaling
    let redisEnabled = false;
    if (process.env.REDIS_URL) {
        try {
            const pubClient = createClient({ url: process.env.REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);

            io.adapter(createAdapter(pubClient, subClient));
            redisEnabled = true;
            console.log('✅ Socket.io Redis adapter connected');
        } catch (err) {
            console.log('⚠️ Redis not available, using in-memory adapter');
        }
    }

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

            if (!token) {
                // Allow anonymous for development
                socket.user = { id: `anon_${socket.id}`, role: 'guest' };
                return next();
            }

            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            socket.user = {
                id: decoded.userId,
                role: decoded.role,
                fullname: decoded.fullname
            };
            next();
        } catch (err) {
            console.log('Socket auth error:', err.message);
            socket.user = { id: `anon_${socket.id}`, role: 'guest' };
            next();
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        console.log(`🔗 [Socket] Connected: ${socket.id} (User: ${socket.user?.id || 'anonymous'})`);

        // ========== INTERVIEW ROOM EVENTS ==========

        /**
         * Join Interview Room
         * Validates user and adds to room with appropriate role
         */
        socket.on('join-interview', async (data) => {
            try {
                const { interviewId, role = 'candidate' } = typeof data === 'string'
                    ? { interviewId: data }
                    : data;

                if (!interviewId) {
                    socket.emit('error', { message: 'Interview ID required' });
                    return;
                }

                // Initialize room if not exists
                if (!activeRooms.has(interviewId)) {
                    activeRooms.set(interviewId, {
                        id: interviewId,
                        state: ROOM_STATES.WAITING,
                        participants: new Map(),
                        messages: [],
                        startedAt: null,
                        createdAt: new Date()
                    });
                }

                const room = activeRooms.get(interviewId);

                // Add participant
                const participant = {
                    id: socket.user?.id || socket.id,
                    socketId: socket.id,
                    role: role,
                    fullname: socket.user?.fullname || `User ${socket.id.slice(0, 4)}`,
                    joinedAt: new Date(),
                    isAudioOn: true,
                    isVideoOn: true,
                    isScreenSharing: false
                };

                room.participants.set(socket.id, participant);
                socketUserMap.set(socket.id, {
                    userId: participant.id,
                    role,
                    interviewId
                });
                userSocketMap.set(participant.id, socket.id);

                // Join socket room
                socket.join(interviewId);

                // Notify others
                socket.to(interviewId).emit('participant-joined', {
                    participant,
                    participantCount: room.participants.size
                });

                // Send room state to joiner
                socket.emit('room-joined', {
                    room: {
                        id: room.id,
                        state: room.state,
                        participantCount: room.participants.size,
                        participants: Array.from(room.participants.values())
                    },
                    you: participant,
                    messages: room.messages.slice(-50) // Last 50 messages
                });

                // Auto-start if both parties present
                if (room.state === ROOM_STATES.WAITING) {
                    const hasRecruiter = Array.from(room.participants.values())
                        .some(p => p.role === ROLES.RECRUITER);
                    const hasCandidate = Array.from(room.participants.values())
                        .some(p => p.role === ROLES.CANDIDATE);

                    if (hasRecruiter && hasCandidate) {
                        room.state = ROOM_STATES.ACTIVE;
                        room.startedAt = new Date();
                        io.to(interviewId).emit('interview-started', {
                            startedAt: room.startedAt
                        });
                    }
                }

                console.log(`👤 [${role}] ${participant.fullname} joined interview: ${interviewId}`);

            } catch (error) {
                console.error('Join interview error:', error);
                socket.emit('error', { message: 'Failed to join interview' });
            }
        });

        /**
         * Leave Interview Room
         */
        socket.on('leave-interview', (interviewId) => {
            handleLeaveInterview(socket, interviewId, io);
        });

        // ========== WEBRTC SIGNALING ==========

        socket.on('offer', ({ interviewId, offer, targetId }) => {
            const target = targetId ? io.sockets.sockets.get(targetId) : null;
            if (target) {
                target.emit('offer', { offer, senderId: socket.id });
            } else {
                socket.to(interviewId).emit('offer', { offer, senderId: socket.id });
            }
        });

        socket.on('answer', ({ interviewId, answer, targetId }) => {
            const target = targetId ? io.sockets.sockets.get(targetId) : null;
            if (target) {
                target.emit('answer', { answer, senderId: socket.id });
            } else {
                socket.to(interviewId).emit('answer', { answer, senderId: socket.id });
            }
        });

        socket.on('ice-candidate', ({ interviewId, candidate, targetId }) => {
            const target = targetId ? io.sockets.sockets.get(targetId) : null;
            if (target) {
                target.emit('ice-candidate', { candidate, senderId: socket.id });
            } else {
                socket.to(interviewId).emit('ice-candidate', { candidate, senderId: socket.id });
            }
        });

        // ========== CHAT MESSAGES ==========

        socket.on('send-message', ({ interviewId, message, type = 'text' }) => {
            if (!interviewId || !message?.trim()) return;

            const room = activeRooms.get(interviewId);
            if (!room) return;

            const userData = socketUserMap.get(socket.id);

            const chatMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                senderId: userData?.userId || socket.id,
                senderName: socket.user?.fullname || 'Anonymous',
                senderRole: userData?.role || 'guest',
                message: message.trim(),
                type,
                timestamp: new Date()
            };

            // Store message
            room.messages.push(chatMessage);

            // Broadcast to all in room
            io.to(interviewId).emit('new-message', chatMessage);

            console.log(`💬 [${interviewId}] ${chatMessage.senderName}: ${message.slice(0, 50)}...`);
        });

        /**
         * Typing indicator
         */
        socket.on('typing-start', ({ interviewId }) => {
            socket.to(interviewId).emit('user-typing', {
                socketId: socket.id,
                name: socket.user?.fullname || 'Someone'
            });
        });

        socket.on('typing-stop', ({ interviewId }) => {
            socket.to(interviewId).emit('user-stopped-typing', {
                socketId: socket.id
            });
        });

        // ========== MEDIA STATE ==========

        socket.on('media-state-change', ({ interviewId, isAudioOn, isVideoOn, isScreenSharing }) => {
            const room = activeRooms.get(interviewId);
            if (room && room.participants.has(socket.id)) {
                const participant = room.participants.get(socket.id);
                if (isAudioOn !== undefined) participant.isAudioOn = isAudioOn;
                if (isVideoOn !== undefined) participant.isVideoOn = isVideoOn;
                if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;

                io.to(interviewId).emit('participant-media-changed', {
                    socketId: socket.id,
                    isAudioOn: participant.isAudioOn,
                    isVideoOn: participant.isVideoOn,
                    isScreenSharing: participant.isScreenSharing
                });
            }
        });

        // ========== INTERVIEW CONTROLS (Recruiter Only) ==========

        socket.on('end-interview', async ({ interviewId }) => {
            const userData = socketUserMap.get(socket.id);
            if (userData?.role !== ROLES.RECRUITER) {
                socket.emit('error', { message: 'Only recruiter can end interview' });
                return;
            }

            const room = activeRooms.get(interviewId);
            if (room) {
                room.state = ROOM_STATES.ENDED;
                room.endedAt = new Date();

                // Save interview data
                try {
                    await Interview.findByIdAndUpdate(interviewId, {
                        'videoInterview.status': 'completed',
                        'videoInterview.endedAt': room.endedAt,
                        'videoInterview.chatMessages': room.messages
                    });
                } catch (err) {
                    console.error('Failed to save interview:', err);
                }

                io.to(interviewId).emit('interview-ended', {
                    endedAt: room.endedAt,
                    duration: room.startedAt
                        ? Math.floor((room.endedAt - room.startedAt) / 1000)
                        : 0
                });

                // Cleanup
                activeRooms.delete(interviewId);
            }
        });

        // ========== AI FEEDBACK ==========

        socket.on('ai-analysis-update', ({ interviewId, data }) => {
            io.to(interviewId).emit('ai-feedback', data);
        });

        // ========== FRAUD DETECTION ==========

        socket.on('fraud-alert', ({ interviewId, type, details }) => {
            const room = activeRooms.get(interviewId);
            if (!room) return;

            const alert = {
                type,
                details,
                socketId: socket.id,
                timestamp: new Date()
            };

            // Notify recruiter only
            const recruiterParticipants = Array.from(room.participants.values())
                .filter(p => p.role === ROLES.RECRUITER);

            recruiterParticipants.forEach(p => {
                io.to(p.socketId).emit('fraud-detected', alert);
            });
        });

        // ========== DISCONNECT ==========

        socket.on('disconnect', () => {
            const userData = socketUserMap.get(socket.id);

            if (userData?.interviewId) {
                handleLeaveInterview(socket, userData.interviewId, io);
            }

            socketUserMap.delete(socket.id);
            if (userData?.userId) {
                userSocketMap.delete(userData.userId);
            }

            console.log(`❌ [Socket] Disconnected: ${socket.id}`);
        });
    });

    console.log('🚀 Socket Manager initialized' + (redisEnabled ? ' with Redis' : ''));
    return io;
};

/**
 * Handle user leaving interview
 */
const handleLeaveInterview = (socket, interviewId, io) => {
    const room = activeRooms.get(interviewId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);

    socket.leave(interviewId);

    if (participant) {
        io.to(interviewId).emit('participant-left', {
            socketId: socket.id,
            name: participant.fullname,
            participantCount: room.participants.size
        });
    }

    // Cleanup empty rooms
    if (room.participants.size === 0) {
        activeRooms.delete(interviewId);
    }
};

/**
 * Get active room info (for API endpoints)
 */
export const getRoomInfo = (interviewId) => {
    const room = activeRooms.get(interviewId);
    if (!room) return null;

    return {
        id: room.id,
        state: room.state,
        participantCount: room.participants.size,
        participants: Array.from(room.participants.values()).map(p => ({
            id: p.id,
            role: p.role,
            fullname: p.fullname,
            isAudioOn: p.isAudioOn,
            isVideoOn: p.isVideoOn
        })),
        messageCount: room.messages.length,
        startedAt: room.startedAt
    };
};

/**
 * Get chat history for an interview
 */
export const getChatHistory = (interviewId) => {
    const room = activeRooms.get(interviewId);
    return room?.messages || [];
};

export default {
    initializeSocketManager,
    getRoomInfo,
    getChatHistory,
    ROOM_STATES,
    ROLES
};
