/**
 * useDashboardSocket Hook - Real-time Dashboard Updates
 * Handles WebSocket connection for live dashboard data
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

export const useDashboardSocket = (options = {}) => {
    const { user } = useSelector(state => state.auth);
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Callbacks for real-time updates
    const [onStatsUpdate, setOnStatsUpdate] = useState(null);
    const [onApplicationUpdate, setOnApplicationUpdate] = useState(null);
    const [onNotification, setOnNotification] = useState(null);

    // Initialize socket connection
    useEffect(() => {
        if (!user?._id) return;

        const token = localStorage.getItem('token');

        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 10000,
            ...options.socketOptions
        });

        const socket = socketRef.current;

        // Connection events
        socket.on('connect', () => {
            console.log('📊 [Dashboard Socket] Connected:', socket.id);
            setIsConnected(true);
            setIsLive(true);

            // Subscribe to dashboard updates for this user
            socket.emit('subscribe-dashboard', {
                userId: user._id,
                role: user.role
            });
        });

        socket.on('connect_error', (error) => {
            console.error('📊 [Dashboard Socket] Connection error:', error.message);
            setIsConnected(false);
            setIsLive(false);
        });

        socket.on('disconnect', (reason) => {
            console.log('📊 [Dashboard Socket] Disconnected:', reason);
            setIsConnected(false);
            setIsLive(false);
        });

        // Dashboard update events
        socket.on('stats-update', (data) => {
            console.log('📊 [Dashboard Socket] Stats update received:', data);
            setLastUpdate(new Date());
            if (options.onStatsUpdate) options.onStatsUpdate(data);
        });

        socket.on('application-update', (data) => {
            console.log('📊 [Dashboard Socket] Application update:', data);
            setLastUpdate(new Date());
            if (options.onApplicationUpdate) options.onApplicationUpdate(data);
        });

        socket.on('new-notification', (data) => {
            console.log('📊 [Dashboard Socket] New notification:', data);
            if (options.onNotification) options.onNotification(data);
        });

        socket.on('job-view', (data) => {
            console.log('📊 [Dashboard Socket] Job view:', data);
            if (options.onJobView) options.onJobView(data);
        });

        // Cleanup
        return () => {
            socket.emit('unsubscribe-dashboard', { userId: user._id });
            socket.disconnect();
        };
    }, [user?._id, user?.role]);

    // Request stats refresh
    const refreshStats = useCallback(() => {
        if (!socketRef.current || !user?._id) return;
        socketRef.current.emit('request-stats-refresh', { userId: user._id });
    }, [user?._id]);

    // Get socket instance
    const getSocket = useCallback(() => socketRef.current, []);

    return {
        socket: socketRef.current,
        getSocket,
        isConnected,
        isLive,
        lastUpdate,
        refreshStats
    };
};

export default useDashboardSocket;
