import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../shared/Navbar'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { INTERVIEW_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
    Video, Search, Clock, CheckCircle, XCircle, Play,
    Calendar, User, Briefcase, Building, ArrowRight,
    Terminal, Loader2, Users, AlertTriangle, Eye,
    CalendarClock, VideoOff, FileText, MessageSquare
} from 'lucide-react'

const statusConfig = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Calendar },
    mcq_pending: { label: 'MCQ Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: FileText },
    mcq_passed: { label: 'MCQ Passed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    mcq_failed: { label: 'MCQ Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    video_scheduled: { label: 'Video Scheduled', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Video },
    video_in_progress: { label: 'In Progress', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Play },
    video_completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
    completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    no_show: { label: 'No Show', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: VideoOff },
}

const AdminInterviews = () => {
    const navigate = useNavigate()
    const { user } = useSelector(store => store.auth)
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('upcoming')

    useEffect(() => {
        fetchInterviews()
    }, [])

    const fetchInterviews = async () => {
        try {
            setLoading(true)
            const res = await axios.get(`${INTERVIEW_API_END_POINT}/recruiter/my-interviews`, {
                withCredentials: true
            })

            if (res.data.success) {
                setInterviews(res.data.interviews || [])
            }
        } catch (error) {
            console.error('Error fetching interviews:', error)
            toast.error('Failed to load interviews')
        } finally {
            setLoading(false)
        }
    }

    const categorizedInterviews = {
        upcoming: interviews.filter(i =>
            ['scheduled', 'mcq_pending', 'mcq_passed', 'video_scheduled'].includes(i.status) &&
            new Date(i.scheduledAt) > new Date()
        ),
        today: interviews.filter(i => {
            const date = new Date(i.scheduledAt)
            const today = new Date()
            return date.toDateString() === today.toDateString() &&
                ['scheduled', 'mcq_pending', 'mcq_passed', 'video_scheduled', 'video_in_progress'].includes(i.status)
        }),
        completed: interviews.filter(i =>
            ['completed', 'video_completed'].includes(i.status)
        ),
        cancelled: interviews.filter(i =>
            ['cancelled', 'no_show', 'mcq_failed'].includes(i.status)
        )
    }

    const filteredInterviews = (categorizedInterviews[activeTab] || []).filter(interview => {
        const matchesSearch =
            interview.studentId?.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            interview.jobId?.title?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || interview.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const stats = {
        upcoming: categorizedInterviews.upcoming.length,
        today: categorizedInterviews.today.length,
        completed: categorizedInterviews.completed.length,
        total: interviews.length
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatTime = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const isUpcoming = (dateStr) => new Date(dateStr) > new Date()

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
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500 rounded-sm flex items-center justify-center">
                            <Video className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Interviews</h1>
                            <p className="text-gray-500 text-sm font-mono">Manage scheduled interviews</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-mono text-gray-500">{interviews.length} TOTAL</span>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                >
                    {[
                        { label: 'Today', value: stats.today, color: '#FF6B6B', icon: CalendarClock },
                        { label: 'Upcoming', value: stats.upcoming, color: '#FFD700', icon: Calendar },
                        { label: 'Completed', value: stats.completed, color: '#00FF94', icon: CheckCircle },
                        { label: 'Total', value: stats.total, color: '#9B59B6', icon: Users }
                    ].map((stat, idx) => (
                        <div key={idx} className="relative p-4 bg-[#111111] border border-white/10 rounded-sm">
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: `${stat.color}30` }} />
                            <div className="flex items-center gap-2 mb-1">
                                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                                <p className="text-xs font-mono text-gray-500 uppercase">{stat.label}</p>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex gap-1 mb-6 p-1 bg-[#111111] border border-white/10 rounded-sm w-fit"
                >
                    {['today', 'upcoming', 'completed', 'cancelled'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-sm transition-all ${activeTab === tab
                                    ? 'bg-[#FFD700] text-black'
                                    : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {tab} ({categorizedInterviews[tab]?.length || 0})
                        </button>
                    ))}
                </motion.div>

                {/* Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-4 mb-6"
                >
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search by candidate or job..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-[#111111] border-white/10 text-white rounded-sm"
                        />
                    </div>
                </motion.div>

                {/* Interviews List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                ) : filteredInterviews.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 bg-[#111111] border border-white/10 rounded-sm"
                    >
                        <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 font-mono">No {activeTab} interviews</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-3"
                    >
                        {filteredInterviews.map((interview, idx) => {
                            const config = statusConfig[interview.status] || statusConfig.scheduled
                            const StatusIcon = config.icon
                            const upcoming = isUpcoming(interview.scheduledAt)

                            return (
                                <motion.div
                                    key={interview._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="relative p-4 bg-[#111111] border border-white/10 rounded-sm hover:border-purple-500/30 transition-all group"
                                >
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-purple-500/30 transition-colors" />

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Time Block */}
                                            <div className="w-20 text-center p-2 bg-purple-500/10 border border-purple-500/20 rounded-sm">
                                                <p className="text-lg font-bold text-purple-400 font-mono">
                                                    {formatTime(interview.scheduledAt)}
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase">
                                                    {formatDate(interview.scheduledAt)}
                                                </p>
                                            </div>

                                            {/* Candidate Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-[#FFD700]" />
                                                    <h3 className="text-white font-bold truncate">
                                                        {interview.studentId?.fullname || 'Unknown'}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Briefcase className="w-3 h-3 text-gray-500" />
                                                    <p className="text-gray-500 text-xs font-mono truncate">
                                                        {interview.jobId?.title || 'No job'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Type Badge */}
                                            <Badge className="bg-white/5 text-gray-400 border-white/10 rounded-sm text-[10px] uppercase">
                                                {interview.type || 'Video'}
                                            </Badge>

                                            {/* Status */}
                                            <Badge className={`${config.color} rounded-sm text-[10px] uppercase`}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {config.label}
                                            </Badge>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {upcoming && interview.status !== 'cancelled' && (
                                                <Button
                                                    onClick={() => navigate(`/interview/live/${interview._id}`)}
                                                    size="sm"
                                                    className="bg-purple-500 text-white hover:bg-purple-600 rounded-sm text-xs"
                                                >
                                                    <Play className="w-3 h-3 mr-1" />
                                                    Join
                                                </Button>
                                            )}
                                            {interview.status === 'video_completed' && (
                                                <Button
                                                    onClick={() => navigate(`/interview/${interview._id}/report`)}
                                                    size="sm"
                                                    className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm text-xs"
                                                >
                                                    <FileText className="w-3 h-3 mr-1" />
                                                    Report
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => navigate(`/interview/${interview._id}`)}
                                                size="sm"
                                                variant="outline"
                                                className="border-white/10 text-gray-400 hover:border-purple-500/30 hover:text-purple-400 rounded-sm"
                                            >
                                                <Eye className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    )
}

export default AdminInterviews
