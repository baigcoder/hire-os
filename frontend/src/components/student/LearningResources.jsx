/**
 * LearningResources Component
 * AI-curated courses and learning paths
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ExternalLink,
  Clock,
  Star,
  Play,
  CheckCircle,
  Sparkles,
  Filter,
  GraduationCap,
  Code,
  Award,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import axios from "axios";
import { toast } from "sonner";
import { CAREER_INSIGHTS_API_END_POINT } from "@/utils/constant";
import { dashboardCache } from "../../hooks/useDashboardPrefetch";

const LearningResources = () => {
  const [resources, setResources] = useState(null);
  const [userSkills, setUserSkills] = useState([]);
  const [inDemandSkills, setInDemandSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, free, paid

  useEffect(() => {
    // Check cache first for instant load
    const cached = dashboardCache.get("learning");
    if (cached) {
      setResources(cached.resources || null);
      setUserSkills(cached.userSkills || []);
      setInDemandSkills(cached.inDemandSkills || []);
      setLoading(false);
    } else {
      fetchLearningResources();
    }
  }, []);

  const fetchLearningResources = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${CAREER_INSIGHTS_API_END_POINT}/learning`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setResources(res.data.resources || null);
        setUserSkills(res.data.userSkills || []);
        setInDemandSkills(res.data.inDemandSkills || []);
      }
    } catch (error) {
      console.error("Error fetching learning resources:", error);
      toast.error("Failed to load learning resources");
    } finally {
      setLoading(false);
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform?.toLowerCase()) {
      case "udemy":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "coursera":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "youtube":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "freecodecamp":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "pluralsight":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case "beginner":
        return "text-emerald-400 bg-emerald-500/10";
      case "intermediate":
        return "text-yellow-400 bg-yellow-500/10";
      case "advanced":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-gray-400 bg-gray-500/10";
    }
  };

  const filteredCourses = (resources?.recommendedCourses || []).filter(
    (course) => {
      if (filter === "all") return true;
      if (filter === "free") return course.isFree;
      if (filter === "paid") return !course.isFree;
      return true;
    },
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#FFD700]/20 rounded-full animate-pulse" />
              <BookOpen className="absolute inset-0 m-auto w-8 h-8 text-[#FFD700] animate-pulse" />
            </div>
            <p className="text-gray-400 mt-4 font-mono text-sm">
              CURATING LEARNING RESOURCES...
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Finding the best courses for you
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-[#FFD700]" /> Learning Resources
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            AI-curated courses to accelerate your career
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["all", "free", "paid"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "ghost"}
              size="sm"
              className={
                filter === f ? "bg-[#FFD700] text-black" : "text-gray-400"
              }
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "free" ? "🆓 Free" : "💰 Paid"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Learning Path */}
          {resources?.learningPath?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-[#FFD700]/20 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="text-[#FFD700]" /> Your Learning Path
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#FFD700] to-emerald-500" />
                <div className="space-y-4 pl-10">
                  {resources.learningPath.map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-10 w-8 h-8 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center">
                        <span className="text-sm font-bold text-[#FFD700]">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                        <p className="text-sm text-gray-300">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Course Grid */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">
              Recommended Courses
            </h3>
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCourses.map((course, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-[#111111] border border-white/10 rounded-xl p-5 hover:border-[#FFD700]/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={getPlatformColor(course.platform)}>
                        {course.platform}
                      </Badge>
                      {course.isFree ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          FREE
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                          PAID
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-semibold text-white mb-2 group-hover:text-[#FFD700] transition-colors line-clamp-2">
                      {course.title}
                    </h4>

                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration || "Self-paced"}
                      </span>
                      <Badge className={getLevelColor(course.level)}>
                        {course.level}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className="bg-white/5 text-gray-400 border-white/10">
                        {course.skill}
                      </Badge>
                      {course.priority === "High" && (
                        <span className="text-xs text-red-400 flex items-center gap-1">
                          <Star className="w-3 h-3" /> Priority
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <BookOpen className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">No courses match your filter</p>
              </div>
            )}
          </div>

          {/* Project Ideas */}
          {resources?.projectIdeas?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#111111] border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Code className="text-cyan-400" /> Portfolio Project Ideas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resources.projectIdeas.map((project, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                      <Code className="w-5 h-5 text-cyan-400" />
                    </div>
                    <p className="text-sm text-gray-300">{project}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Wins */}
          {resources?.quickWins?.length > 0 && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-5">
              <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" /> Quick Wins (1
                Week)
              </h4>
              <div className="space-y-3">
                {resources.quickWins.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-300">{win}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {resources?.certifications?.length > 0 && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-5">
              <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FFD700]" /> Certifications to
                Pursue
              </h4>
              <div className="space-y-3">
                {resources.certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-lg"
                  >
                    <Award className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-sm text-gray-300">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills to Learn */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-5">
            <h4 className="font-bold text-white mb-3">In-Demand Skills</h4>
            <div className="flex flex-wrap gap-2">
              {inDemandSkills.slice(0, 10).map((skill, idx) => (
                <Badge
                  key={idx}
                  className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningResources;
