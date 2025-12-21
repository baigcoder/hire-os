import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/api";
import { toast } from "sonner";
import {
  Briefcase,
  MapPin,
  Building2,
  Sparkles,
  Target,
  ChevronRight,
  TrendingUp,
  Check,
  X,
  Loader2,
  Award,
  Star,
  Filter,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { ComponentLoader } from "../shared/DashboardLoader";


const JobsForYou = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    fetchMatchedJobs();
  }, []);

  const fetchMatchedJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/job/ai-matched");

      if (res.data.success) {
        const rawJobs = res.data.data?.jobs || [];
        const normalizedJobs = rawJobs.map((job) => ({
          ...job,
          matchScore: job.match?.score ?? 0,
          matchedSkills: job.match?.matchedSkills || [],
          missingSkills: job.match?.missingSkills || job.match?.skillGaps || [],
          aiInsight: job.match?.recommendation || "",
        }));
        setJobs(normalizedJobs);
      }
    } catch (error) {
      console.error("Failed to fetch matched jobs:", error);
      toast.error("Failed to load job recommendations");
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadge = (score) => {
    if (score >= 85)
      return {
        label: "EXCELLENT MATCH",
        color: "from-emerald-500 to-green-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
      };
    if (score >= 70)
      return {
        label: "STRONG MATCH",
        color: "from-[#FFD700] to-amber-400",
        bg: "bg-[#FFD700]/10",
        border: "border-[#FFD700]/30",
        text: "text-[#FFD700]",
      };
    if (score >= 55)
      return {
        label: "GOOD MATCH",
        color: "from-blue-500 to-cyan-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
      };
    return {
      label: "EXPLORE",
      color: "from-gray-500 to-gray-400",
      bg: "bg-white/5",
      border: "border-white/10",
      text: "text-gray-400",
    };
  };

  const filteredJobs = jobs.filter((job) => {
    if (activeFilter === "all") return true;
    const score = job.matchScore || 0;
    if (activeFilter === "excellent") return score >= 85;
    if (activeFilter === "strong") return score >= 70 && score < 85;
    if (activeFilter === "good") return score >= 55 && score < 70;
    return true;
  });

  if (loading) {
    return <ComponentLoader message="Analyzing job matches" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
              <Target className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FFD700] rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              JOBS FOR YOU
            </h2>
            <p className="text-xs text-gray-500 font-mono tracking-wider">
              AI-POWERED RECOMMENDATIONS
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {["all", "excellent", "strong", "good"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all ${activeFilter === filter
                  ? "bg-[#FFD700] text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0a0a0a] to-[#111111] border border-white/10 rounded-sm">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {jobs.filter((j) => j.matchScore >= 85).length}
            </div>
            <div className="text-xs text-emerald-400 font-mono">EXCELLENT</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {
                jobs.filter((j) => j.matchScore >= 70 && j.matchScore < 85)
                  .length
              }
            </div>
            <div className="text-xs text-[#FFD700] font-mono">STRONG</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {
                jobs.filter((j) => j.matchScore >= 55 && j.matchScore < 70)
                  .length
              }
            </div>
            <div className="text-xs text-blue-400 font-mono">GOOD</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="w-4 h-4 text-[#FFD700]" />
          <span className="font-mono">POWERED BY GEMINI AI</span>
        </div>
      </div>

      {/* Job Cards Grid */}
      <div className="grid gap-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-mono text-sm">NO JOBS MATCH CURRENT FILTER</p>
          </div>
        ) : (
          filteredJobs.map((job, index) => {
            const badge = getMatchBadge(job.matchScore || 0);
            const isHovered = hoveredId === job._id;

            return (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseEnter={() => setHoveredId(job._id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`relative group bg-[#0a0a0a] border rounded-sm overflow-hidden transition-all duration-300 ${isHovered ? `${badge.border} shadow-lg` : "border-white/10"
                  }`}
              >
                {/* Glow Effect on Hover */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                  className={`absolute inset-0 bg-gradient-to-r ${badge.color} opacity-5 pointer-events-none`}
                />

                <div className="relative p-5">
                  <div className="flex items-start gap-4">
                    {/* Company Logo */}
                    <div className="w-14 h-14 bg-white/5 rounded-sm flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors">
                      {job.company?.logo ? (
                        <img
                          src={job.company.logo}
                          alt=""
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-gray-600" />
                      )}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white text-lg group-hover:text-[#FFD700] transition-colors truncate">
                          {job.title}
                        </h3>
                        <Badge
                          className={`${badge.bg} ${badge.text} ${badge.border} border font-mono text-[10px] px-2`}
                        >
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {job.company?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location || "Remote"}
                        </span>
                        {job.salary && (
                          <span className="text-[#FFD700]">
                            ${(job.salary / 1000).toFixed(0)}K
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-2">
                        {(job.matchedSkills || [])
                          .slice(0, 4)
                          .map((skill, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-sm border border-emerald-500/20"
                            >
                              <Check className="w-3 h-3" />
                              {skill}
                            </span>
                          ))}
                        {(job.missingSkills || [])
                          .slice(0, 2)
                          .map((skill, i) => (
                            <span
                              key={`m-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-sm border border-red-500/20"
                            >
                              <X className="w-3 h-3" />
                              {skill}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Match Score Circle */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`relative w-16 h-16 rounded-full ${badge.bg} border ${badge.border} flex items-center justify-center`}
                      >
                        <span className={`text-xl font-bold ${badge.text}`}>
                          {job.matchScore || 0}%
                        </span>
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className={`${badge.text} opacity-30`}
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${(job.matchScore || 0) * 1.76} 176`}
                            className={badge.text}
                          />
                        </svg>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 font-mono">
                        MATCH
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      height: isHovered ? "auto" : 0,
                    }}
                    className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between"
                  >
                    <div className="text-xs text-gray-500 font-mono">
                      {job.aiInsight ||
                        "Skills and experience align well with requirements"}
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-mono text-xs"
                    >
                      VIEW JOB
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JobsForYou;
