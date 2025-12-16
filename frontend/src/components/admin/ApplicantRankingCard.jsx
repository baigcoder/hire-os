import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Star, User, Mail, Phone, FileText, Award,
    ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
    Zap, Target, GraduationCap, Briefcase, Brain, Check, X,
    Loader2, Filter, ArrowUpDown, Sparkles, Eye
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const ApplicantRankingCard = ({ jobId, jobTitle }) => {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [recommendations, setRecommendations] = useState({});
    const [filterBy, setFilterBy] = useState('all');

    useEffect(() => {
        if (jobId) fetchRankedApplicants();
    }, [jobId]);

    const fetchRankedApplicants = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/application/${jobId}/ranked-applicants`, {
                withCredentials: true
            });
            if (res.data.success) {
                setApplicants(res.data.data.applicants || []);
                setRecommendations(res.data.data.recommendations || {});
            }
        } catch (error) {
            console.error('Failed to fetch ranked applicants:', error);
            toast.error('Failed to load applicant rankings');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAction = async (action) => {
        try {
            const res = await axios.post(`${API_BASE}/application/bulk-update`, {
                jobId, action, threshold: action === 'reject' ? 50 : 70
            }, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchRankedApplicants();
            }
        } catch (error) {
            toast.error('Failed to perform bulk action');
        }
    };

    const renderStars = (count) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i <= count ? 'text-[#FFD700] fill-[#FFD700]' : 'text-gray-700'}`}
                />
            ))}
        </div>
    );

    const getScoreStyle = (score) => {
        if (score >= 85) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' };
        if (score >= 70) return { text: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/30', glow: 'shadow-[#FFD700]/20' };
        if (score >= 55) return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' };
        return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-red-500/20' };
    };

    const filteredApplicants = applicants.filter(app => {
        if (filterBy === 'all') return true;
        const score = app.score?.totalScore || 0;
        if (filterBy === 'excellent') return score >= 85;
        if (filterBy === 'strong') return score >= 70 && score < 85;
        if (filterBy === 'good') return score >= 55 && score < 70;
        if (filterBy === 'low') return score < 55;
        return true;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-[#FFD700]/20 rounded-full animate-pulse" />
                    <Brain className="absolute inset-0 m-auto w-6 h-6 text-[#FFD700] animate-pulse" />
                </div>
                <p className="text-gray-400 mt-4 font-mono text-sm tracking-wider">ANALYZING CANDIDATES...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats Grid */}
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: 'TOTAL', value: applicants.length, color: 'white', bg: 'bg-white/5' },
                    { label: 'FAST TRACK', value: recommendations.fastTrack || 0, color: 'emerald', bg: 'bg-emerald-500/10' },
                    { label: 'INTERVIEW', value: recommendations.interview || 0, color: '[#FFD700]', bg: 'bg-[#FFD700]/10' },
                    { label: 'REVIEW', value: recommendations.review || 0, color: 'blue', bg: 'bg-blue-500/10' },
                    { label: 'REJECT', value: recommendations.reject || 0, color: 'red', bg: 'bg-red-500/10' }
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`${stat.bg} border border-${stat.color === 'white' ? 'white/10' : stat.color + '-500/30'} rounded-sm p-4 text-center`}
                    >
                        <div className={`text-2xl font-bold text-${stat.color === 'white' ? 'white' : stat.color + '-400'}`}>
                            {stat.value}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono tracking-wider mt-1">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-white/10 rounded-sm">
                <div className="flex gap-2">
                    {['all', 'excellent', 'strong', 'good', 'low'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterBy(f)}
                            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all ${filterBy === f
                                    ? 'bg-[#FFD700] text-black'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() => handleBulkAction('interview')}
                        size="sm"
                        className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-mono text-xs"
                    >
                        <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                        INTERVIEW TOP {recommendations.fastTrack || 0}
                    </Button>
                    <Button
                        onClick={() => handleBulkAction('reject')}
                        size="sm"
                        className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-mono text-xs"
                    >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        REJECT BELOW 50%
                    </Button>
                </div>
            </div>

            {/* Applicant List */}
            <div className="space-y-3">
                {filteredApplicants.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="font-mono text-sm">NO CANDIDATES MATCH FILTER</p>
                    </div>
                ) : (
                    filteredApplicants.map((app, index) => {
                        const style = getScoreStyle(app.score?.totalScore || 0);
                        const isExpanded = expandedId === app.applicationId;

                        return (
                            <motion.div
                                key={app.applicationId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={`bg-[#0a0a0a] border rounded-sm overflow-hidden transition-all ${isExpanded ? `${style.border} shadow-lg ${style.glow}` : 'border-white/10'
                                    }`}
                            >
                                {/* Main Row */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : app.applicationId)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Rank */}
                                            <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-bold font-mono ${style.bg} ${style.text} border ${style.border}`}>
                                                #{app.rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-12 h-12 rounded-sm bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                                {app.applicant?.profilePhoto ? (
                                                    <img src={app.applicant.profilePhoto} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-gray-500" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-semibold text-white">{app.applicant?.fullname}</h4>
                                                    {renderStars(app.score?.stars || 3)}
                                                </div>
                                                <p className="text-sm text-gray-500 font-mono">{app.applicant?.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            {/* Score */}
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold font-mono ${style.text}`}>
                                                    {app.score?.totalScore || 0}%
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono">ATS SCORE</div>
                                            </div>

                                            {/* Rating Label */}
                                            <Badge className={`${style.bg} ${style.text} ${style.border} border font-mono text-[10px] px-2`}>
                                                {app.score?.rating || 'PENDING'}
                                            </Badge>

                                            {/* Expand Icon */}
                                            <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                <ChevronDown className="w-5 h-5 text-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-white/10"
                                        >
                                            <div className="p-5 grid grid-cols-2 gap-6">
                                                {/* Left: Score Breakdown */}
                                                <div className="space-y-4">
                                                    <h5 className="text-xs text-gray-500 font-mono tracking-wider">SCORE BREAKDOWN</h5>

                                                    {app.score?.breakdown && Object.entries(app.score.breakdown).map(([key, data]) => (
                                                        <div key={key} className="space-y-1">
                                                            <div className="flex justify-between text-sm font-mono">
                                                                <span className="text-gray-400 uppercase text-xs">{key}</span>
                                                                <span className="text-white">{data.points || data}/40</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${((data.points || data) / 40) * 100}%` }}
                                                                    className="h-full bg-[#FFD700]"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Right: Skills & AI Insight */}
                                                <div className="space-y-4">
                                                    <h5 className="text-xs text-gray-500 font-mono tracking-wider">SKILLS MATCH</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(app.score?.matchedSkills || []).slice(0, 5).map((skill, i) => (
                                                            <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border font-mono text-[10px]">
                                                                <Check className="w-2.5 h-2.5 mr-1" />
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                        {(app.score?.missingSkills || []).slice(0, 3).map((skill, i) => (
                                                            <Badge key={`m-${i}`} className="bg-red-500/10 text-red-400 border-red-500/20 border font-mono text-[10px]">
                                                                <X className="w-2.5 h-2.5 mr-1" />
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    {/* AI Insight */}
                                                    {app.score?.aiInsight && (
                                                        <div className="p-3 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-sm">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                                                                <span className="text-[10px] text-[#FFD700] font-mono tracking-wider">AI INSIGHT</span>
                                                            </div>
                                                            <p className="text-sm text-gray-300">{app.score.aiInsight}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                                                <Button size="sm" variant="outline" className="border-white/10 text-gray-400 font-mono text-xs">
                                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                    VIEW RESUME
                                                </Button>
                                                <Button size="sm" className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-mono text-xs">
                                                    SCHEDULE INTERVIEW
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ApplicantRankingCard;
