import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Gift, X, Sparkles, CheckCircle, Clock,
    FileText, Brain, Video, Target, Rocket
} from 'lucide-react';
import { Button } from '../ui/button';

const TrialWelcomeModal = ({
    isOpen,
    onClose,
    userName,
    trialEndDate
}) => {
    const navigate = useNavigate();
    const [daysRemaining, setDaysRemaining] = useState(30);

    useEffect(() => {
        if (trialEndDate) {
            const end = new Date(trialEndDate);
            const now = new Date();
            const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
            setDaysRemaining(Math.max(0, diff));
        }
    }, [trialEndDate]);

    const formattedEndDate = trialEndDate
        ? new Date(trialEndDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : '';

    const features = [
        { icon: FileText, title: 'AI Resume Analyzer', desc: 'Get professional feedback' },
        { icon: Brain, title: 'Mock MCQ Tests', desc: 'Gemini AI-powered practice' },
        { icon: Video, title: 'Mock Interviews', desc: 'AI-driven preparation' },
        { icon: Target, title: 'Job Matching', desc: 'Smart recommendations' }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="relative w-full max-w-lg bg-[#0A0A0A] border border-[#FFD700]/30 rounded-lg overflow-hidden shadow-[0_0_100px_rgba(255,215,0,0.15)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>

                        {/* Gold Glow Effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-[100px] -translate-y-1/2" />

                        {/* Content */}
                        <div className="relative p-8 text-center">
                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring' }}
                                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.4)]"
                            >
                                <Gift className="w-10 h-10 text-black" />
                            </motion.div>

                            {/* Title */}
                            <h2 className="text-2xl md:text-3xl font-black text-white mb-2 font-['Space_Grotesk',sans-serif]">
                                Welcome to <span className="text-[#FFD700]">HIRE.OS</span>
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Hello <span className="text-white font-semibold">{userName || 'there'}</span>! 👋
                            </p>

                            {/* Trial Badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-full mb-6"
                            >
                                <Sparkles className="w-4 h-4 text-[#00FF94]" />
                                <span className="text-[#00FF94] font-bold text-sm">30-DAY FREE TRIAL ACTIVATED</span>
                            </motion.div>

                            {/* Days Counter */}
                            <div className="bg-[#111111] border border-white/10 rounded-lg p-4 mb-6">
                                <div className="flex items-center justify-center gap-4">
                                    <Clock className="w-5 h-5 text-[#FFD700]" />
                                    <div className="text-left">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Trial Expires</p>
                                        <p className="text-white font-bold">{formattedEndDate}</p>
                                    </div>
                                    <div className="h-10 w-px bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-[#FFD700] font-mono">{daysRemaining}</p>
                                        <p className="text-xs text-gray-500">days left</p>
                                    </div>
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {features.map((feature, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + idx * 0.1 }}
                                        className="flex items-center gap-2 p-3 bg-white/5 rounded-lg"
                                    >
                                        <div className="w-8 h-8 rounded-md bg-[#FFD700]/10 flex items-center justify-center">
                                            <feature.icon className="w-4 h-4 text-[#FFD700]" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-white">{feature.title}</p>
                                            <p className="text-[10px] text-gray-500">{feature.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <Button
                                onClick={() => {
                                    onClose();
                                    navigate('/profile?tab=subscription');
                                }}
                                className="w-full py-6 text-base font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-lg uppercase tracking-wider"
                            >
                                <Rocket className="w-5 h-5 mr-2" />
                                Start Exploring
                            </Button>

                            <p className="text-xs text-gray-600 mt-4">
                                Full access to all features during your trial period
                            </p>
                        </div>

                        {/* Bottom Accent */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TrialWelcomeModal;
