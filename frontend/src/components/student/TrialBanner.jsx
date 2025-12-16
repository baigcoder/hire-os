/**
 * TrialBanner - Displays trial status and countdown for students
 * Shows in dashboard with days remaining and upgrade CTA
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, Sparkles, Crown, AlertTriangle, X, Zap } from 'lucide-react';
import axios from 'axios';
import { TRIAL_API_END_POINT } from '@/utils/constant';

const TrialBanner = () => {
    const navigate = useNavigate();
    const [trialStatus, setTrialStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        fetchTrialStatus();
    }, []);

    const fetchTrialStatus = async () => {
        try {
            const res = await axios.get(`${TRIAL_API_END_POINT}/status`, {
                withCredentials: true
            });
            if (res.data.success) {
                setTrialStatus(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch trial status:', error);
        } finally {
            setLoading(false);
        }
    };

    // Don't show for non-trial users or if dismissed
    if (loading || dismissed || !trialStatus?.isTrial) {
        return null;
    }

    const { daysRemaining, isWarning, trialEndDate } = trialStatus;
    const isUrgent = daysRemaining <= 3;
    const endDateFormatted = new Date(trialEndDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`relative overflow-hidden rounded-lg border p-4 mb-6 ${isUrgent
                        ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30'
                        : isWarning
                            ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30'
                            : 'bg-gradient-to-r from-[#FFD700]/10 to-emerald-500/10 border-[#FFD700]/30'
                    }`}
            >
                {/* Background Animation */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        animate={{
                            x: ['-100%', '100%'],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'linear'
                        }}
                        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    />
                </div>

                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Left: Trial Info */}
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${isUrgent
                                ? 'bg-red-500/20 text-red-400'
                                : isWarning
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-[#FFD700]/20 text-[#FFD700]'
                            }`}>
                            {isUrgent ? (
                                <AlertTriangle className="w-6 h-6 animate-pulse" />
                            ) : (
                                <Sparkles className="w-6 h-6" />
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-white font-bold text-lg">
                                    {isUrgent
                                        ? '⚠️ Trial Ending Soon!'
                                        : isWarning
                                            ? 'Your Trial is Ending'
                                            : '🎉 Free Trial Active'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${isUrgent
                                        ? 'bg-red-500/30 text-red-300'
                                        : isWarning
                                            ? 'bg-amber-500/30 text-amber-300'
                                            : 'bg-[#FFD700]/30 text-[#FFD700]'
                                    }`}>
                                    PRO ACCESS
                                </span>
                            </div>

                            <p className="text-gray-400 text-sm">
                                {daysRemaining > 0 ? (
                                    <>
                                        <span className={`font-bold ${isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-[#FFD700]'
                                            }`}>
                                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                                        </span>
                                        {' '}remaining • Ends {endDateFormatted}
                                    </>
                                ) : (
                                    'Your trial ends today!'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Right: CTA Buttons */}
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/pricing')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FFD700] text-black font-bold rounded-lg hover:bg-[#FFE44D] transition-colors"
                        >
                            <Crown className="w-4 h-4" />
                            Upgrade Now
                        </motion.button>

                        <button
                            onClick={() => setDismissed(true)}
                            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                            title="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 relative">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, ((30 - daysRemaining) / 30) * 100)}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={`h-full rounded-full ${isUrgent
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                    : isWarning
                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                        : 'bg-gradient-to-r from-[#FFD700] to-emerald-500'
                                }`}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>Day 1</span>
                        <span>Day 30</span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TrialBanner;
