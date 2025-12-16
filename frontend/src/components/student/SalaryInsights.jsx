/**
 * SalaryInsights Component
 * AI-powered salary analysis and market comparisons
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign, TrendingUp, BarChart3, Sparkles,
    ArrowUpRight, Target, Briefcase, MapPin, RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { CAREER_INSIGHTS_API_END_POINT } from '@/utils/constant';
import { dashboardCache } from '../../hooks/useDashboardPrefetch';

const SalaryInsights = () => {
    const [insights, setInsights] = useState(null);
    const [userSkills, setUserSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [currency, setCurrency] = useState('PKR');

    useEffect(() => {
        // Check cache first for instant load
        const cached = dashboardCache.get('salary');
        if (cached) {
            setInsights(cached.insights || null);
            setUserSkills(cached.userSkills || []);
            setLoading(false);
        } else {
            fetchSalaryInsights();
        }
    }, []);

    const fetchSalaryInsights = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const res = await axios.get(`${CAREER_INSIGHTS_API_END_POINT}/salary`, { withCredentials: true });
            if (res.data.success) {
                setInsights(res.data.insights || null);
                setUserSkills(res.data.userSkills || []);
                // Set location and currency from response
                setUserLocation(res.data.userLocation || res.data.insights?.userLocation || null);
                setCurrency(res.data.insights?.expectedSalaryRange?.currency || 'PKR');
            }
        } catch (error) {
            console.error('Error fetching salary insights:', error);
            toast.error('Failed to load salary insights');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getCurrencySymbol = (curr) => {
        switch (curr) {
            case 'PKR': return 'Rs.';
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'GBP': return '£';
            default: return curr + ' ';
        }
    };

    const formatSalary = (amount) => {
        if (!amount) return 'N/A';
        const symbol = getCurrencySymbol(currency);
        if (currency === 'PKR') {
            if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)} Cr`;
            if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)} Lac`;
            if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
        } else if (currency === 'INR') {
            if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
            if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
        } else {
            if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
            if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
        }
        return `${symbol}${amount.toLocaleString()}`;
    };

    const getMarketPositionColor = (position) => {
        switch (position?.toLowerCase()) {
            case 'top tier': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'above average': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
            case 'average': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'below average': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-[#FFD700]/20 rounded-full animate-pulse" />
                            <DollarSign className="absolute inset-0 m-auto w-8 h-8 text-[#FFD700] animate-pulse" />
                        </div>
                        <p className="text-gray-400 mt-4 font-mono text-sm">ANALYZING SALARY DATA...</p>
                        <p className="text-gray-600 text-xs mt-2">Comparing with market trends</p>
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
                        <DollarSign className="text-[#FFD700]" /> Salary Insights
                    </h2>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                        AI-powered salary analysis based on your skills
                        {(userLocation || insights?.locationInsight) && (
                            <Badge variant="outline" className="border-[#FFD700]/30 text-[#FFD700] ml-2">
                                <MapPin className="w-3 h-3 mr-1" />
                                {userLocation || 'Your Region'} • {currency}
                            </Badge>
                        )}
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
                    onClick={() => fetchSalaryInsights(true)}
                    disabled={refreshing}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Salary Range */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Expected Salary Range</h3>
                        <Badge className={getMarketPositionColor(insights?.marketPosition)}>
                            {insights?.marketPosition || 'Analyzing...'}
                        </Badge>
                    </div>

                    {/* Salary Visualization */}
                    <div className="relative mb-8">
                        <div className="flex items-end justify-between h-40 gap-4">
                            {/* Min */}
                            <div className="flex flex-col items-center">
                                <div className="w-16 bg-gradient-to-t from-[#FFD700]/20 to-[#FFD700]/60 rounded-t-lg mb-2" style={{ height: '60%' }} />
                                <p className="text-2xl font-bold text-[#FFD700]">
                                    {formatSalary(insights?.expectedSalaryRange?.min)}
                                </p>
                                <p className="text-xs text-gray-500 uppercase">Min</p>
                            </div>

                            {/* Arrow */}
                            <div className="flex-1 flex items-center justify-center pb-12">
                                <ArrowUpRight className="w-8 h-8 text-[#FFD700]/50" />
                            </div>

                            {/* Max */}
                            <div className="flex flex-col items-center">
                                <div className="w-16 bg-gradient-to-t from-emerald-500/20 to-emerald-500/60 rounded-t-lg mb-2" style={{ height: '100%' }} />
                                <p className="text-2xl font-bold text-emerald-400">
                                    {formatSalary(insights?.expectedSalaryRange?.max)}
                                </p>
                                <p className="text-xs text-gray-500 uppercase">Max</p>
                            </div>
                        </div>

                        {/* Growth Potential */}
                        {insights?.growthPotential && (
                            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Growth Potential with Upskilling</p>
                                        <p className="text-lg font-bold text-emerald-400">{insights.growthPotential}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Experience-based Ranges */}
                    {insights?.byExperience && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
                                By Experience Level
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                {insights.byExperience.map((exp, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 bg-white/5 rounded-xl border border-white/5 text-center"
                                    >
                                        <p className="text-xs text-gray-500 mb-1">{exp.years} Years</p>
                                        <p className="text-lg font-bold text-white">{exp.range}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Top Paying Roles */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#111111] border border-white/10 rounded-2xl p-5"
                    >
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4 text-[#FFD700]" /> High-Paying Roles
                        </h4>
                        <div className="space-y-3">
                            {(insights?.topPayingRoles || []).map((role, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                                        <Briefcase className="w-4 h-4 text-[#FFD700]" />
                                    </div>
                                    <span className="text-sm text-gray-300">{role}</span>
                                </div>
                            ))}
                            {(!insights?.topPayingRoles || insights.topPayingRoles.length === 0) && (
                                <p className="text-gray-500 text-sm text-center py-4">
                                    Add skills to see matching roles
                                </p>
                            )}
                        </div>
                    </motion.div>

                    {/* Negotiation Tips */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#111111] border border-white/10 rounded-2xl p-5"
                    >
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-400" /> Negotiation Tips
                        </h4>
                        <div className="space-y-3">
                            {(insights?.negotiationTips || []).map((tip, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10"
                                >
                                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-bold text-cyan-400">{idx + 1}</span>
                                    </div>
                                    <p className="text-sm text-gray-300">{tip}</p>
                                </div>
                            ))}
                            {(!insights?.negotiationTips || insights.negotiationTips.length === 0) && (
                                <p className="text-gray-500 text-sm text-center py-4">
                                    Tips will appear after analysis
                                </p>
                            )}
                        </div>
                    </motion.div>

                    {/* Your Skills */}
                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-5">
                        <h4 className="font-bold text-white mb-3">Based on Your Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {userSkills.length > 0 ? (
                                userSkills.slice(0, 8).map((skill, idx) => (
                                    <Badge
                                        key={idx}
                                        className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20"
                                    >
                                        {skill}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm">Add skills for personalized insights</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalaryInsights;
