/**
 * SubscriptionPanel - Reusable subscription status panel for dashboards
 * Hire.iOS Industrial Theme
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Crown, AlertTriangle, Clock, Zap, Users, Briefcase,
    ArrowUpRight, CheckCircle, XCircle, RefreshCw, Shield,
    TrendingUp, Calendar, CreditCard, Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useSubscription } from '@/hooks/useSubscription';

const SubscriptionPanel = ({ compact = false, showUpgrade = true }) => {
    const navigate = useNavigate();
    const {
        subscription,
        loading,
        error,
        hasFeature,
        isLimitReached,
        getUsagePercent,
        getDaysRemaining,
        isExpiringSoon,
        isExpired,
        refresh
    } = useSubscription();

    if (loading) {
        return (
            <div className="bg-[#111111] border border-white/10 rounded-sm p-4 animate-pulse">
                <div className="h-4 w-24 bg-white/10 rounded mb-3"></div>
                <div className="h-8 w-full bg-white/10 rounded"></div>
            </div>
        );
    }

    if (error || !subscription) {
        return (
            <div className="bg-[#111111] border border-red-500/30 rounded-sm p-4">
                <p className="text-red-400 text-sm">Failed to load subscription</p>
                <Button size="sm" onClick={refresh} className="mt-2 text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
            </div>
        );
    }

    const daysRemaining = getDaysRemaining();
    const jobsUsage = getUsagePercent('jobs');
    const recruitersUsage = getUsagePercent('recruiters');
    const planName = subscription.plan?.toUpperCase() || 'BASIC';
    const isActive = subscription.status === 'active';

    // Get status color
    const getStatusColor = () => {
        if (isExpired()) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (isExpiringSoon()) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    };

    // Compact view for Recruiter Dashboard
    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#111111] border ${isExpiringSoon() ? 'border-amber-500/30' : 'border-white/10'} rounded-sm p-4`}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-[#FFD700]" />
                        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Subscription</span>
                    </div>
                    <Badge className={getStatusColor()}>
                        {planName}
                    </Badge>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/5 p-2 rounded-sm">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>Jobs</span>
                            <span>{subscription.usage?.activeJobs || 0}/{subscription.features?.maxJobPostings === -1 ? '∞' : subscription.features?.maxJobPostings}</span>
                        </div>
                        <Progress value={jobsUsage} className="h-1" />
                    </div>
                    <div className="bg-white/5 p-2 rounded-sm">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>Team</span>
                            <span>{subscription.usage?.activeRecruiters || 0}/{subscription.features?.maxRecruiters === -1 ? '∞' : subscription.features?.maxRecruiters}</span>
                        </div>
                        <Progress value={recruitersUsage} className="h-1" />
                    </div>
                </div>

                {/* Days Remaining */}
                {daysRemaining !== null && (
                    <div className={`flex items-center justify-between p-2 rounded-sm ${daysRemaining <= 7 ? 'bg-amber-500/10' : 'bg-white/5'
                        }`}>
                        <span className="text-[10px] text-gray-500">Expires</span>
                        <span className={`text-xs font-mono ${daysRemaining <= 7 ? 'text-amber-400' : 'text-gray-300'}`}>
                            {daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days`}
                        </span>
                    </div>
                )}
            </motion.div>
        );
    }

    // Full view for CEO Dashboard
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111111] border border-white/10 rounded-sm overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#FFD700]/10 rounded-sm border border-[#FFD700]/30">
                        <Crown className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Subscription</h3>
                        <p className="text-gray-500 text-xs font-mono">{subscription.type || 'Monthly'} Plan</p>
                    </div>
                </div>
                <Badge className={`${getStatusColor()} text-xs px-3 py-1`}>
                    {isActive ? planName : 'EXPIRED'}
                </Badge>
            </div>

            {/* Expiry Warning */}
            {isExpiringSoon() && !isExpired() && (
                <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 text-xs">
                        Your subscription expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                    </span>
                </div>
            )}

            {isExpired() && (
                <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-xs">
                        Your subscription has expired. Renew to continue.
                    </span>
                </div>
            )}

            {/* Usage Stats */}
            <div className="p-4 space-y-4">
                {/* Jobs Usage */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-gray-400 font-mono">JOB POSTINGS</span>
                        </div>
                        <span className={`text-sm font-mono ${isLimitReached('jobs') ? 'text-red-400' : 'text-white'}`}>
                            {subscription.usage?.activeJobs || 0} / {subscription.features?.maxJobPostings === -1 ? '∞' : subscription.features?.maxJobPostings}
                        </span>
                    </div>
                    <Progress
                        value={jobsUsage}
                        className={`h-2 ${isLimitReached('jobs') ? '[&>div]:bg-red-500' : ''}`}
                    />
                </div>

                {/* Recruiters Usage */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-gray-400 font-mono">TEAM MEMBERS</span>
                        </div>
                        <span className={`text-sm font-mono ${isLimitReached('recruiters') ? 'text-red-400' : 'text-white'}`}>
                            {subscription.usage?.activeRecruiters || 0} / {subscription.features?.maxRecruiters === -1 ? '∞' : subscription.features?.maxRecruiters}
                        </span>
                    </div>
                    <Progress
                        value={recruitersUsage}
                        className={`h-2 ${isLimitReached('recruiters') ? '[&>div]:bg-red-500' : ''}`}
                    />
                </div>

                {/* Features */}
                <div className="pt-4 border-t border-white/10">
                    <h4 className="text-xs text-gray-500 font-mono mb-3 uppercase tracking-wider">Plan Features</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { name: 'AI Interviews', key: 'aiInterviews', icon: Zap },
                            { name: 'Analytics', key: 'advancedAnalytics', icon: TrendingUp },
                            { name: 'API Access', key: 'apiAccess', icon: Shield },
                            { name: 'Priority Support', key: 'prioritySupport', icon: Star }
                        ].map((feature) => (
                            <div
                                key={feature.key}
                                className={`flex items-center gap-2 p-2 rounded-sm ${hasFeature(feature.key)
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-white/5 text-gray-600'
                                    }`}
                            >
                                <feature.icon className="w-3 h-3" />
                                <span className="text-[10px] font-mono uppercase">{feature.name}</span>
                                {hasFeature(feature.key) ? (
                                    <CheckCircle className="w-3 h-3 ml-auto" />
                                ) : (
                                    <XCircle className="w-3 h-3 ml-auto" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dates */}
                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-sm">
                        <div className="text-[10px] text-gray-500 font-mono mb-1">STARTED</div>
                        <div className="text-sm text-white font-mono">
                            {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : '-'}
                        </div>
                    </div>
                    <div className={`p-3 rounded-sm ${daysRemaining <= 7 ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                        <div className="text-[10px] text-gray-500 font-mono mb-1">EXPIRES</div>
                        <div className={`text-sm font-mono ${daysRemaining <= 7 ? 'text-amber-400' : 'text-white'}`}>
                            {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {showUpgrade && (
                <div className="p-4 border-t border-white/10 flex gap-3">
                    {isExpired() ? (
                        <Button
                            onClick={() => navigate('/company/pricing')}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Renew Now
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={() => navigate('/company/pricing')}
                                className="flex-1 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold"
                            >
                                <ArrowUpRight className="w-4 h-4 mr-2" />
                                Upgrade Plan
                            </Button>
                            <Button
                                onClick={() => navigate('/company/billing')}
                                variant="outline"
                                className="border-white/10 text-gray-400 hover:bg-white/5"
                            >
                                <CreditCard className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default SubscriptionPanel;
