import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  Target,
  BarChart3,
  Activity,
  RefreshCw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const RecruiterAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/stats/recruiter?period=${period}`,
        {
          withCredentials: true,
        },
      );
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      // Demo data
      setAnalytics({
        overview: {
          totalApplications: 248,
          newThisWeek: 47,
          changePercent: 12.5,
          activeJobs: 8,
          avgTimeToHire: 18,
          offerAcceptRate: 76,
        },
        funnel: {
          applied: 248,
          screened: 180,
          interviewed: 45,
          offered: 12,
          hired: 9,
        },
        byStatus: {
          pending: 68,
          reviewing: 45,
          interviewing: 23,
          offered: 12,
          rejected: 91,
          hired: 9,
        },
        topJobs: [
          { title: "Senior React Developer", applications: 54, interviews: 12 },
          { title: "Product Manager", applications: 38, interviews: 8 },
          { title: "UX Designer", applications: 29, interviews: 6 },
          { title: "DevOps Engineer", applications: 25, interviews: 5 },
        ],
        weeklyTrend: [32, 28, 41, 35, 47, 39, 44],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-[#FFD700]/20 rounded-full animate-pulse" />
          <BarChart3 className="absolute inset-0 m-auto w-6 h-6 text-[#FFD700] animate-pulse" />
        </div>
        <p className="text-gray-400 mt-4 font-mono text-sm tracking-wider">
          LOADING ANALYTICS...
        </p>
      </div>
    );
  }

  const funnelData = analytics?.funnel || {};
  const maxFunnel = Math.max(...Object.values(funnelData));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
            <BarChart3 className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              RECRUITMENT ANALYTICS
            </h2>
            <p className="text-xs text-gray-500 font-mono tracking-wider">
              REAL-TIME HIRING METRICS
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-all ${
                period === p
                  ? "bg-[#FFD700] text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
              }`}
            >
              {p === "7d" ? "7 DAYS" : p === "30d" ? "30 DAYS" : "90 DAYS"}
            </button>
          ))}
          <Button
            onClick={fetchAnalytics}
            size="sm"
            className="bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: "TOTAL APPLICATIONS",
            value: analytics?.overview?.totalApplications || 0,
            change: analytics?.overview?.changePercent,
            color: "blue",
          },
          {
            icon: Briefcase,
            label: "ACTIVE JOBS",
            value: analytics?.overview?.activeJobs || 0,
            color: "[#FFD700]",
          },
          {
            icon: Clock,
            label: "AVG. TIME TO HIRE",
            value: `${analytics?.overview?.avgTimeToHire || 0} days`,
            color: "amber",
          },
          {
            icon: Target,
            label: "OFFER ACCEPT RATE",
            value: `${analytics?.overview?.offerAcceptRate || 0}%`,
            color: "emerald",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-sm bg-${stat.color}-500/10 flex items-center justify-center border border-${stat.color}-500/30`}
                >
                  <Icon className={`w-5 h-5 text-${stat.color}-400`} />
                </div>
                {stat.change !== undefined && (
                  <Badge
                    className={`${stat.change >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"} border font-mono text-[10px]`}
                  >
                    {stat.change >= 0 ? "+" : ""}
                    {stat.change}%
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {stat.value}
              </div>
              <div className="text-[10px] text-gray-500 font-mono tracking-wider mt-1">
                {stat.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Funnel & Status Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Hiring Funnel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-[#FFD700]" />
            <h3 className="text-xs text-gray-500 font-mono tracking-wider">
              HIRING FUNNEL
            </h3>
          </div>

          <div className="space-y-4">
            {[
              { key: "applied", label: "APPLIED", color: "blue" },
              { key: "screened", label: "SCREENED", color: "purple" },
              { key: "interviewed", label: "INTERVIEWED", color: "amber" },
              { key: "offered", label: "OFFERED", color: "emerald" },
              { key: "hired", label: "HIRED", color: "[#FFD700]" },
            ].map((stage, i) => {
              const value = funnelData[stage.key] || 0;
              const width = maxFunnel > 0 ? (value / maxFunnel) * 100 : 0;

              return (
                <div key={stage.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-500 tracking-wider">
                      {stage.label}
                    </span>
                    <span className="text-white">{value}</span>
                  </div>
                  <div className="h-6 bg-white/5 rounded-sm overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-full bg-${stage.color}-500 rounded-sm`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-[#FFD700]" />
            <h3 className="text-xs text-gray-500 font-mono tracking-wider">
              STATUS BREAKDOWN
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "pending", label: "PENDING", color: "gray" },
              { key: "reviewing", label: "REVIEWING", color: "blue" },
              { key: "interviewing", label: "INTERVIEWING", color: "purple" },
              { key: "offered", label: "OFFERED", color: "amber" },
              { key: "rejected", label: "REJECTED", color: "red" },
              { key: "hired", label: "HIRED", color: "emerald" },
            ].map((status) => {
              const value = analytics?.byStatus?.[status.key] || 0;
              return (
                <div
                  key={status.key}
                  className={`p-3 rounded-sm bg-${status.color}-500/10 border border-${status.color}-500/20`}
                >
                  <div
                    className={`text-xl font-bold font-mono text-${status.color}-400`}
                  >
                    {value}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono tracking-wider">
                    {status.label}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Top Jobs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5"
      >
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-[#FFD700]" />
          <h3 className="text-xs text-gray-500 font-mono tracking-wider">
            TOP PERFORMING JOBS
          </h3>
        </div>

        <div className="space-y-3">
          {(analytics?.topJobs || []).map((job, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white/5 rounded-sm border border-white/5 hover:border-[#FFD700]/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] font-bold font-mono text-sm border border-[#FFD700]/30">
                  {index + 1}
                </div>
                <span className="text-white font-medium">{job.title}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm text-white font-mono">
                    {job.applications}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    APPS
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-emerald-400 font-mono">
                    {job.interviews}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    INTERVIEWS
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-[#FFD700] font-mono">
                    {job.applications > 0
                      ? Math.round((job.interviews / job.applications) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    CONV.
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Weekly Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5"
      >
        <h3 className="text-xs text-gray-500 font-mono tracking-wider mb-5">
          WEEKLY APPLICATION TREND
        </h3>

        <div className="flex items-end justify-between h-32 gap-2">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
            (day, index) => {
              const value = analytics?.weeklyTrend?.[index] || 0;
              const maxValue = Math.max(...(analytics?.weeklyTrend || [1]));
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

              return (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center group"
                >
                  <div className="relative w-full flex justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="w-full max-w-[40px] bg-gradient-to-t from-[#FFD700]/30 to-[#FFD700] rounded-t-sm"
                      style={{
                        height: `${height}px`,
                        minHeight: height > 0 ? "4px" : "0",
                      }}
                    />
                    <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-mono bg-[#1a1a1a] px-2 py-1 rounded-sm border border-white/10">
                      {value}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-2">
                    {day}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RecruiterAnalytics;
