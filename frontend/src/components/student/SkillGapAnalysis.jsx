/**
 * SkillGapAnalysis Component
 * AI-powered skill gap identification and recommendations
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Brain,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import axios from "axios";
import { toast } from "sonner";
import { CAREER_INSIGHTS_API_END_POINT } from "@/utils/constant";
import { dashboardCache } from "../../hooks/useDashboardPrefetch";

const SkillGapAnalysis = () => {
  const [analysis, setAnalysis] = useState(null);
  const [userSkills, setUserSkills] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check cache first for instant load
    const cached = dashboardCache.get("skill-gap");
    if (cached) {
      setUserSkills(cached.userSkills || []);
      setTrendingSkills(cached.trendingSkills || []);
      setAnalysis(cached.analysis || null);
      setLoading(false);
    } else {
      fetchSkillGap();
    }
  }, []);

  const fetchSkillGap = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await axios.get(
        `${CAREER_INSIGHTS_API_END_POINT}/skill-gap`,
        { withCredentials: true },
      );
      if (res.data.success) {
        setUserSkills(res.data.userSkills || []);
        setTrendingSkills(res.data.trendingSkills || []);
        setAnalysis(res.data.analysis || null);
      }
    } catch (error) {
      console.error("Error fetching skill gap:", error);
      toast.error("Failed to analyze skills");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "low":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#FFD700]/20 rounded-full animate-pulse" />
              <Brain className="absolute inset-0 m-auto w-8 h-8 text-[#FFD700] animate-pulse" />
            </div>
            <p className="text-gray-400 mt-4 font-mono text-sm">
              ANALYZING YOUR SKILLS...
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Comparing with market demand
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
            <Target className="text-[#FFD700]" /> Skill Gap Analysis
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            AI-powered insights to boost your career
          </p>
        </div>
        <Button
          variant="outline"
          className="border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
          onClick={() => fetchSkillGap(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Readiness Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="text-[#FFD700]" /> Career Readiness
              </h3>
              <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20">
                AI Analyzed
              </Badge>
            </div>

            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(analysis?.overallReadiness || 0) * 3.52} 352`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {analysis?.overallReadiness || 0}%
                  </span>
                  <span className="text-xs text-gray-500">READY</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {analysis?.careerAdvice ||
                    "Complete your profile to get personalized career advice."}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            {analysis?.recommendations?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Action Items
                </h4>
                {analysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#FFD700]">
                        {idx + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{rec}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Skills Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#111111] border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-cyan-400" /> Market Demand Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Your Strong Skills */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Your
                  Strong Skills
                </h4>
                <div className="space-y-2">
                  {(analysis?.strongSkills || []).length > 0 ? (
                    analysis.strongSkills.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-emerald-300">
                          {skill}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Add skills to your profile
                    </p>
                  )}
                </div>
              </div>

              {/* Skill Gaps */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" /> Skills to
                  Learn
                </h4>
                <div className="space-y-2">
                  {(analysis?.skillGaps || []).length > 0 ? (
                    analysis.skillGaps.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg"
                      >
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-300">{skill}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Great! No major gaps identified
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Priority Skills */}
          {analysis?.prioritySkills?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#111111] border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="text-[#FFD700]" /> Priority Skills to
                Develop
              </h3>
              <div className="space-y-3">
                {analysis.prioritySkills.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(item.priority)}`}
                      >
                        {item.priority?.toUpperCase()}
                      </div>
                      <span className="font-medium text-white">
                        {item.skill}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 max-w-xs text-right">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Skills */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-5">
            <h4 className="font-bold text-white mb-4">
              Your Skills ({userSkills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {userSkills.length > 0 ? (
                userSkills.map((skill, idx) => (
                  <Badge
                    key={idx}
                    className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20"
                  >
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No skills added yet</p>
              )}
            </div>
          </div>

          {/* Trending Skills */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-5">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Trending in Market
            </h4>
            <div className="space-y-3">
              {trendingSkills.slice(0, 8).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.skill}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{
                          width: `${Math.min(100, (item.demand / trendingSkills[0]?.demand) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">
                      {item.demand}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillGapAnalysis;
