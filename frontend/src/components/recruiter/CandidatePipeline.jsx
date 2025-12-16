/**
 * CandidatePipeline.jsx
 * Kanban-style candidate pipeline for recruiters
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import {
    User, Mail, Phone, FileText, Calendar, MessageSquare,
    ChevronRight, MoreVertical, Star, Flag, Eye, X,
    Filter, Search, RefreshCw, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '../ui/dropdown-menu';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import { APPLICATION_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant';

// Pipeline stages configuration
const PIPELINE_STAGES = [
    { id: 'pending', label: 'Applied', color: '#FFD700', bgColor: '#FFD700/10' },
    { id: 'under_review', label: 'Reviewing', color: '#F59E0B', bgColor: '#F59E0B/10' },
    { id: 'shortlisted', label: 'Shortlisted', color: '#3B82F6', bgColor: '#3B82F6/10' },
    { id: 'interview', label: 'Interview', color: '#8B5CF6', bgColor: '#8B5CF6/10' },
    { id: 'offer_pending', label: 'Offer Stage', color: '#10B981', bgColor: '#10B981/10' },
    { id: 'hired', label: 'Hired', color: '#00FF94', bgColor: '#00FF94/10' }
];

// Candidate Card Component
const CandidateCard = ({ application, onStatusChange, onSelect }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative p-4 bg-[#0A0A0A] border border-white/10 rounded-sm hover:border-[#FFD700]/30 transition-all cursor-pointer group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(application)}
        >
            {/* Priority indicator */}
            {application.priority === 'high' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-sm" />
            )}
            {application.priority === 'urgent' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700] rounded-l-sm animate-pulse" />
            )}

            <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 rounded-sm">
                    <AvatarImage src={application.applicant?.profile?.profilePhoto} />
                    <AvatarFallback className="rounded-sm bg-[#FFD700]/10 text-[#FFD700] font-bold">
                        {application.applicant?.fullname?.[0] || 'U'}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white truncate">
                            {application.applicant?.fullname || 'Unknown'}
                        </h4>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="w-3 h-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#111111] border-white/10">
                                <DropdownMenuItem className="text-gray-300">
                                    <Eye className="w-4 h-4 mr-2" /> View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-300">
                                    <Mail className="w-4 h-4 mr-2" /> Send Email
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-gray-300">
                                    <Calendar className="w-4 h-4 mr-2" /> Schedule Interview
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem className="text-gray-300">
                                    <Star className="w-4 h-4 mr-2" /> Mark as Starred
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-400">
                                    <X className="w-4 h-4 mr-2" /> Reject
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        {application.applicant?.email}
                    </p>

                    {/* Tags */}
                    {application.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {application.tags.slice(0, 2).map((tag, idx) => (
                                <Badge
                                    key={idx}
                                    className="text-[10px] bg-white/5 text-gray-400 rounded-sm px-1.5 py-0"
                                >
                                    {tag}
                                </Badge>
                            ))}
                            {application.tags.length > 2 && (
                                <Badge className="text-[10px] bg-white/5 text-gray-400 rounded-sm px-1.5 py-0">
                                    +{application.tags.length - 2}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Score & Date */}
                    <div className="flex items-center justify-between mt-3">
                        {application.resumeScore && (
                            <div className="flex items-center gap-1">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                        backgroundColor: application.resumeScore >= 80 ? '#00FF94' :
                                            application.resumeScore >= 60 ? '#FFD700' : '#F59E0B'
                                    }}
                                />
                                <span className="text-xs font-mono text-gray-400">
                                    {application.resumeScore}%
                                </span>
                            </div>
                        )}
                        <span className="text-[10px] text-gray-600 font-mono">
                            {new Date(application.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Flags */}
            <div className="absolute top-2 right-2 flex gap-1">
                {application.isStarred && <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />}
                {application.isFlagged && <Flag className="w-3 h-3 text-red-400 fill-red-400" />}
            </div>
        </motion.div>
    );
};

// Pipeline Column Component
const PipelineColumn = ({ stage, applications, onStatusChange, onSelect, onDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const applicationId = e.dataTransfer.getData('applicationId');
        if (applicationId) {
            onDrop(applicationId, stage.id);
        }
    };

    return (
        <div
            className={`flex-shrink-0 w-80 bg-[#111111] border rounded-sm transition-colors ${isDragOver ? 'border-[#FFD700]/50 bg-[#FFD700]/5' : 'border-white/10'
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Column Header */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                        />
                        <h3 className="text-sm font-bold text-white">{stage.label}</h3>
                    </div>
                    <Badge
                        className="text-xs font-mono rounded-sm"
                        style={{
                            backgroundColor: `${stage.color}15`,
                            color: stage.color
                        }}
                    >
                        {applications.length}
                    </Badge>
                </div>
            </div>

            {/* Cards Container */}
            <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                <AnimatePresence>
                    {applications.map((application) => (
                        <div
                            key={application._id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('applicationId', application._id);
                            }}
                        >
                            <CandidateCard
                                application={application}
                                onStatusChange={onStatusChange}
                                onSelect={onSelect}
                            />
                        </div>
                    ))}
                </AnimatePresence>

                {applications.length === 0 && (
                    <div className="text-center py-8 text-gray-600">
                        <p className="text-sm">No candidates</p>
                        <p className="text-xs mt-1">Drag candidates here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const CandidatePipeline = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [appsRes, jobsRes] = await Promise.all([
                axios.get(`${APPLICATION_API_END_POINT}/company`, { withCredentials: true }),
                axios.get(`${JOB_API_END_POINT}/admin`, { withCredentials: true })
            ]);

            if (appsRes.data.success) {
                setApplications(appsRes.data.applications || []);
            }
            if (jobsRes.data.success) {
                setJobs(jobsRes.data.jobs || []);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (applicationId, newStatus) => {
        try {
            const response = await axios.put(
                `${APPLICATION_API_END_POINT}/${applicationId}/status`,
                { status: newStatus },
                { withCredentials: true }
            );

            if (response.data.success) {
                setApplications(prev =>
                    prev.map(app =>
                        app._id === applicationId ? { ...app, status: newStatus } : app
                    )
                );
                toast.success('Status updated');
            }
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('Failed to update status');
        }
    };

    const getFilteredApplications = useCallback(() => {
        return applications.filter(app => {
            // Job filter
            if (selectedJob !== 'all' && app.job?._id !== selectedJob) return false;

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const name = app.applicant?.fullname?.toLowerCase() || '';
                const email = app.applicant?.email?.toLowerCase() || '';
                if (!name.includes(query) && !email.includes(query)) return false;
            }

            return true;
        });
    }, [applications, selectedJob, searchQuery]);

    const getApplicationsByStage = (stageId) => {
        const filtered = getFilteredApplications();
        return filtered.filter(app => {
            // Map various statuses to pipeline stages
            switch (stageId) {
                case 'pending':
                    return app.status === 'pending';
                case 'under_review':
                    return ['under_review', 'reviewing'].includes(app.status);
                case 'shortlisted':
                    return app.status === 'shortlisted';
                case 'interview':
                    return ['interview', 'mcq_pending', 'mcq_passed', 'video_scheduled', 'video_completed'].includes(app.status);
                case 'offer_pending':
                    return ['offer_pending', 'offer_sent', 'pending_ceo_approval'].includes(app.status);
                case 'hired':
                    return ['hired', 'offer_accepted'].includes(app.status);
                default:
                    return false;
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-2 border-[#FFD700]/30 rounded-sm" />
                        <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] rounded-sm animate-spin" />
                    </div>
                    <p className="text-[#FFD700]/70 font-mono text-sm uppercase tracking-wider">Loading Pipeline...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Candidate Pipeline</h1>
                            <p className="text-gray-500 text-sm mt-1">
                                Drag and drop candidates between stages
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="border-white/10 text-gray-400"
                                onClick={fetchData}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                className="border-white/10 text-gray-400"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-[#111111] border border-white/10 rounded-sm"
                >
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search candidates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-[#0A0A0A] border-white/10 text-white"
                        />
                    </div>

                    <Select value={selectedJob} onValueChange={setSelectedJob}>
                        <SelectTrigger className="w-[200px] bg-[#0A0A0A] border-white/10 text-white">
                            <SelectValue placeholder="All Jobs" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10">
                            <SelectItem value="all" className="text-gray-300">All Jobs</SelectItem>
                            {jobs.map(job => (
                                <SelectItem key={job._id} value={job._id} className="text-gray-300">
                                    {job.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Badge className="bg-[#FFD700]/10 text-[#FFD700] font-mono">
                        {getFilteredApplications().length} candidates
                    </Badge>
                </motion.div>

                {/* Pipeline Board */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-4 overflow-x-auto pb-4"
                >
                    {PIPELINE_STAGES.map((stage) => (
                        <PipelineColumn
                            key={stage.id}
                            stage={stage}
                            applications={getApplicationsByStage(stage.id)}
                            onStatusChange={handleStatusChange}
                            onSelect={setSelectedApplication}
                            onDrop={handleStatusChange}
                        />
                    ))}
                </motion.div>
            </div>

            {/* Candidate Detail Drawer */}
            <AnimatePresence>
                {selectedApplication && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={() => setSelectedApplication(null)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="absolute right-0 top-0 h-full w-full max-w-md bg-[#111111] border-l border-white/10 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-white">Candidate Details</h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedApplication(null)}
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Candidate Info */}
                                <div className="flex items-center gap-4 mb-6">
                                    <Avatar className="w-16 h-16 rounded-sm">
                                        <AvatarImage src={selectedApplication.applicant?.profile?.profilePhoto} />
                                        <AvatarFallback className="rounded-sm bg-[#FFD700]/10 text-[#FFD700] text-xl font-bold">
                                            {selectedApplication.applicant?.fullname?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">
                                            {selectedApplication.applicant?.fullname}
                                        </h3>
                                        <p className="text-gray-400">{selectedApplication.applicant?.email}</p>
                                    </div>
                                </div>

                                {/* Resume Score */}
                                {selectedApplication.resumeScore && (
                                    <div className="p-4 bg-white/5 rounded-sm mb-6">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Resume Score</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-white/10 rounded-full">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${selectedApplication.resumeScore}%`,
                                                        backgroundColor: selectedApplication.resumeScore >= 80 ? '#00FF94' :
                                                            selectedApplication.resumeScore >= 60 ? '#FFD700' : '#F59E0B'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-white font-bold font-mono">
                                                {selectedApplication.resumeScore}%
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button className="bg-[#FFD700] text-black hover:bg-[#FFE44D]">
                                        <Mail className="w-4 h-4 mr-2" /> Email
                                    </Button>
                                    <Button variant="outline" className="border-white/10 text-gray-300">
                                        <Calendar className="w-4 h-4 mr-2" /> Schedule
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CandidatePipeline;
