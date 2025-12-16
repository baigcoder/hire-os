/**
 * SavedJobs Component
 * Display and manage bookmarked/saved jobs
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bookmark, BookmarkX, Briefcase, MapPin, DollarSign, Clock,
    Building, ArrowUpRight, Search, Filter, Trash2, ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SAVED_JOBS_API_END_POINT } from '@/utils/constant';

const SavedJobs = () => {
    const navigate = useNavigate();
    const [savedJobs, setSavedJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchSavedJobs();
    }, []);

    const fetchSavedJobs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${SAVED_JOBS_API_END_POINT}`, { withCredentials: true });
            if (res.data.success) {
                setSavedJobs(res.data.savedJobs || []);
            }
        } catch (error) {
            console.error('Error fetching saved jobs:', error);
            toast.error('Failed to load saved jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleUnsave = async (jobId) => {
        try {
            const res = await axios.delete(`${SAVED_JOBS_API_END_POINT}/unsave/${jobId}`, { withCredentials: true });
            if (res.data.success) {
                setSavedJobs(prev => prev.filter(job => job._id !== jobId));
                toast.success('Job removed from saved');
            }
        } catch (error) {
            toast.error('Failed to remove job');
        }
    };

    const filteredJobs = savedJobs.filter(job => {
        const matchesSearch = job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filter === 'all') return matchesSearch;
        if (filter === 'remote') return matchesSearch && job.location?.toLowerCase().includes('remote');
        if (filter === 'onsite') return matchesSearch && !job.location?.toLowerCase().includes('remote');
        return matchesSearch;
    });

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Bookmark className="text-[#FFD700]" /> Saved Jobs
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {savedJobs.length} jobs bookmarked for later
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <Input
                            placeholder="Search saved jobs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
                    >
                        <option value="all">All Jobs</option>
                        <option value="remote">Remote Only</option>
                        <option value="onsite">On-site Only</option>
                    </select>
                </div>
            </div>

            {/* Job Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
                            <div className="h-6 bg-white/10 rounded w-3/4 mb-3" />
                            <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
                            <div className="flex gap-2">
                                <div className="h-6 bg-white/10 rounded w-20" />
                                <div className="h-6 bg-white/10 rounded w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredJobs.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl"
                >
                    <Bookmark className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">
                        {searchQuery ? 'No matching jobs found' : 'No saved jobs yet'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {searchQuery ? 'Try adjusting your search' : 'Start exploring and save jobs you\'re interested in'}
                    </p>
                    <Button
                        className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                        onClick={() => navigate('/jobs')}
                    >
                        Browse Jobs
                    </Button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                        {filteredJobs.map((job, idx) => (
                            <motion.div
                                key={job._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-[#111111] border border-white/10 rounded-xl p-5 hover:border-[#FFD700]/30 transition-all relative overflow-hidden"
                            >
                                {/* Gradient accent */}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-[#FFD700]/5 blur-2xl rounded-full" />

                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                                {job.company?.logo ? (
                                                    <img src={job.company.logo} alt="" className="w-8 h-8 object-contain rounded" />
                                                ) : (
                                                    <Building className="w-5 h-5 text-gray-500" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white group-hover:text-[#FFD700] transition-colors">
                                                    {job.title}
                                                </h3>
                                                <p className="text-sm text-gray-500">{job.company?.name}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                                            onClick={() => handleUnsave(job._id)}
                                        >
                                            <BookmarkX className="w-5 h-5" />
                                        </Button>
                                    </div>

                                    {/* Details */}
                                    <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {job.location || 'Remote'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="w-4 h-4 text-[#FFD700]" />
                                            {job.salary || 'Competitive'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {formatDate(job.createdAt)}
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <Badge className="bg-white/5 text-gray-300 border-white/10">
                                            {job.jobType || 'Full-time'}
                                        </Badge>
                                        {job.experienceLevel && (
                                            <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20">
                                                {job.experienceLevel}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1 bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold"
                                            onClick={() => navigate(`/description/${job._id}`)}
                                        >
                                            View Details <ArrowUpRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default SavedJobs;
