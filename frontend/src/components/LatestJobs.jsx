import React from 'react';
import LatestJobCards from './LatestJobCards';
import { useSelector } from 'react-redux';
import { ArrowRight, Sparkles, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const LatestJobs = () => {
    const { allJobs } = useSelector(store => store.job);
    const navigate = useNavigate();

    return (
        <section className="section bg-black relative border-t border-white/5">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent"></div>
            <div className="container-pro relative z-10">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
                    <div className="animate animate-fadeInLeft">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-medium mb-4 border border-yellow-500/20">
                            <Sparkles size={14} />
                            Explore Elite Opportunities
                        </div>
                        <h2 className="section-title">
                            Latest Job <span className="text-gradient-gold">Openings</span>
                        </h2>
                        <p className="section-subtitle mt-2 text-gray-400">
                            Discover the newest opportunities from top-tier companies
                        </p>
                    </div>

                    <Button
                        onClick={() => navigate('/browse')}
                        className="btn-outline animate animate-fadeInRight border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-black hover:border-yellow-500"
                    >
                        View All Jobs
                        <ArrowRight size={16} className="ml-2" />
                    </Button>
                </div>

                {/* Jobs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allJobs.length <= 0 ? (
                        <div className="col-span-full">
                            <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/50 rounded-2xl border border-white/10">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Briefcase size={32} className="text-gray-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">No Jobs Available</h3>
                                <p className="text-gray-400 text-center max-w-md">
                                    We're working on bringing you the best opportunities. Check back soon!
                                </p>
                            </div>
                        </div>
                    ) : (
                        allJobs?.slice(0, 6).map((job) => (
                            <LatestJobCards key={job._id} job={job} />
                        ))
                    )}
                </div>

                {/* CTA Section */}
                {allJobs.length > 0 && (
                    <div className="mt-16 text-center animate animate-fadeInUp">
                        <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-8 bg-gradient-to-r from-neutral-900 to-black border border-white/10 rounded-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors duration-500"></div>
                            <div className="text-white text-left relative z-10">
                                <h3 className="text-xl font-bold text-white">Can't find what you're looking for?</h3>
                                <p className="text-gray-400 text-sm mt-1">Browse our complete job listings or set up job alerts</p>
                            </div>
                            <Button
                                onClick={() => navigate('/jobs')}
                                className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold px-8 relative z-10"
                            >
                                Browse All Jobs
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

export default LatestJobs