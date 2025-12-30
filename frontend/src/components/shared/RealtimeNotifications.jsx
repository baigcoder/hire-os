/**
 * RealtimeNotifications - Live notification bell with Supabase realtime
 * Works across Student, Recruiter, and Admin dashboards
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, Briefcase, Users, AlertCircle, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatDistanceToNow } from "date-fns";

const RealtimeNotifications = ({ onNotificationClick }) => {
    const { user } = useSelector((state) => state.auth);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const channelRef = useRef(null);
    const dropdownRef = useRef(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Initialize Supabase realtime channel
    useEffect(() => {
        if (!user?._id) return;

        const channelName = `notifications:${user._id}`;
        const channel = supabase.channel(channelName, {
            config: { broadcast: { self: false } },
        });

        channelRef.current = channel;

        // Listen for various notification types
        const events = [
            "new-application",
            "application-update",
            "approval-needed",
            "interview-scheduled",
            "job-posted",
            "system-alert",
        ];

        events.forEach((event) => {
            channel.on("broadcast", { event }, ({ payload }) => {
                const notification = {
                    id: `${event}_${Date.now()}`,
                    type: event,
                    ...payload,
                    timestamp: new Date().toISOString(),
                    read: false,
                };
                setNotifications((prev) => [notification, ...prev].slice(0, 20));

                // Play notification sound
                try {
                    const audio = new Audio("/notification.mp3");
                    audio.volume = 0.3;
                    audio.play().catch(() => { });
                } catch { }
            });
        });

        channel.subscribe((status) => {
            setIsConnected(status === "SUBSCRIBED");
        });

        return () => {
            channel.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, [user?._id]);

    const markAsRead = useCallback((id) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case "new-application":
                return <Users size={16} className="text-cyan-400" />;
            case "application-update":
                return <Briefcase size={16} className="text-green-400" />;
            case "approval-needed":
                return <AlertCircle size={16} className="text-yellow-400" />;
            case "interview-scheduled":
                return <Clock size={16} className="text-purple-400" />;
            default:
                return <Bell size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-md bg-[#111] border border-white/10 hover:border-cyan-500/30 transition-all group"
            >
                <Bell
                    size={20}
                    className={`transition-colors ${isConnected ? "text-cyan-400" : "text-gray-500"
                        } group-hover:text-cyan-300`}
                />

                {/* Live indicator */}
                <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"
                        }`}
                />

                {/* Unread count badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 max-h-[400px] bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#111]">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white uppercase tracking-wider">
                                    Notifications
                                </span>
                                {isConnected && (
                                    <span className="text-[10px] text-green-400 font-mono">
                                        LIVE
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-xs text-gray-500 hover:text-gray-300"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto max-h-[320px]">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell size={32} className="mx-auto text-gray-600 mb-2" />
                                    <p className="text-gray-500 text-sm">No notifications yet</p>
                                    <p className="text-gray-600 text-xs mt-1">
                                        Real-time updates will appear here
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => {
                                            markAsRead(notification.id);
                                            onNotificationClick?.(notification);
                                        }}
                                        className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!notification.read ? "bg-cyan-500/5" : ""
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">{getIcon(notification.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium truncate">
                                                    {notification.title || notification.type.replace(/-/g, " ")}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {notification.message || notification.data?.message || "New notification"}
                                                </p>
                                                <p className="text-[10px] text-gray-600 mt-1 font-mono">
                                                    {formatDistanceToNow(new Date(notification.timestamp), {
                                                        addSuffix: true,
                                                    })}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RealtimeNotifications;
