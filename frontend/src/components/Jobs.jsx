import React, { useEffect, useState } from 'react'
import Navbar from './shared/Navbar'
import Footer from './shared/Footer'
import FilterCard from './FilterCard'
import Job from './Job';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Grid3X3, List, Briefcase, X, Sparkles, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const Jobs = () => {
    const { allJobs, searchedQuery } = useSelector(store => store.job);
    const [filterJobs, setFilterJobs] = useState(allJobs);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [searchInput, setSearchInput] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    useEffect(() => {
        let filtered = allJobs;

        const query = searchInput || searchedQuery;
        if (query) {
            filtered = allJobs.filter((job) => {
                const searchLower = query.toLowerCase();
                return job.title?.toLowerCase().includes(searchLower) ||
                    job.description?.toLowerCase().includes(searchLower) ||
                    job.location?.toLowerCase().includes(searchLower) ||
                    job.company?.name?.toLowerCase().includes(searchLower) ||
                    job.skills?.some(skill => skill.toLowerCase().includes(searchLower))
            });
        }

        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'salary-high':
                    return (b.salary || 0) - (a.salary || 0);
                case 'salary-low':
                    return (a.salary || 0) - (b.salary || 0);
                default:
                    return 0;
            }
        });

        setFilterJobs(filtered);
    }, [allJobs, searchedQuery, searchInput, sortBy]);

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
            {/* Industrial Grid Background */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <Navbar />

            {/* Header Section */}
            <div className="bg-[#111111] border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
                                <Briefcase className="w-5 h-5 text-[#FFD700]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">
                                    BROWSE JOBS
                                </h1>
                                <p className="text-xs text-gray-500 font-mono tracking-wider">
                                    {filterJobs.length} POSITIONS AVAILABLE
                                </p>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="flex items-center gap-3 flex-1 max-w-xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search jobs by title, skills, location..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3 bg-[#0a0a0a] border border-white/10 rounded-sm text-white font-mono text-sm focus:border-[#FFD700]/50 focus:outline-none transition-all placeholder-gray-600"
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => setSearchInput('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                <div className="flex gap-6">
                    {/* Sidebar Filters - Desktop */}
                    <aside className="hidden lg:block w-72 flex-shrink-0">
                        <div className="sticky top-24">
                            <FilterCard />
                        </div>
                    </aside>

                    {/* Jobs Grid */}
                    <main className="flex-1">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-6 p-4 bg-[#111111] border border-white/10 rounded-sm">
                            <div className="flex items-center gap-3">
                                {/* Mobile Filter Toggle */}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`lg:hidden flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-mono transition-all ${showFilters
                                            ? 'bg-[#FFD700] text-black'
                                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <SlidersHorizontal size={14} />
                                    FILTERS
                                </button>

                                {/* Sort */}
                                <div className="relative">
                                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-sm text-gray-300 text-xs font-mono focus:border-[#FFD700]/50 focus:outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="newest">NEWEST FIRST</option>
                                        <option value="oldest">OLDEST FIRST</option>
                                        <option value="salary-high">SALARY: HIGH → LOW</option>
                                        <option value="salary-low">SALARY: LOW → HIGH</option>
                                    </select>
                                </div>
                            </div>

                            {/* View Mode Toggle */}
                            <div className="hidden sm:flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-sm">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-sm transition-all ${viewMode === 'grid'
                                            ? 'bg-[#FFD700] text-black'
                                            : 'text-gray-500 hover:text-white'
                                        }`}
                                >
                                    <Grid3X3 size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-sm transition-all ${viewMode === 'list'
                                            ? 'bg-[#FFD700] text-black'
                                            : 'text-gray-500 hover:text-white'
                                        }`}
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Mobile Filters */}
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="lg:hidden mb-6"
                            >
                                <FilterCard />
                            </motion.div>
                        )}

                        {/* Jobs List */}
                        {filterJobs.length <= 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center py-20 bg-[#111111] border border-white/10 rounded-sm"
                            >
                                <div className="w-16 h-16 rounded-sm bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                    <Briefcase size={32} className="text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">NO JOBS FOUND</h3>
                                <p className="text-gray-500 text-center max-w-md mb-6 text-sm font-mono">
                                    We couldn't find any jobs matching your criteria. Try adjusting your search or filters.
                                </p>
                                <Button
                                    onClick={() => {
                                        setSearchInput('');
                                        setSortBy('newest');
                                    }}
                                    className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-mono text-xs"
                                >
                                    CLEAR ALL FILTERS
                                </Button>
                            </motion.div>
                        ) : (
                            <div className={`${viewMode === 'grid'
                                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                                    : 'flex flex-col gap-3'
                                }`}>
                                {filterJobs.map((job, index) => (
                                    <motion.div
                                        key={job?._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <Job job={job} viewMode={viewMode} />
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Results Count */}
                        {filterJobs.length > 0 && (
                            <div className="flex items-center justify-center mt-10 pt-6 border-t border-white/10">
                                <p className="text-gray-500 text-xs font-mono tracking-wider">
                                    SHOWING {filterJobs.length} OF {allJobs.length} JOBS
                                </p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    )
}

export default Jobs