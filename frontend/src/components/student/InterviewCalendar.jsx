/**
 * InterviewCalendar Component
 * Display scheduled interviews in a calendar view
 * Premium Industrial Theme - Exact match with HIRE.OS design language
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, ChevronLeft, ChevronRight, Video, Clock, Building,
    MapPin, Briefcase, Bell, Loader2, CalendarDays,
    MonitorPlay, Play, Phone, Sparkles
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { ComponentLoader } from '../shared/DashboardLoader';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { APPLICATION_API_END_POINT } from '@/utils/constant';

const InterviewCalendar = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [view, setView] = useState('calendar');

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${APPLICATION_API_END_POINT}/get`, { withCredentials: true });
            if (res.data.success) {
                const interviewApps = (res.data.application || [])
                    .filter(app => app.status === 'interview' || app.interviewDate)
                    .map(app => ({
                        id: app._id,
                        title: app.job?.title || 'Interview',
                        company: app.job?.company?.name || 'Company',
                        date: app.interviewDate || app.updatedAt,
                        status: app.status,
                        type: app.interviewType || 'Video Call',
                        jobId: app.job?._id
                    }));
                setInterviews(interviewApps);
            }
        } catch (error) {
            console.error('Error fetching interviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const days = [];
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
        return days;
    };

    const getInterviewsForDate = (date) => {
        return interviews.filter(interview => {
            const interviewDate = new Date(interview.date);
            return interviewDate.toDateString() === date.toDateString();
        });
    };

    const isToday = (date) => date.toDateString() === new Date().toDateString();

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const days = getDaysInMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const upcomingInterviews = interviews.filter(interview => {
        const interviewDate = new Date(interview.date);
        return interviewDate >= new Date();
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <ComponentLoader message="Loading schedule" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
        >
            {/* Header Section */}
            <div className="mb-8">
                {/* Badge */}
                <div className="flex justify-center mb-6">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/40"
                    >
                        <Sparkles className="w-4 h-4 text-[#FFD700]" />
                        <span className="text-[#FFD700] text-sm font-semibold tracking-wide">HIRE.OS POWERED</span>
                    </motion.div>
                </div>

                {/* Title */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl md:text-5xl font-bold text-center mb-3"
                >
                    <span className="text-white">Interview </span>
                    <span className="text-[#FFD700]">Calendar</span>
                </motion.h1>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-gray-500 text-base max-w-xl mx-auto"
                >
                    Track and manage all your upcoming interviews
                </motion.p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Left Column - View Type Selection */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-sm border border-[#2a2a2a] p-5"
                >
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">SELECT VIEW TYPE</h3>

                    <div className="space-y-3">
                        <motion.button
                            onClick={() => setView('calendar')}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className={`w-full flex items-center gap-4 p-4 rounded-sm transition-all duration-200 ${view === 'calendar'
                                ? 'bg-[#FFD700] border-2 border-[#FFD700]'
                                : 'bg-transparent border-2 border-[#2a2a2a] hover:border-[#444]'
                                }`}
                        >
                            <div className="flex-1 text-left">
                                <h4 className={`font-bold ${view === 'calendar' ? 'text-black' : 'text-white'}`}>
                                    Calendar
                                </h4>
                                <p className={`text-sm ${view === 'calendar' ? 'text-black/70' : 'text-gray-500'}`}>
                                    Monthly calendar view
                                </p>
                            </div>
                        </motion.button>

                        <motion.button
                            onClick={() => setView('list')}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className={`w-full flex items-center gap-4 p-4 rounded-sm transition-all duration-200 ${view === 'list'
                                ? 'bg-[#FFD700] border-2 border-[#FFD700]'
                                : 'bg-transparent border-2 border-[#2a2a2a] hover:border-[#444]'
                                }`}
                        >
                            <div className="flex-1 text-left">
                                <h4 className={`font-bold ${view === 'list' ? 'text-black' : 'text-white'}`}>
                                    List
                                </h4>
                                <p className={`text-sm ${view === 'list' ? 'text-black/70' : 'text-gray-500'}`}>
                                    All interviews in a list
                                </p>
                            </div>
                        </motion.button>

                        <motion.button
                            onClick={() => setView('upcoming')}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className={`w-full flex items-center gap-4 p-4 rounded-sm transition-all duration-200 ${view === 'upcoming'
                                ? 'bg-[#FFD700] border-2 border-[#FFD700]'
                                : 'bg-transparent border-2 border-[#2a2a2a] hover:border-[#444]'
                                }`}
                        >
                            <div className="flex-1 text-left">
                                <h4 className={`font-bold ${view === 'upcoming' ? 'text-black' : 'text-white'}`}>
                                    Upcoming
                                </h4>
                                <p className={`text-sm ${view === 'upcoming' ? 'text-black/70' : 'text-gray-500'}`}>
                                    Next scheduled interviews
                                </p>
                            </div>
                        </motion.button>
                    </div>
                </motion.div>

                {/* Right Column - Quick Stats & Filters */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-sm border border-[#2a2a2a] p-5"
                >
                    {/* Quick Stats */}
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">STATS</h3>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button className="flex items-center justify-center gap-2 p-4 rounded-sm bg-[#FFD700] text-black font-bold">
                            <CalendarDays className="w-5 h-5" />
                            <span>{interviews.length} Total</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 p-4 rounded-sm border-2 border-[#2a2a2a] text-gray-400">
                            <Clock className="w-5 h-5" />
                            <span>{upcomingInterviews.length} Upcoming</span>
                        </button>
                    </div>

                    {/* Quick Navigation */}
                    <div className="relative">
                        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 block">QUICK NAV</label>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="w-full flex items-center justify-between p-4 rounded-sm border-2 border-[#2a2a2a] hover:border-[#444] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FFD700] to-[#FFA500]">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <span className="text-white font-medium block">Jump to Today</span>
                                    <span className="text-gray-500 text-xs">
                                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Calendar/List View */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="rounded-sm border border-[#2a2a2a] p-6"
            >
                {view === 'calendar' ? (
                    <>
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => navigateMonth(-1)}
                                className="p-3 rounded-sm border-2 border-[#2a2a2a] hover:border-[#FFD700]/50 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-400" />
                            </button>
                            <h3 className="text-lg font-bold text-white">{monthName}</h3>
                            <button
                                onClick={() => navigateMonth(1)}
                                className="p-3 rounded-sm border-2 border-[#2a2a2a] hover:border-[#FFD700]/50 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Week Days */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map(day => (
                                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2 uppercase">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, idx) => {
                                const dayInterviews = getInterviewsForDate(day.date);
                                const hasInterviews = dayInterviews.length > 0;
                                const isSelected = selectedDate?.toDateString() === day.date.toDateString();

                                return (
                                    <motion.button
                                        key={idx}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedDate(day.date)}
                                        className={`
                                            aspect-square p-1 rounded-sm relative transition-all border-2
                                            ${!day.isCurrentMonth ? 'opacity-30' : ''}
                                            ${isToday(day.date) ? 'border-[#FFD700]/50 bg-[#FFD700]/10' : 'border-transparent'}
                                            ${isSelected ? 'bg-[#FFD700] border-[#FFD700]' : 'hover:border-[#444]'}
                                            ${hasInterviews && !isSelected ? 'bg-[#00FF94]/10 border-[#00FF94]/30' : ''}
                                        `}
                                    >
                                        <span className={`text-sm font-medium ${isSelected ? 'text-black' : day.isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>
                                            {day.date.getDate()}
                                        </span>
                                        {hasInterviews && (
                                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                                                {dayInterviews.slice(0, 3).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-[#00FF94]'}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Selected Date Details */}
                        <AnimatePresence mode="wait">
                            {selectedDate && (
                                <motion.div
                                    key={selectedDate.toISOString()}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-6 p-4 rounded-sm bg-[#1a1a1a] border border-[#2a2a2a]"
                                >
                                    <h4 className="font-bold text-white mb-3">
                                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h4>
                                    {getInterviewsForDate(selectedDate).length > 0 ? (
                                        <div className="space-y-3">
                                            {getInterviewsForDate(selectedDate).map(interview => (
                                                <div
                                                    key={interview.id}
                                                    onClick={() => interview.jobId && navigate(`/description/${interview.jobId}`)}
                                                    className="flex items-center gap-4 p-3 rounded-sm bg-[#00FF94]/10 border border-[#00FF94]/30 cursor-pointer hover:border-[#00FF94]/50 transition-colors"
                                                >
                                                    <div className="w-10 h-10 rounded-sm bg-[#00FF94]/20 flex items-center justify-center">
                                                        <Video className="w-5 h-5 text-[#00FF94]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h5 className="font-bold text-white text-sm">{interview.title}</h5>
                                                        <p className="text-xs text-gray-500">{interview.company}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-[#00FF94] font-medium">{formatTime(interview.date)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-4">No interviews scheduled</p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : view === 'list' || view === 'upcoming' ? (
                    /* List View */
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            {view === 'upcoming' ? 'UPCOMING INTERVIEWS' : 'ALL INTERVIEWS'}
                        </h3>
                        {(view === 'upcoming' ? upcomingInterviews : interviews).length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="w-8 h-8 text-gray-600" />
                                </div>
                                <h3 className="text-white font-bold mb-2">No Interviews Yet</h3>
                                <p className="text-gray-500 text-sm">Apply to jobs and get invited to interviews</p>
                            </div>
                        ) : (
                            (view === 'upcoming' ? upcomingInterviews : interviews)
                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                .map((interview, idx) => (
                                    <motion.div
                                        key={interview.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => interview.jobId && navigate(`/description/${interview.jobId}`)}
                                        className="flex items-center gap-4 p-4 rounded-sm border-2 border-[#2a2a2a] hover:border-[#FFD700]/50 transition-all cursor-pointer"
                                    >
                                        <div className="w-12 h-12 rounded-sm bg-[#00FF94]/10 flex items-center justify-center border border-[#00FF94]/30">
                                            <Video className="w-6 h-6 text-[#00FF94]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white truncate">{interview.title}</h4>
                                            <p className="text-sm text-gray-500">{interview.company}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-white font-medium">
                                                {new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-[#FFD700]">{formatTime(interview.date)}</p>
                                        </div>
                                    </motion.div>
                                ))
                        )}
                    </div>
                ) : null}
            </motion.div>

            {/* Start Button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6"
            >
                <motion.button
                    onClick={() => navigate('/jobs')}
                    whileHover={{ scale: 1.01, boxShadow: '0 10px 30px rgba(255, 215, 0, 0.3)' }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-4 bg-[#FFD700] hover:bg-[#E6C200] rounded-sm font-bold text-black text-lg flex items-center justify-center gap-3 transition-all duration-200"
                >
                    <Play className="w-5 h-5" />
                    <span className="uppercase tracking-wider">Browse Jobs</span>
                </motion.button>

                {/* Helper Text */}
                <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Video interviews</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>Phone screens</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>AI-powered prep</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default InterviewCalendar;
