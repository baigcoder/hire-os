import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../shared/Navbar'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { APPLICATION_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
    FileText, Search, Filter, Clock, CheckCircle, XCircle,
    Eye, User, Briefcase, Building, Calendar, ArrowRight,
    Terminal, Loader2, Users, Star, AlertTriangle
} from 'lucide-react'

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    reviewing: { label: 'Reviewing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Eye },
    interview: { label: 'Interview', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Users },
    shortlisted: { label: 'Shortlisted', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Star },
    pending_ceo_approval: { label: 'CEO Review', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle },
    accepted: { label: 'Accepted', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    hired: { label: 'Hired', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
}

const AdminApplications = () => {
    const navigate = useNavigate()
    const { user } = useSelector(store => store.auth)
    const [applications, setApplications] = useState([])
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selectedJob, setSelectedJob] = useState('all')

    useEffect(() => {
        fetchJobsAndApplications()
    }, [])

    const fetchJobsAndApplications = async () => {
        try {
            setLoading(true)
            // Get all jobs for the company
            const jobsRes = await axios.get(`${JOB_API_END_POINT}/company-jobs`, {
                withCredentials: true
            })

            if (jobsRes.data.success) {
                setJobs(jobsRes.data.jobs || [])

                // Fetch applications for each job
                const allApplications = []
                for (const job of (jobsRes.data.jobs || [])) {
                    try {
                        const appRes = await axios.get(`${APPLICATION_API_END_POINT}/${job._id}/applicants`, {
                            withCredentials: true
                        })
                        if (appRes.data.success && appRes.data.job?.applications) {
                            allApplications.push(...appRes.data.job.applications.map(app => ({
                                ...app,
                                jobTitle: job.title,
                                jobId: job._id,
                                company: job.company
                            })))
                        }
                    } catch (err) {
                        console.log('No applications for job:', job.title)
                    }
                }
                setApplications(allApplications)
            }
        } catch (error) {
            console.error('Error fetching applications:', error)
            toast.error('Failed to load applications')
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (applicationId, status) => {
        try {
            const res = await axios.post(`${APPLICATION_API_END_POINT}/status/${applicationId}/update`,
                { status },
                { withCredentials: true }
            )
            if (res.data.success) {
                toast.success(`Application ${status}`)
                fetchJobsAndApplications()
            }
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const filteredApplications = applications.filter(app => {
        const matchesSearch =
            app.applicant?.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.applicant?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter
        const matchesJob = selectedJob === 'all' || app.jobId === selectedJob
        return matchesSearch && matchesStatus && matchesJob
    })

    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        interviewing: applications.filter(a => ['interview', 'shortlisted'].includes(a.status)).length,
        hired: applications.filter(a => a.status === 'hired' || a.status === 'accepted').length
    }

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
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FFD700] rounded-sm flex items-center justify-center">
                            <FileText className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Applications</h1>
                            <p className="text-gray-500 text-sm font-mono">All candidate applications</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#FFD700]" />
                        <span className="text-xs font-mono text-gray-500">{applications.length} TOTAL</span>
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
                        { label: 'Total', value: stats.total, color: '#FFD700', icon: FileText },
                        { label: 'Pending', value: stats.pending, color: '#FFD700', icon: Clock },
                        { label: 'Interviewing', value: stats.interviewing, color: '#00FF94', icon: Users },
                        { label: 'Hired', value: stats.hired, color: '#00FF94', icon: CheckCircle }
                    ].map((stat, idx) => (
                        <div key={idx} className="relative p-4 bg-[#111111] border border-white/10 rounded-sm">
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#FFD700]/30" />
                            <p className="text-xs font-mono text-gray-500 uppercase mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap gap-4 mb-6"
                >
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search by name, email, or job..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-[#111111] border-white/10 text-white rounded-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-[#111111] border border-white/10 text-white rounded-sm text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="interview">Interview</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                    </select>
                    <select
                        value={selectedJob}
                        onChange={(e) => setSelectedJob(e.target.value)}
                        className="px-4 py-2 bg-[#111111] border border-white/10 text-white rounded-sm text-sm"
                    >
                        <option value="all">All Jobs</option>
                        {jobs.map(job => (
                            <option key={job._id} value={job._id}>{job.title}</option>
                        ))}
                    </select>
                </motion.div>

                {/* Applications List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
                    </div>
                ) : filteredApplications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 bg-[#111111] border border-white/10 rounded-sm"
                    >
                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 font-mono">No applications found</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-3"
                    >
                        {filteredApplications.map((app, idx) => {
                            const config = statusConfig[app.status] || statusConfig.pending
                            const StatusIcon = config.icon
                            return (
                                <motion.div
                                    key={app._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="relative p-4 bg-[#111111] border border-white/10 rounded-sm hover:border-[#FFD700]/30 transition-all group"
                                >
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Avatar */}
                                            <div className="w-12 h-12 rounded-sm bg-[#FFD700] flex items-center justify-center">
                                                <span className="text-black font-bold text-lg">
                                                    {app.applicant?.fullname?.charAt(0) || '?'}
                                                </span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-bold truncate">
                                                    {app.applicant?.fullname || 'Unknown'}
                                                </h3>
                                                <p className="text-gray-500 text-xs font-mono truncate">
                                                    {app.applicant?.email}
                                                </p>
                                            </div>

                                            {/* Job */}
                                            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-sm">
                                                <Briefcase className="w-3 h-3 text-[#FFD700]" />
                                                <span className="text-xs text-gray-400">{app.jobTitle}</span>
                                            </div>

                                            {/* Date */}
                                            <div className="hidden lg:flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-gray-500" />
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {new Date(app.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <Badge className={`${config.color} rounded-sm text-[10px] uppercase`}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {config.label}
                                            </Badge>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {app.status === 'pending' && (
                                                <>
                                                    <Button
                                                        onClick={() => updateStatus(app._id, 'interview')}
                                                        size="sm"
                                                        className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm text-xs"
                                                    >
                                                        Interview
                                                    </Button>
                                                    <Button
                                                        onClick={() => updateStatus(app._id, 'rejected')}
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm text-xs"
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                onClick={() => window.open(app.applicant?.profile?.resume, '_blank')}
                                                size="sm"
                                                variant="outline"
                                                className="border-white/10 text-gray-400 hover:border-[#FFD700]/30 hover:text-[#FFD700] rounded-sm"
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

export default AdminApplications
