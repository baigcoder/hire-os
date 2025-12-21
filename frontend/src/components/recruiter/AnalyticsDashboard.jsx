/**
 * AnalyticsDashboard.jsx
 * Comprehensive analytics dashboard for recruiters
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RECRUITER_ANALYTICS_API_END_POINT } from "@/utils/constant";
import DashboardLoader from "../shared/DashboardLoader";

// Chart-like Bar Component (simulating chart without external library)
const BarChart = ({ data, maxHeight = 150 }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-[150px]">
      {data.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center flex-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(item.value / maxValue) * maxHeight}px` }}
            transition={{ delay: idx * 0.05 }}
            className="w-full rounded-t-sm"
            style={{ backgroundColor: item.color || "#FFD700" }}
          />
          <p className="text-[10px] text-gray-500 mt-2 text-center truncate w-full">
            {item.label}
          </p>
          <p className="text-xs font-mono text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

// Metric Card with trend
const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  color = "#FFD700",
}) => {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-[#111111] border border-white/10 rounded-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-mono">
            {title}
          </p>
          <p className="text-3xl font-bold text-white font-mono mt-2">
            {value}
          </p>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 mt-2 ${isPositive ? "text-[#00FF94]" : "text-red-400"}`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="text-sm font-mono">{Math.abs(change)}%</span>
              <span className="text-gray-600 text-xs">vs last month</span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-sm flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
};

// Source Performance Row
const SourceRow = ({ source, applications, hires, conversionRate }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-3 h-3 rounded-full bg-[#FFD700]" />
      <span className="text-sm text-white capitalize">
        {source.replace("_", " ")}
      </span>
    </div>
    <div className="flex items-center gap-6">
      <div className="text-center">
        <p className="text-xs text-gray-500">Apps</p>
        <p className="text-sm font-mono text-white">{applications}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">Hires</p>
        <p className="text-sm font-mono text-[#00FF94]">{hires}</p>
      </div>
      <div className="w-20">
        <div className="flex items-center gap-2">
          <Progress value={conversionRate} className="h-1.5" />
          <span className="text-xs font-mono text-gray-400">
            {conversionRate}%
          </span>
        </div>
      </div>
    </div>
  </div>
);

// Recruiter Performance Card
const RecruiterCard = ({ recruiter }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 bg-[#0A0A0A] border border-white/10 rounded-sm"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-sm bg-[#FFD700]/10 flex items-center justify-center">
        <span className="text-[#FFD700] font-bold">
          {recruiter.user?.fullname?.[0] || "R"}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">
          {recruiter.user?.fullname}
        </p>
        <p className="text-xs text-gray-500">{recruiter.user?.email}</p>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-2">
      <div className="text-center p-2 bg-white/5 rounded-sm">
        <p className="text-lg font-bold text-white font-mono">
          {recruiter.stats?.jobsPosted || 0}
        </p>
        <p className="text-[10px] text-gray-500">Jobs</p>
      </div>
      <div className="text-center p-2 bg-white/5 rounded-sm">
        <p className="text-lg font-bold text-white font-mono">
          {recruiter.stats?.interviewsConducted || 0}
        </p>
        <p className="text-[10px] text-gray-500">Interviews</p>
      </div>
      <div className="text-center p-2 bg-white/5 rounded-sm">
        <p className="text-lg font-bold text-[#00FF94] font-mono">
          {recruiter.stats?.successfulHires || 0}
        </p>
        <p className="text-[10px] text-gray-500">Hires</p>
      </div>
      <div className="text-center p-2 bg-white/5 rounded-sm">
        <p className="text-lg font-bold text-[#FFD700] font-mono">
          {recruiter.stats?.hireRate || 0}%
        </p>
        <p className="text-[10px] text-gray-500">Rate</p>
      </div>
    </div>
  </motion.div>
);

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [timeToHire, setTimeToHire] = useState(null);
  const [sources, setSources] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, tthRes, sourceRes, funnelRes, recruiterRes] =
        await Promise.all([
          axios.get(`${RECRUITER_ANALYTICS_API_END_POINT}/overview`, {
            withCredentials: true,
          }),
          axios.get(`${RECRUITER_ANALYTICS_API_END_POINT}/time-to-hire`, {
            withCredentials: true,
          }),
          axios.get(`${RECRUITER_ANALYTICS_API_END_POINT}/source`, {
            withCredentials: true,
          }),
          axios.get(`${RECRUITER_ANALYTICS_API_END_POINT}/funnel`, {
            withCredentials: true,
          }),
          axios
            .get(`${RECRUITER_ANALYTICS_API_END_POINT}/recruiter-performance`, {
              withCredentials: true,
            })
            .catch(() => ({ data: { success: false } })),
        ]);

      if (overviewRes.data.success) setOverview(overviewRes.data.overview);
      if (tthRes.data.success) setTimeToHire(tthRes.data.timeToHire);
      if (sourceRes.data.success) setSources(sourceRes.data.sources || []);
      if (funnelRes.data.success) setFunnel(funnelRes.data.funnel || []);
      if (recruiterRes.data.success)
        setRecruiters(recruiterRes.data.recruiters || []);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardLoader type="recruiter" message="LOADING ANALYTICS" />;
  }

  const funnelColors = [
    "#FFD700",
    "#F59E0B",
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#00FF94",
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-[#FFD700]" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Track recruitment performance and metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px] bg-[#111111] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-white/10">
                <SelectItem value="7" className="text-gray-300">
                  Last 7 days
                </SelectItem>
                <SelectItem value="30" className="text-gray-300">
                  Last 30 days
                </SelectItem>
                <SelectItem value="90" className="text-gray-300">
                  Last 90 days
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="border-white/10 text-gray-400"
              onClick={fetchAnalytics}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline" className="border-white/10 text-gray-400">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Applications"
            value={overview?.totalApplications || 0}
            change={overview?.applicationGrowth}
            icon={TrendingUp}
            color="#FFD700"
          />
          <MetricCard
            title="Avg. Time to Hire"
            value={`${timeToHire?.average || 0} days`}
            icon={Clock}
            color="#3B82F6"
          />
          <MetricCard
            title="Hires This Month"
            value={overview?.hiresThisMonth || 0}
            change={overview?.hireGrowth}
            icon={Users}
            color="#00FF94"
          />
          <MetricCard
            title="Response Rate"
            value={`${overview?.responseRate || 0}%`}
            icon={Target}
            color="#8B5CF6"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Funnel Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-[#111111] border border-white/10 rounded-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Application Funnel
                </h3>
                <p className="text-gray-500 text-sm">
                  Conversion through stages
                </p>
              </div>
            </div>

            <BarChart
              data={funnel.map((stage, idx) => ({
                label: stage.stage,
                value: stage.count,
                color: funnelColors[idx % funnelColors.length],
              }))}
            />

            {/* Conversion rates */}
            <div className="mt-6 grid grid-cols-5 gap-2">
              {funnel.slice(1).map((stage, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-xs text-gray-500">{stage.stage}</p>
                  <p className="text-sm font-mono text-[#FFD700]">
                    {stage.conversionRate}%
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Time to Hire */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 bg-[#111111] border border-white/10 rounded-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Time to Hire</h3>
                <p className="text-gray-500 text-sm">
                  Days from application to hire
                </p>
              </div>
              <Badge className="bg-[#FFD700]/10 text-[#FFD700] font-mono">
                {timeToHire?.totalHires || 0} hires
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-sm text-center">
                <p className="text-3xl font-bold text-white font-mono">
                  {timeToHire?.average || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Average Days</p>
              </div>
              <div className="p-4 bg-white/5 rounded-sm text-center">
                <p className="text-3xl font-bold text-[#00FF94] font-mono">
                  {timeToHire?.fastest || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Fastest Hire</p>
              </div>
            </div>

            {/* By Job */}
            {timeToHire?.byJob?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                  By Job
                </p>
                <div className="space-y-2">
                  {timeToHire.byJob.slice(0, 4).map((job, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-white/5"
                    >
                      <span className="text-sm text-gray-300 truncate max-w-[60%]">
                        {job.job}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {job.hires} hires
                        </span>
                        <span className="text-sm font-mono text-[#FFD700]">
                          {job.averageDays}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Source Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-[#111111] border border-white/10 rounded-sm mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                Application Sources
              </h3>
              <p className="text-gray-500 text-sm">
                Where your candidates come from
              </p>
            </div>
          </div>

          {sources.length > 0 ? (
            <div>
              {sources.map((source, idx) => (
                <SourceRow
                  key={idx}
                  source={source.source}
                  applications={source.applications}
                  hires={source.hires}
                  conversionRate={source.conversionRate}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No source data available
            </p>
          )}
        </motion.div>

        {/* Recruiter Performance */}
        {recruiters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 bg-[#111111] border border-white/10 rounded-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Recruiter Performance
                </h3>
                <p className="text-gray-500 text-sm">
                  Individual metrics for team members
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recruiters.map((recruiter) => (
                <RecruiterCard key={recruiter._id} recruiter={recruiter} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
