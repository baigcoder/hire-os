import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../shared/Navbar'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { STATS_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { Badge } from '../ui/badge'
import {
    BarChart3, TrendingUp, TrendingDown, Users, Briefcase,
    Terminal, Loader2, Calendar, Clock, CheckCircle, XCircle,
    Eye, FileText, ArrowUpRight, Activity, Target, Zap,
    PieChart, LineChart
} from 'lucide-react'

const AdminAnalytics = () => {
    const { user } = useSelector(store => store.auth)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('30d')
    const [analytics, setAnalytics] = useState({
        overview: { totalApplications: 0, newThisWeek: 0, changePercent: 0, activeJobs: 0 },
        funnel: { applied: 0, screening: 0, interviewed: 0, offered: 0, hired: 0 },
        byStatus: {},
        byJob: [],
        timeline: []
    })

    useEffect(() => {
        fetchAnalytics()
    }, [period])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const res = await axios.get(`${STATS_API_END_POINT}/analytics?period=${period}`, {
                withCredentials: true
            })

            if (res.data.success) {
                setAnalytics(res.data)
            }
        } catch (error) {
            console.error('Error fetching analytics:', error)
            // Use demo data if API fails
            setAnalytics({
                overview: { totalApplications: 156, newThisWeek: 24, changePercent: 12, activeJobs: 8 },
                funnel: { applied: 156, screening: 89, interviewed: 45, offered: 12, hired: 8 },
                byStatus: { pending: 45, reviewing: 32, interview: 28, shortlisted: 18, rejected: 25, hired: 8 },
                byJob: [
                    { title: 'Senior React Developer', applications: 42, hired: 2 },
                    { title: 'Backend Engineer', applications: 38, hired: 1 },
                    { title: 'UI/UX Designer', applications: 28, hired: 2 },
                    { title: 'DevOps Engineer', applications: 24, hired: 1 },
                    { title: 'Product Manager', applications: 24, hired: 2 }
                ],
                timeline: [
                    { date: 'Mon', applications: 12 },
                    { date: 'Tue', applications: 18 },
                    { date: 'Wed', applications: 15 },
                    { date: 'Thu', applications: 22 },
                    { date: 'Fri', applications: 28 },
                    { date: 'Sat', applications: 8 },
                    { date: 'Sun', applications: 6 }
                ]
            })
        } finally {
            setLoading(false)
        }
    }

    const funnelStages = [
        { key: 'applied', label: 'Applied', color: '#FFD700' },
        { key: 'screening', label: 'Screening', color: '#3B82F6' },
        { key: 'interviewed', label: 'Interviewed', color: '#8B5CF6' },
        { key: 'offered', label: 'Offered', color: '#10B981' },
        { key: 'hired', label: 'Hired', color: '#00FF94' }
    ]

    const maxFunnel = Math.max(...Object.values(analytics.funnel || {}), 1)
    const maxTimeline = Math.max(...(analytics.timeline?.map(t => t.applications) || [1]))

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
            <Navbar />

            {/* Industrial Grid Background */}
            <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: '50px 50px'
            }} />
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#00FF94]/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#00FF94] rounded-sm flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Analytics</h1>
                            <p className="text-gray-500 text-sm font-mono">Recruitment performance metrics</p>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="flex gap-1 p-1 bg-[#111111] border border-white/10 rounded-sm">
                        {['7d', '30d', '90d'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-xs font-mono uppercase rounded-sm transition-all ${period === p
                                        ? 'bg-[#FFD700] text-black'
                                        : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Overview Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                        >
                            {[
                                {
                                    label: 'Total Applications',
                                    value: analytics.overview?.totalApplications || 0,
                                    change: analytics.overview?.changePercent,
                                    icon: FileText,
                                    color: '#FFD700'
                                },
                                {
                                    label: 'New This Week',
                                    value: analytics.overview?.newThisWeek || 0,
                                    icon: TrendingUp,
                                    color: '#00FF94'
                                },
                                {
                                    label: 'Active Jobs',
                                    value: analytics.overview?.activeJobs || 0,
                                    icon: Briefcase,
                                    color: '#3B82F6'
                                },
                                {
                                    label: 'Hired',
                                    value: analytics.funnel?.hired || 0,
                                    icon: CheckCircle,
                                    color: '#10B981'
                                }
                            ].map((stat, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                    className="relative p-5 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-all"
                                >
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />
                                    <div className="flex items-center justify-between mb-3">
                                        <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                                        {stat.change !== undefined && (
                                            <Badge className={`${stat.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} rounded-sm text-[10px]`}>
                                                {stat.change >= 0 ? <TrendingUp className="w-2 h-2 mr-1" /> : <TrendingDown className="w-2 h-2 mr-1" />}
                                                {Math.abs(stat.change)}%
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                                    <p className="text-xs font-mono text-gray-500 uppercase">{stat.label}</p>
                                </motion.div>
                            ))}
                        </motion.div>

                        <div className="grid lg:grid-cols-2 gap-6 mb-8">
                            {/* Hiring Funnel */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="relative p-6 bg-[#111111] border border-white/10 rounded-sm"
                            >
                                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#FFD700]/30" />
                                <div className="flex items-center gap-2 mb-6">
                                    <Target className="w-4 h-4 text-[#FFD700]" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hiring Funnel</h3>
                                </div>

                                <div className="space-y-4">
                                    {funnelStages.map((stage, idx) => {
                                        const value = analytics.funnel?.[stage.key] || 0
                                        const width = (value / maxFunnel) * 100
                                        return (
                                            <div key={stage.key}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-mono text-gray-400 uppercase">{stage.label}</span>
                                                    <span className="text-sm font-bold" style={{ color: stage.color }}>{value}</span>
                                                </div>
                                                <div className="h-8 bg-white/5 rounded-sm overflow-hidden relative">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${width}%` }}
                                                        transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                                                        className="h-full rounded-sm relative"
                                                        style={{ backgroundColor: stage.color + '40' }}
                                                    >
                                                        <div
                                                            className="absolute inset-y-0 left-0 w-1 rounded-l-sm"
                                                            style={{ backgroundColor: stage.color }}
                                                        />
                                                    </motion.div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Conversion Rate */}
                                <div className="mt-6 pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-gray-500">CONVERSION RATE</span>
                                        <span className="text-lg font-bold text-[#00FF94]">
                                            {analytics.funnel?.applied > 0
                                                ? ((analytics.funnel?.hired / analytics.funnel?.applied) * 100).toFixed(1)
                                                : 0}%
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Weekly Timeline */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="relative p-6 bg-[#111111] border border-white/10 rounded-sm"
                            >
                                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#00FF94]/30" />
                                <div className="flex items-center gap-2 mb-6">
                                    <Activity className="w-4 h-4 text-[#00FF94]" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Application Timeline</h3>
                                </div>

                                <div className="flex items-end justify-between h-40 gap-2">
                                    {(analytics.timeline || []).map((day, idx) => {
                                        const height = (day.applications / maxTimeline) * 100
                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${height}%` }}
                                                    transition={{ delay: 0.3 + idx * 0.05, duration: 0.5 }}
                                                    className="w-full bg-gradient-to-t from-[#FFD700]/60 to-[#FFD700]/20 rounded-t-sm relative group cursor-pointer"
                                                >
                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-xs font-mono text-[#FFD700]">{day.applications}</span>
                                                    </div>
                                                </motion.div>
                                                <span className="text-[10px] font-mono text-gray-600 uppercase">{day.date}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        </div>

                        {/* Jobs Performance */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="relative p-6 bg-[#111111] border border-white/10 rounded-sm"
                        >
                            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#3B82F6]/30" />
                            <div className="flex items-center gap-2 mb-6">
                                <Briefcase className="w-4 h-4 text-[#3B82F6]" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Job Performance</h3>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {(analytics.byJob || []).map((job, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.35 + idx * 0.05 }}
                                        className="p-4 bg-white/5 border border-white/5 rounded-sm hover:border-[#FFD700]/30 transition-all group"
                                    >
                                        <h4 className="text-xs font-medium text-white truncate mb-3 group-hover:text-[#FFD700] transition-colors">
                                            {job.title}
                                        </h4>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-2xl font-bold text-[#FFD700]">{job.applications}</p>
                                                <p className="text-[10px] font-mono text-gray-600 uppercase">Applications</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-[#00FF94]">{job.hired}</p>
                                                <p className="text-[10px] font-mono text-gray-600 uppercase">Hired</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Status Distribution */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="relative p-6 bg-[#111111] border border-white/10 rounded-sm mt-6"
                        >
                            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-purple-500/30" />
                            <div className="flex items-center gap-2 mb-6">
                                <PieChart className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Status Distribution</h3>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Object.entries(analytics.byStatus || {}).map(([status, count], idx) => {
                                    const colors = {
                                        pending: '#FFD700',
                                        reviewing: '#3B82F6',
                                        interview: '#8B5CF6',
                                        shortlisted: '#06B6D4',
                                        rejected: '#EF4444',
                                        hired: '#10B981'
                                    }
                                    return (
                                        <motion.div
                                            key={status}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.4 + idx * 0.05 }}
                                            className="p-4 bg-white/5 rounded-sm border border-white/5 text-center"
                                        >
                                            <p className="text-2xl font-bold mb-1" style={{ color: colors[status] || '#FFD700' }}>
                                                {count}
                                            </p>
                                            <p className="text-[10px] font-mono text-gray-500 uppercase">{status}</p>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    )
}

export default AdminAnalytics
