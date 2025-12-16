/**
 * DashboardCharts - Animated Live Charts for Student Dashboard
 * Hire.iOS Industrial Design with Gold Accents
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Target, Briefcase, CheckCircle } from 'lucide-react';

// Hire.iOS Color Palette
const COLORS = {
    gold: '#FFD700',
    goldDark: '#B8860B',
    success: '#00FF94',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#A855F7',
    cyan: '#22D3EE',
    surface: '#111111',
    border: 'rgba(255, 255, 255, 0.1)'
};

const PIE_COLORS = ['#FFD700', '#00FF94', '#F59E0B', '#EF4444', '#A855F7'];

// Custom Tooltip with Hire.iOS theme
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-3 shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }} className="font-bold">
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

/**
 * Application Status Pie Chart
 */
export const ApplicationStatusChart = ({ stats }) => {
    const data = [
        { name: 'Pending', value: stats.pending || 0 },
        { name: 'Accepted', value: stats.accepted || 0 },
        { name: 'Interviews', value: stats.interviews || 0 },
        { name: 'Rejected', value: stats.rejected || 0 }
    ].filter(item => item.value > 0);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className="bg-[#111111] border border-white/10 rounded-lg p-6 h-full">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#FFD700]" />
                    Application Status
                </h3>
                <div className="flex items-center justify-center h-48 text-gray-500">
                    No applications yet
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] border border-white/10 rounded-lg p-6"
        >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#FFD700]" />
                Application Status
            </h3>

            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                    stroke="transparent"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
                {data.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-gray-400 text-sm">{entry.name}</span>
                        <span className="text-white font-bold text-sm">{entry.value}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

/**
 * Weekly Activity Area Chart
 */
export const WeeklyActivityChart = ({ applications = [], jobViews = [] }) => {
    // Generate weekly data from applications
    const generateWeeklyData = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const weekData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayName = days[date.getDay()];

            // Count applications for this day
            const appCount = applications.filter(app => {
                const appDate = new Date(app.createdAt);
                return appDate.toDateString() === date.toDateString();
            }).length;

            // Count job views for this day (real data from props)
            const viewCount = jobViews.filter(view => {
                const viewDate = new Date(view.viewedAt || view.createdAt);
                return viewDate.toDateString() === date.toDateString();
            }).length;

            weekData.push({
                day: dayName,
                applications: appCount,
                views: viewCount
            });
        }

        return weekData;
    };

    const data = generateWeeklyData();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#111111] border border-white/10 rounded-lg p-6"
        >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#FFD700]" />
                Weekly Activity
            </h3>

            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                        <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="applications"
                            stroke="#FFD700"
                            strokeWidth={2}
                            fill="url(#goldGradient)"
                            name="Applications"
                            animationDuration={1000}
                        />
                        <Area
                            type="monotone"
                            dataKey="views"
                            stroke="#00FF94"
                            strokeWidth={2}
                            fill="url(#greenGradient)"
                            name="Job Views"
                            animationDuration={1200}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

/**
 * Skills Match Bar Chart
 */
export const SkillsMatchChart = ({ skills = [] }) => {
    // Only use real skills data - no mock fallback
    const data = skills;

    // Show empty state when no skills data
    if (!data || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#111111] border border-white/10 rounded-lg p-6"
            >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#FFD700]" />
                    Skills Match
                </h3>
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <Target className="w-8 h-8 mb-2 text-gray-600" />
                    <p>Upload your resume for skills analysis</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#111111] border border-white/10 rounded-lg p-6"
        >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#FFD700]" />
                Skills Match
            </h3>

            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" domain={[0, 100]} stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                        <YAxis dataKey="skill" type="category" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="match"
                            fill="#FFD700"
                            radius={[0, 4, 4, 0]}
                            animationDuration={1000}
                            name="Your Level"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

/**
 * Animated Stat Card
 */
export const AnimatedStatCard = ({ icon: Icon, title, value, trend, color = 'gold' }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 1000;
        const steps = 20;
        const increment = value / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    const colorClasses = {
        gold: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30',
        green: 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30',
        red: 'bg-red-500/10 text-red-400 border-red-500/30',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="bg-[#111111] border border-white/10 rounded-lg p-6 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-[#FFD700]/20" />

            <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-[#00FF94]' : 'text-red-400'}`}>
                        {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="mt-4">
                <p className="text-gray-500 text-sm uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-white mt-1 font-mono">{displayValue}</p>
            </div>
        </motion.div>
    );
};

export default {
    ApplicationStatusChart,
    WeeklyActivityChart,
    SkillsMatchChart,
    AnimatedStatCard
};
