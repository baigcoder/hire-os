import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    User, Mail, Phone, FileText, Image, Briefcase,
    GraduationCap, Award, ChevronRight, AlertCircle, CheckCircle2, Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';

const ProfileCompletionCard = () => {
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    const completionData = useMemo(() => {
        if (!user) return { percentage: 0, completed: [], missing: [], checks: [] };

        const checks = [
            { id: 'name', label: 'FULL NAME', icon: User, complete: !!user.fullname },
            { id: 'email', label: 'EMAIL', icon: Mail, complete: !!user.email },
            { id: 'phone', label: 'PHONE', icon: Phone, complete: !!user.phoneNumber },
            { id: 'photo', label: 'PHOTO', icon: Image, complete: !!user.profile?.profilePhoto },
            { id: 'bio', label: 'BIO', icon: FileText, complete: user.profile?.bio?.length > 20 },
            { id: 'skills', label: 'SKILLS 5+', icon: Award, complete: (user.profile?.skills?.length || 0) >= 5 },
            { id: 'resume', label: 'RESUME', icon: FileText, complete: !!user.profile?.resume },
            { id: 'experience', label: 'EXPERIENCE', icon: Briefcase, complete: (user.profile?.experience?.length || 0) > 0 },
            { id: 'education', label: 'EDUCATION', icon: GraduationCap, complete: (user.profile?.education?.length || 0) > 0 },
        ];

        const completed = checks.filter(c => c.complete);
        const missing = checks.filter(c => !c.complete);
        const percentage = Math.round((completed.length / checks.length) * 100);

        return { percentage, completed, missing, checks };
    }, [user]);

    const getProgressStyle = (percentage) => {
        if (percentage >= 80) return { color: 'emerald', gradient: 'from-emerald-500 to-green-400' };
        if (percentage >= 60) return { color: '[#FFD700]', gradient: 'from-[#FFD700] to-amber-400' };
        if (percentage >= 40) return { color: 'blue', gradient: 'from-blue-500 to-cyan-400' };
        return { color: 'red', gradient: 'from-red-500 to-orange-400' };
    };

    const getMessage = (percentage) => {
        if (percentage >= 100) return { text: 'PROFILE COMPLETE — MAXIMUM VISIBILITY ACHIEVED', type: 'success' };
        if (percentage >= 80) return { text: 'ALMOST THERE — COMPLETE REMAINING ITEMS', type: 'info' };
        if (percentage >= 60) return { text: 'GOOD PROGRESS — ADD MORE DETAILS', type: 'warning' };
        return { text: 'COMPLETE PROFILE TO START MATCHING', type: 'error' };
    };

    const style = getProgressStyle(completionData.percentage);
    const message = getMessage(completionData.percentage);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
                        <Sparkles className="w-4 h-4 text-[#FFD700]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">PROFILE COMPLETION</h3>
                        <p className="text-[10px] text-gray-500 font-mono tracking-wider">COMPLETE PROFILES GET 40% MORE VIEWS</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-3xl font-bold font-mono text-${style.color}-400`}>
                        {completionData.percentage}%
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-5">
                <div className="h-2 bg-white/5 rounded-sm overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completionData.percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full bg-gradient-to-r ${style.gradient} rounded-sm`}
                    />
                </div>
                {/* Markers */}
                <div className="absolute top-0 left-0 w-full h-full flex pointer-events-none">
                    {[25, 50, 75].map(mark => (
                        <div
                            key={mark}
                            className="absolute w-px h-2 bg-white/20"
                            style={{ left: `${mark}%` }}
                        />
                    ))}
                </div>
            </div>

            {/* Message */}
            <div className={`flex items-center gap-2 p-3 rounded-sm mb-5 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                    message.type === 'info' ? 'bg-blue-500/10 border border-blue-500/30' :
                        message.type === 'warning' ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' :
                            'bg-red-500/10 border border-red-500/30'
                }`}>
                {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                    <AlertCircle className={`w-4 h-4 flex-shrink-0 ${message.type === 'info' ? 'text-blue-400' :
                            message.type === 'warning' ? 'text-[#FFD700]' : 'text-red-400'
                        }`} />
                )}
                <span className={`text-[10px] font-mono tracking-wider ${message.type === 'success' ? 'text-emerald-400' :
                        message.type === 'info' ? 'text-blue-400' :
                            message.type === 'warning' ? 'text-[#FFD700]' : 'text-red-400'
                    }`}>{message.text}</span>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
                {completionData.checks?.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.id}
                            className={`flex items-center gap-2 p-2.5 rounded-sm text-[10px] font-mono transition-all ${item.complete
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-white/5 text-gray-500 border border-white/10'
                                }`}
                        >
                            {item.complete ? (
                                <CheckCircle2 className="w-3 h-3" />
                            ) : (
                                <Icon className="w-3 h-3" />
                            )}
                            <span className={item.complete ? 'line-through opacity-60' : ''}>
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* CTA */}
            {completionData.percentage < 100 && (
                <Button
                    onClick={() => navigate('/profile')}
                    className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-mono text-xs tracking-wider"
                >
                    COMPLETE YOUR PROFILE
                    <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            )}
        </motion.div>
    );
};

export default ProfileCompletionCard;
