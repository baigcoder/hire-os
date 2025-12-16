/**
 * DashboardLoader - Unified Loading Component for All Dashboards
 * HIRE.OS Industrial Theme - Gold accents, dark backgrounds, sharp corners
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Briefcase, GraduationCap, Loader2, Zap } from 'lucide-react';

// Default loader icons by dashboard type
const DASHBOARD_ICONS = {
    admin: Crown,
    recruiter: Briefcase,
    student: GraduationCap,
    default: Zap
};

// Default loading messages by dashboard type
const DASHBOARD_MESSAGES = {
    admin: 'LOADING EXECUTIVE DASHBOARD',
    recruiter: 'LOADING RECRUITER DASHBOARD',
    student: 'LOADING DASHBOARD',
    default: 'LOADING'
};

/**
 * DashboardLoader Component - HIRE.OS Industrial Theme
 * @param {string} type - Dashboard type: 'admin' | 'recruiter' | 'student' | 'default'
 * @param {string} message - Optional custom loading message
 * @param {React.Component} icon - Optional custom icon component
 * @param {string} iconColor - Optional icon color (default: #FFD700)
 * @param {boolean} fullScreen - Whether to take full screen (default: true)
 */
const DashboardLoader = ({
    type = 'default',
    message,
    icon: CustomIcon,
    iconColor = '#FFD700',
    fullScreen = true
}) => {
    const Icon = CustomIcon || DASHBOARD_ICONS[type] || DASHBOARD_ICONS.default;
    const loadingMessage = message || DASHBOARD_MESSAGES[type] || DASHBOARD_MESSAGES.default;

    return (
        <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[400px]'} bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden`}>
            {/* Industrial Grid Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(255,215,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.03) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }} />
            </div>

            {/* Corner Accents */}
            <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-[#FFD700]/20" />
            <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-[#FFD700]/20" />
            <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-[#FFD700]/20" />
            <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-[#FFD700]/20" />

            <div className="text-center relative z-10">
                {/* Main Loader Container */}
                <motion.div
                    className="relative mb-6 inline-block"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    {/* Outer rotating border */}
                    <motion.div
                        className="absolute -inset-3 border border-[#FFD700]/20 rounded-sm"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Middle pulsing border */}
                    <motion.div
                        className="absolute -inset-1.5 border border-[#FFD700]/30 rounded-sm"
                        animate={{
                            borderColor: ['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.4)', 'rgba(255,215,0,0.1)'],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Main box with icon */}
                    <motion.div
                        className="w-20 h-20 bg-[#111111] border-2 border-[#FFD700]/40 rounded-sm flex items-center justify-center relative overflow-hidden"
                        animate={{
                            borderColor: ['rgba(255,215,0,0.3)', 'rgba(255,215,0,0.6)', 'rgba(255,215,0,0.3)'],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {/* Scanning line effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD700]/10 to-transparent"
                            initial={{ y: '-100%' }}
                            animate={{ y: '200%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Icon */}
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.8, 1, 0.8]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Icon className="w-10 h-10" style={{ color: iconColor }} />
                        </motion.div>
                    </motion.div>

                    {/* Corner decorations */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#FFD700]" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#FFD700]" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#FFD700]" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#FFD700]" />
                </motion.div>

                {/* HIRE.OS Badge */}
                <motion.div
                    className="mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-sm text-[#FFD700] text-[10px] font-mono tracking-widest">
                        <Zap className="w-3 h-3" />
                        HIRE.OS
                    </span>
                </motion.div>

                {/* Loading Text */}
                <motion.p
                    className="text-gray-500 font-mono text-sm tracking-[0.3em] uppercase mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {loadingMessage}
                </motion.p>

                {/* Progress Bar */}
                <motion.div
                    className="w-48 h-1 bg-[#1a1a1a] rounded-full overflow-hidden mx-auto border border-white/5"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 192 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                >
                    <motion.div
                        className="h-full bg-gradient-to-r from-transparent via-[#FFD700] to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>

                {/* Loading dots */}
                <motion.div
                    className="flex items-center justify-center gap-1.5 mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-[#FFD700] rounded-full"
                            animate={{
                                opacity: [0.3, 1, 0.3],
                                scale: [0.8, 1, 0.8]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                        />
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

/**
 * ComponentLoader - Smaller loader for individual components/cards
 * @param {string} message - Optional loading message
 * @param {string} iconColor - Optional icon color
 */
export const ComponentLoader = ({
    message = 'Loading...',
    iconColor = '#FFD700',
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
            <motion.div className="relative mb-3">
                {/* Outer ring */}
                <motion.div
                    className="w-12 h-12 border-2 border-[#FFD700]/20 rounded-sm"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />

                {/* Inner spinning element */}
                <motion.div
                    className="absolute inset-1 border border-transparent border-t-[#FFD700] border-r-[#FFD700] rounded-sm"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />

                {/* Center dot */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    <div className="w-2 h-2 bg-[#FFD700] rounded-sm" />
                </motion.div>
            </motion.div>

            <p className="text-gray-500 font-mono text-xs tracking-widest uppercase">
                {message}
            </p>
        </div>
    );
};

/**
 * SkeletonLoader - Skeleton placeholder for content
 */
export const SkeletonLoader = ({
    rows = 3,
    className = ''
}) => {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: rows }).map((_, idx) => (
                <motion.div
                    key={idx}
                    className="h-4 bg-white/5 rounded-sm"
                    style={{ width: `${100 - (idx * 15)}%` }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: idx * 0.1
                    }}
                />
            ))}
        </div>
    );
};

/**
 * CardLoader - Loading placeholder for dashboard cards
 */
export const CardLoader = ({ className = '' }) => {
    return (
        <div className={`bg-[#111111] border border-white/10 rounded-sm p-6 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <motion.div
                    className="w-10 h-10 bg-white/5 rounded-sm"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
                <SkeletonLoader rows={1} className="flex-1" />
            </div>
            <SkeletonLoader rows={3} />
        </div>
    );
};

export default DashboardLoader;
