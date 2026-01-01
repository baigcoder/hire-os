import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./shared/Navbar";
import { useSelector } from "react-redux";
import { JOB_API_END_POINT, APPLICATION_API_END_POINT } from "../utils/constant";
import JobApplication from "./jobs/JobApplication";
import { Button } from "./ui/button";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Users,
  Zap,
  Shield,
  Target,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Globe,
  Star,
  Gift,
  Award,
  GraduationCap,
} from "lucide-react";
import { motion } from "framer-motion";

const JobDescription = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showApplication, setShowApplication] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Get token from localStorage (backend JWT)
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${JOB_API_END_POINT}/get/${id}`, { headers });
        setJob(response.data.job);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("Failed to load job details");
        setLoading(false);
      }
    };

    // Check if user already applied to this job
    const checkApplicationStatus = async () => {
      if (!user || !token) return;
      try {
        const response = await axios.get(`${APPLICATION_API_END_POINT}/get`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const appliedJobs = response.data.application || [];
        const alreadyApplied = appliedJobs.some(app => app.job?._id === id || app.job === id);
        setHasApplied(alreadyApplied);
      } catch (err) {
        console.log("Could not check application status");
      }
    };

    fetchJob();
    checkApplicationStatus();
  }, [id, token, user]);

  const handleApplyClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (hasApplied) {
      return; // Don't allow re-applying
    }
    setShowApplication(true);
  };

  const handleApplicationSubmit = () => {
    setShowApplication(false);
    setHasApplied(true); // Mark as applied after successful submission
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="max-w-6xl mx-auto py-20 px-4 pt-32">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-white/5 rounded-lg border border-white/10"></div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="h-64 bg-white/5 rounded-lg border border-white/10"></div>
                <div className="h-48 bg-white/5 rounded-lg border border-white/10"></div>
              </div>
              <div className="h-64 bg-white/5 rounded-lg border border-white/10"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="max-w-6xl mx-auto py-20 px-4 pt-32 text-center">
          <div className="bg-red-900/10 border border-red-500/20 p-8 rounded-lg">
            <p className="text-red-400 text-lg font-medium font-mono">
              [ERROR] {error || "POSITION_NOT_FOUND"}
            </p>
            <Button
              onClick={() => navigate("/browse")}
              className="mt-6 btn-outline-industrial"
            >
              ← RETURN TO SEARCH
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 selection:bg-yellow-500/30 selection:text-yellow-200">
      <Navbar />

      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none"></div>

      {/* Top Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto py-12 px-4 relative z-10 pt-28">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-6 text-gray-500 hover:text-yellow-500 pl-0 hover:bg-transparent font-mono text-sm group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            BACK_TO_SEARCH
          </Button>
        </motion.div>

        {/* Header Card - Industrial HUD Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card-industrial p-8 mb-8 relative overflow-hidden group"
        >
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-yellow-500/30 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-yellow-500/30 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-yellow-500/30 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-yellow-500/30 rounded-br-lg"></div>

          {/* Status Badge */}
          <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded font-mono text-xs text-green-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            STATUS: ACTIVE
          </div>

          {/* Background Decoration */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <Building2 size={200} className="text-white" />
          </div>

          <div className="flex flex-col lg:flex-row items-start gap-8 relative z-10">
            {/* Company Logo */}
            <div className="w-28 h-28 rounded-lg bg-[#111] border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-yellow-500/40 transition-all duration-300">
              {job.company?.logo ? (
                <img
                  src={job.company.logo}
                  alt={job.company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 size={48} className="text-yellow-500/70" />
              )}
            </div>

            {/* Job Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs text-gray-500 tracking-wider">
                  POSITION_ID: {job._id?.slice(-8).toUpperCase()}
                </span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                {job.title}
              </h1>

              <p className="text-xl text-yellow-500 font-bold mb-6 flex items-center gap-2">
                <Building2 size={18} className="opacity-70" />
                {job.company?.name}
              </p>

              {/* Tags Grid */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 rounded font-mono text-sm">
                  <MapPin size={16} className="text-yellow-500" />
                  <span className="text-gray-300">{job.location}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 rounded font-mono text-sm">
                  <Briefcase size={16} className="text-yellow-500" />
                  <span className="text-gray-300">{job.jobType}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded font-mono text-sm">
                  <DollarSign size={16} className="text-yellow-500" />
                  <span className="text-yellow-500 font-bold">
                    ${typeof job.salary === "number"
                      ? job.salary.toLocaleString()
                      : job.salary}{" "}
                    /year
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 rounded font-mono text-sm">
                  <Calendar size={16} className="text-yellow-500" />
                  <span className="text-gray-300">Posted {formatDate(job.createdAt)}</span>
                </div>
                {job.position && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 rounded font-mono text-sm">
                    <Users size={16} className="text-yellow-500" />
                    <span className="text-gray-300">{job.position} Openings</span>
                  </div>
                )}
                {job.experienceLevel !== undefined && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded font-mono text-sm">
                    <GraduationCap size={16} className="text-purple-400" />
                    <span className="text-purple-400">{job.experienceLevel}+ yrs exp</span>
                  </div>
                )}
                {job.isRemote && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded font-mono text-sm">
                    <Globe size={16} className="text-emerald-400" />
                    <span className="text-emerald-400">Remote OK</span>
                  </div>
                )}
                {job.urgentHiring && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded font-mono text-sm animate-pulse">
                    <Zap size={16} className="text-red-400" />
                    <span className="text-red-400">Urgent Hiring</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="card-industrial p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                  <Target size={20} className="text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold text-white font-mono tracking-wide">
                  MISSION_BRIEF
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
              </div>

              <div className="prose prose-invert max-w-none text-gray-400 leading-relaxed whitespace-pre-line text-[15px]">
                {job.description}
              </div>
            </motion.div>

            {/* Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="card-industrial p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                  <Shield size={20} className="text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold text-white font-mono tracking-wide">
                  REQUIREMENTS
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
              </div>

              <ul className="space-y-4">
                {job.requirements?.map((req, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-4 text-gray-400 group"
                  >
                    <div className="mt-2 w-2 h-2 rounded-full bg-yellow-500 group-hover:shadow-[0_0_10px_rgba(255,215,0,0.5)] transition-shadow"></div>
                    <span className="leading-relaxed text-[15px]">{req}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="card-industrial p-8"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                    <Zap size={20} className="text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white font-mono tracking-wide">
                    SKILL_MATRIX
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-[#111] border border-white/10 rounded font-mono text-sm text-gray-300 hover:border-yellow-500/40 hover:text-yellow-500 transition-all cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Benefits Section */}
            {job.benefits && job.benefits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="card-industrial p-8"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <Gift size={20} className="text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white font-mono tracking-wide">
                    BENEFITS_PACKAGE
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {job.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 px-4 py-3 bg-[#111] border border-white/10 rounded hover:border-emerald-500/30 transition-all group"
                    >
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{benefit}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Application */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="sticky top-28"
            >
              {user && user.role === "student" ? (
                hasApplied ? (
                  /* Already Applied State */
                  <div className="card-industrial p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-500/10 to-transparent"></div>

                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="font-mono text-xs text-green-400">APPLICATION_SUBMITTED</span>
                    </div>

                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <CheckCircle2 size={32} className="text-green-500" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 text-center">
                      Already Applied
                    </h3>

                    <p className="text-sm text-gray-500 mb-6 leading-relaxed text-center">
                      You have already submitted an application for this position. Track your status in the dashboard.
                    </p>

                    <Button
                      onClick={() => navigate("/dashboard")}
                      className="w-full btn-outline-industrial py-4"
                    >
                      VIEW APPLICATION STATUS
                    </Button>
                  </div>
                ) : !showApplication ? (
                  <div className="card-industrial p-6 relative overflow-hidden">
                    {/* Corner Accent */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-500/10 to-transparent"></div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 mb-6">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="font-mono text-xs text-green-400">SYSTEMS_READY</span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <Sparkles size={20} className="text-yellow-500" />
                      Ready to Apply?
                    </h3>

                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                      Deploy our AI-powered application system to maximize your chances of success.
                    </p>

                    {/* Stats Preview */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-[#111] border border-white/10 rounded p-3 text-center">
                        <p className="font-mono text-xs text-gray-500 mb-1">MATCH_RATE</p>
                        <p className="text-lg font-bold text-yellow-500">AI</p>
                      </div>
                      <div className="bg-[#111] border border-white/10 rounded p-3 text-center">
                        <p className="font-mono text-xs text-gray-500 mb-1">OPTIMIZE</p>
                        <p className="text-lg font-bold text-green-400">CV</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleApplyClick}
                      className="w-full btn-primary-industrial py-6 text-base font-bold group"
                    >
                      <span className="flex items-center justify-center gap-2">
                        APPLY NOW
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>

                    <p className="text-xs text-center text-gray-600 mt-4 font-mono">
                      // RESUME_ANALYSIS_BEFORE_SUBMIT
                    </p>
                  </div>
                ) : (
                  <JobApplication
                    jobId={job._id}
                    onApplicationSubmit={handleApplicationSubmit}
                    onCancel={() => setShowApplication(false)}
                  />
                )
              ) : (
                <div className="card-industrial p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                    <Shield size={32} className="text-yellow-500" />
                  </div>
                  <p className="text-gray-400 mb-4 text-sm">
                    Authentication required to access this position.
                  </p>
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full btn-outline-industrial"
                  >
                    LOGIN TO APPLY
                  </Button>
                </div>
              )}

              {/* Company Quick Info */}
              <div className="card-industrial p-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp size={18} className="text-yellow-500" />
                  <span className="font-mono text-xs text-gray-500">COMPANY_INTEL</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-gray-500">Organization</span>
                    <span className="text-sm text-white font-medium">{job.company?.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-gray-500">Industry</span>
                    <span className="text-sm text-white font-medium">{job.industry || job.company?.industry || "Technology"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-gray-500">Location</span>
                    <span className="text-sm text-white font-medium">{job.location}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="text-sm text-white font-medium">{job.jobType}</span>
                  </div>
                  {job.department && (
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-gray-500">Department</span>
                      <span className="text-sm text-white font-medium">{job.department}</span>
                    </div>
                  )}
                  {job.educationRequired && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-500">Education</span>
                      <span className="text-sm text-white font-medium">{job.educationRequired}</span>
                    </div>
                  )}
                </div>

                {job.company?.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-white/5 border border-white/10 rounded text-sm text-gray-400 hover:text-yellow-500 hover:border-yellow-500/30 transition-all font-mono"
                  >
                    <Globe size={14} />
                    VISIT WEBSITE
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescription;
