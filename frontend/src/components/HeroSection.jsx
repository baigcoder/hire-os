import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Search, Briefcase, Users, Building2, MapPin, ArrowRight, Star, Sparkles, Crown } from 'lucide-react'
import { useDispatch } from 'react-redux';
import { setSearchedQuery } from '@/redux/jobSlice';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import InteractiveBackground from './shared/InteractiveBackground';

const HeroSection = () => {
    const [query, setQuery] = useState("");
    const [location, setLocation] = useState("");
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Mouse tilt effect logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-500, 500], [10, -10]);
    const rotateY = useTransform(x, [-500, 500], [-10, 10]);

    const handleMouseMove = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
    };

    const searchJobHandler = () => {
        dispatch(setSearchedQuery(query));
        navigate("/browse");
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            searchJobHandler();
        }
    }

    const popularSearches = ['Software Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'Marketing'];

    const stats = [
        { value: '10K+', label: 'Active Jobs', icon: Briefcase },
        { value: '2K+', label: 'Companies', icon: Building2 },
        { value: '50K+', label: 'Candidates', icon: Users },
    ];

    const trustedCompanies = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'];

    return (
        <section
            className="relative pt-40 pb-20 lg:pt-60 lg:pb-32 overflow-hidden min-h-screen flex items-center justify-center bg-black perspective-1000"
            onMouseMove={handleMouseMove}
        >
            {/* Interactive Neural Background */}
            <div className="absolute inset-0 z-0 opacity-60">
                <InteractiveBackground />
            </div>

            {/* Static Glow Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10 text-center">

                {/* 3D Tilt Wrapper for Hero Content */}
                <motion.div style={{ rotateX, rotateY, perspective: 1000 }}>

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-105 transition-transform duration-300"
                    >
                        <Crown size={18} />
                        <span className="text-sm font-bold tracking-widest uppercase">The Gold Standard of Hiring</span>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-tight tracking-tighter mb-8 drop-shadow-2xl"
                    >
                        Find Your <br />
                        <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-600 bg-clip-text text-transparent animate-shine bg-[length:200%_auto]">
                            Legacy
                        </span>
                    </motion.h1>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light"
                    >
                        Access exclusive opportunities with the world's most prestigious companies.
                        <span className="text-white font-medium block mt-2">Where elite talent meets premium careers.</span>
                    </motion.p>

                    {/* Search Bar (3D Floating Effect) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="search-container max-w-4xl mx-auto mb-16 relative group"
                        style={{ transformStyle: "preserve-3d", transform: "translateZ(50px)" }}
                    >
                        {/* Glow under search bar */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>

                        <div className="relative flex flex-col md:flex-row items-center bg-black/60 border border-white/10 rounded-2xl p-2 md:p-3 backdrop-blur-xl shadow-2xl hover:border-yellow-500/40 transition-all duration-300">
                            <div className="flex-1 flex items-center w-full px-4 mb-4 md:mb-0">
                                <Search size={22} className="text-gray-400 group-hover:text-yellow-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Job title, keywords, or company"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 text-lg px-4 py-2 outline-none"
                                />
                            </div>
                            <div className="hidden md:block w-px h-10 bg-white/10 mx-2"></div>
                            <div className="flex-1 flex items-center w-full px-4 mb-4 md:mb-0">
                                <MapPin size={22} className="text-gray-400 group-hover:text-yellow-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Location (e.g. New York)"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 text-lg px-4 py-2 outline-none"
                                />
                            </div>
                            <Button
                                onClick={searchJobHandler}
                                className="w-full md:w-auto px-8 py-6 text-lg bg-yellow-500 text-black hover:bg-yellow-400 font-bold rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] transition-all duration-300 hover:scale-105 active:scale-95"
                            >
                                <Search size={20} className="mr-2" />
                                Search
                            </Button>
                        </div>

                        {/* Popular Searches */}
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <span className="text-sm text-gray-500 font-medium tracking-wide">TRENDING:</span>
                            {popularSearches.map((term, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setQuery(term);
                                        dispatch(setSearchedQuery(term));
                                        navigate("/browse");
                                    }}
                                    className="text-sm px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-gray-400 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/30 transition-all duration-300 hover:scale-105"
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    </motion.div>

                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="flex flex-wrap justify-center gap-12 md:gap-24 border-t border-white/5 pt-12 max-w-5xl mx-auto"
                >
                    {stats.map((stat, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 group cursor-default hover:transform hover:translate-y-[-5px] transition-transform duration-300">
                            <div className="p-3 rounded-full bg-white/5 text-yellow-500/80 group-hover:text-yellow-500 group-hover:bg-yellow-500/10 transition-colors duration-300 group-hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                <stat.icon size={24} />
                            </div>
                            <div className="text-3xl md:text-4xl font-black text-white tracking-tight">{stat.value}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Trusted By Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="mt-20 opacity-60 hover:opacity-100 transition-opacity duration-500"
                >
                    <p className="text-xs text-gray-600 uppercase tracking-[0.2em] mb-8 font-bold">Trust by Industry Leaders</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 grayscale hover:grayscale-0 transition-all duration-500">
                        {trustedCompanies.map((company, idx) => (
                            <span
                                key={idx}
                                className="text-xl md:text-2xl font-bold text-gray-500 hover:text-white transition-colors cursor-default transform hover:scale-110 duration-300 block"
                            >
                                {company}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default HeroSection