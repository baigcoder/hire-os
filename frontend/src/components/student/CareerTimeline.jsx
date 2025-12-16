/**
 * CareerTimeline Component
 * Visual timeline of career milestones and achievements
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    GraduationCap, Briefcase, Award, Rocket, Star,
    Calendar, MapPin, Plus, Trophy, Target
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { CAREER_INSIGHTS_API_END_POINT } from '@/utils/constant';

const CareerTimeline = () => {
    const [timeline, setTimeline] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTimeline();
    }, []);

    const fetchTimeline = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${CAREER_INSIGHTS_API_END_POINT}/timeline`, { withCredentials: true });
            if (res.data.success) {
                setTimeline(res.data.timeline || []);
                setStats(res.data.stats || null);
            }
        } catch (error) {
            console.error('Error fetching timeline:', error);
            toast.error('Failed to load career timeline');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'education': return GraduationCap;
            case 'experience': return Briefcase;
            case 'achievement': return Trophy;
            case 'milestone': return Rocket;
            case 'certification': return Award;
            default: return Star;
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'education': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
            case 'experience': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'achievement': return 'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/20';
            case 'milestone': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'certification': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Present';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 border-4 border-[#FFD700]/20 rounded-full animate-spin border-t-[#FFD700]" />
                        <p className="text-gray-400 mt-4">Loading your career journey...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Rocket className="text-[#FFD700]" /> Career Timeline
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Your professional journey at a glance
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Stats Cards */}
                <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">
                    {[
                        { label: 'Education', value: stats?.educationCount || 0, icon: GraduationCap, color: 'cyan' },
                        { label: 'Experience', value: stats?.experienceCount || 0, icon: Briefcase, color: 'emerald' },
                        { label: 'Skills', value: stats?.skillCount || 0, icon: Target, color: 'yellow' },
                        { label: 'Milestones', value: stats?.totalMilestones || 0, icon: Trophy, color: 'purple' }
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-[#111111] border border-white/10 rounded-xl p-4 hover:border-[#FFD700]/30 transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center mb-3`}>
                                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                            </div>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Timeline */}
                <div className="lg:col-span-3">
                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
                        {timeline.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16"
                            >
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Rocket className="w-10 h-10 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-medium text-white mb-2">Start Your Journey</h3>
                                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                    Add your education and experience to build your career timeline
                                </p>
                                <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                                    <Plus className="w-4 h-4 mr-2" /> Add to Profile
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="relative">
                                {/* Timeline Line */}
                                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#FFD700] via-cyan-500 to-emerald-500" />

                                {/* Timeline Items */}
                                <div className="space-y-8">
                                    {timeline.map((item, idx) => {
                                        const Icon = getIcon(item.type);
                                        const iconColorClass = getIconColor(item.type);

                                        return (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="relative flex gap-6 group"
                                            >
                                                {/* Icon */}
                                                <div className={`relative z-10 w-16 h-16 rounded-xl ${iconColorClass} border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 bg-white/5 rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-white group-hover:text-[#FFD700] transition-colors">
                                                                {item.title}
                                                            </h3>
                                                            {item.subtitle && (
                                                                <p className="text-sm text-gray-400">{item.subtitle}</p>
                                                            )}
                                                        </div>
                                                        <Badge className={`${iconColorClass} text-xs`}>
                                                            {item.type}
                                                        </Badge>
                                                    </div>

                                                    {item.description && (
                                                        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
                                                    )}

                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(item.date)}
                                                            {item.endDate && ` - ${formatDate(item.endDate)}`}
                                                            {item.isCurrent && (
                                                                <Badge className="ml-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                                                    CURRENT
                                                                </Badge>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Start Point */}
                                <div className="flex items-center gap-4 mt-8 pl-4">
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center">
                                        <Star className="w-4 h-4 text-black" />
                                    </div>
                                    <p className="text-sm text-gray-500">The beginning of your journey</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CareerTimeline;
