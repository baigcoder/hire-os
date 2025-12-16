import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
    Building2, MapPin, Globe, Users, Calendar, Briefcase,
    ChevronRight, ExternalLink, Mail, Phone, Linkedin,
    Twitter, Facebook, Instagram, Youtube, Heart, Shield,
    Award, Coffee, Zap, Star, ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Navbar from '../shared/Navbar';
import { COMPANY_API_END_POINT, JOB_API_END_POINT } from '@/utils/constant';
import { toast } from 'sonner';

const CompanyProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompanyDetails();
        fetchCompanyJobs();
    }, [id]);

    const fetchCompanyDetails = async () => {
        try {
            const response = await axios.get(`${COMPANY_API_END_POINT}/${id}`, {
                withCredentials: true
            });
            if (response.data.success) {
                setCompany(response.data.company);
            }
        } catch (error) {
            console.error('Error fetching company:', error);
            toast.error('Failed to load company details');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanyJobs = async () => {
        try {
            const response = await axios.get(`${JOB_API_END_POINT}/company/${id}`, {
                withCredentials: true
            });
            if (response.data.success) {
                setJobs(response.data.jobs || []);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const socialIcons = {
        linkedin: Linkedin,
        twitter: Twitter,
        facebook: Facebook,
        instagram: Instagram,
        youtube: Youtube
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-2 border-[#FFD700]/30 rounded-sm" />
                        <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] rounded-sm animate-spin" />
                    </div>
                    <p className="text-[#FFD700]/70 font-mono text-sm uppercase tracking-wider">Loading...</p>
                </div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="min-h-screen bg-[#0A0A0A]">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                    <h1 className="text-2xl font-bold text-white mb-2">Company Not Found</h1>
                    <p className="text-gray-500 mb-6">The company you're looking for doesn't exist.</p>
                    <Button onClick={() => navigate('/companies')} className="bg-[#FFD700] text-black">
                        Browse Companies
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
            <Navbar />

            {/* Cover Image Section */}
            <div className="relative h-64 md:h-80 bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a]">
                {company.coverImage ? (
                    <img
                        src={company.coverImage}
                        alt={`${company.name} cover`}
                        className="w-full h-full object-cover opacity-80"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/10 via-transparent to-[#FFD700]/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 text-white hover:bg-white/10"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
            </div>

            {/* Company Info Header */}
            <div className="container mx-auto px-4 -mt-20 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row gap-6 items-start md:items-end"
                >
                    {/* Logo */}
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-[#111111] border-2 border-[#FFD700]/30 rounded-sm overflow-hidden flex items-center justify-center">
                        {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="w-16 h-16 text-[#FFD700]/50" />
                        )}
                    </div>

                    {/* Company Name & Meta */}
                    <div className="flex-1 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl md:text-4xl font-bold text-white">{company.name}</h1>
                            {company.isVerified && (
                                <Badge className="bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/30">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Verified
                                </Badge>
                            )}
                        </div>
                        {company.tagline && (
                            <p className="text-gray-400 text-lg mb-3">{company.tagline}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            {company.industry && (
                                <span className="flex items-center gap-1">
                                    <Briefcase className="w-4 h-4" />
                                    {company.industry}
                                </span>
                            )}
                            {company.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {company.location}
                                </span>
                            )}
                            {company.companySize && (
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {company.companySize} employees
                                </span>
                            )}
                            {company.foundedYear && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Founded {company.foundedYear}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {company.website && (
                            <Button
                                variant="outline"
                                onClick={() => window.open(company.website, '_blank')}
                                className="border-white/10 text-gray-400 hover:bg-white/5"
                            >
                                <Globe className="w-4 h-4 mr-2" />
                                Website
                            </Button>
                        )}
                        <Button
                            onClick={() => navigate(`/jobs?company=${company._id}`)}
                            className="bg-[#FFD700] text-black hover:bg-[#FFE44D]"
                        >
                            View Jobs ({jobs.length})
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-10">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - About & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* About Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-[#111111] border border-white/10 rounded-sm p-6"
                        >
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-[#FFD700]" />
                                About {company.name}
                            </h2>
                            <p className="text-gray-400 leading-relaxed whitespace-pre-line">
                                {company.description || 'No description available.'}
                            </p>
                        </motion.div>

                        {/* Culture & Values */}
                        {company.culture && company.culture.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-[#111111] border border-white/10 rounded-sm p-6"
                            >
                                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-[#FFD700]" />
                                    Culture & Values
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {company.culture.map((value, idx) => (
                                        <Badge key={idx} className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 px-3 py-1">
                                            {value}
                                        </Badge>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Benefits */}
                        {company.benefits && company.benefits.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-[#111111] border border-white/10 rounded-sm p-6"
                            >
                                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-[#FFD700]" />
                                    Employee Benefits
                                </h2>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {company.benefits.map((benefit, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-gray-400">
                                            <Zap className="w-4 h-4 text-[#00FF94]" />
                                            {benefit}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Gallery */}
                        {company.gallery && company.gallery.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-[#111111] border border-white/10 rounded-sm p-6"
                            >
                                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Coffee className="w-5 h-5 text-[#FFD700]" />
                                    Life at {company.name}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {company.gallery.map((image, idx) => (
                                        <div key={idx} className="relative aspect-video rounded-sm overflow-hidden group">
                                            <img
                                                src={image.url}
                                                alt={image.caption || `Gallery ${idx + 1}`}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            {image.caption && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                    <span className="text-white text-sm">{image.caption}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Open Positions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-[#111111] border border-white/10 rounded-sm p-6"
                        >
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-[#FFD700]" />
                                Open Positions ({jobs.length})
                            </h2>
                            {jobs.length > 0 ? (
                                <div className="space-y-3">
                                    {jobs.slice(0, 5).map((job) => (
                                        <div
                                            key={job._id}
                                            onClick={() => navigate(`/description/${job._id}`)}
                                            className="p-4 bg-white/5 rounded-sm border border-white/5 hover:border-[#FFD700]/30 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-white">{job.title}</h3>
                                                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                        <span>{job.location}</span>
                                                        <span>•</span>
                                                        <span>{job.jobType}</span>
                                                        {job.salary && (
                                                            <>
                                                                <span>•</span>
                                                                <span>PKR {job.salary.toLocaleString()}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-gray-600" />
                                            </div>
                                        </div>
                                    ))}
                                    {jobs.length > 5 && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => navigate(`/jobs?company=${company._id}`)}
                                            className="w-full text-[#FFD700] hover:bg-[#FFD700]/10"
                                        >
                                            View All {jobs.length} Jobs
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    No open positions at the moment.
                                </p>
                            )}
                        </motion.div>
                    </div>

                    {/* Right Column - Quick Info & Contact */}
                    <div className="space-y-6">
                        {/* Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[#111111] border border-white/10 rounded-sm p-6"
                        >
                            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wider">Contact</h3>
                            <div className="space-y-3">
                                {company.email && (
                                    <a href={`mailto:${company.email}`} className="flex items-center gap-3 text-gray-400 hover:text-[#FFD700] transition-colors">
                                        <Mail className="w-4 h-4" />
                                        {company.email}
                                    </a>
                                )}
                                {company.phone && (
                                    <a href={`tel:${company.phone}`} className="flex items-center gap-3 text-gray-400 hover:text-[#FFD700] transition-colors">
                                        <Phone className="w-4 h-4" />
                                        {company.phone}
                                    </a>
                                )}
                                {company.website && (
                                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-[#FFD700] transition-colors">
                                        <Globe className="w-4 h-4" />
                                        Visit Website
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </motion.div>

                        {/* Social Links */}
                        {company.socialLinks && Object.values(company.socialLinks).some(v => v) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-[#111111] border border-white/10 rounded-sm p-6"
                            >
                                <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wider">Follow Us</h3>
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(company.socialLinks).map(([platform, url]) => {
                                        if (!url) return null;
                                        const Icon = socialIcons[platform];
                                        return (
                                            <a
                                                key={platform}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center text-gray-400 hover:bg-[#FFD700]/20 hover:text-[#FFD700] transition-colors"
                                            >
                                                <Icon className="w-5 h-5" />
                                            </a>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Company Address */}
                        {company.address && (company.address.city || company.address.country) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-[#111111] border border-white/10 rounded-sm p-6"
                            >
                                <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wider">Headquarters</h3>
                                <div className="text-gray-400 text-sm leading-relaxed">
                                    {company.address.street && <p>{company.address.street}</p>}
                                    <p>
                                        {company.address.city}
                                        {company.address.state && `, ${company.address.state}`}
                                    </p>
                                    <p>{company.address.country} {company.address.zipCode}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-[#111111] border border-white/10 rounded-sm p-6"
                        >
                            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wider">Quick Stats</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-white/5 rounded-sm">
                                    <p className="text-2xl font-bold text-[#FFD700]">{jobs.length}</p>
                                    <p className="text-xs text-gray-500">Open Positions</p>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-sm">
                                    <p className="text-2xl font-bold text-[#FFD700]">
                                        {company.companySize?.split('-')[0] || '?'}
                                    </p>
                                    <p className="text-xs text-gray-500">Employees</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyProfilePage;
