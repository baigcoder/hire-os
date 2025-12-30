import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Briefcase,
  Plus,
  Search,
  TrendingUp,
  Users,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Terminal,
  Filter,
  ChevronRight,
  Zap,
  Target,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import Navbar from "../shared/Navbar";
import AdminJobsTable from "./AdminJobsTable";
import useGetAllAdminJobs from "@/hooks/useGetAllAdminJobs";
import { setSearchJobByText } from "@/redux/jobSlice";

// Industrial Live Status Indicator
const LiveIndicator = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00FF94]/10 border border-[#00FF94]/20 rounded-sm">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF94]"></span>
    </span>
    <span className="text-[#00FF94] text-xs font-mono uppercase tracking-wider">
      Live Data
    </span>
  </div>
);

// Industrial Stat Card
const StatCard = ({ label, value, subtext, icon: Icon, delay = 0, color = "#FFD700", trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="relative p-5 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-all duration-300"
  >
    <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />
    <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />

    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">{label}</p>
        <p className="text-2xl font-bold text-white font-mono">{value}</p>
        {subtext && (
          <p className={`text-[10px] mt-1 font-mono ${trend === 'up' ? 'text-[#00FF94]' : trend === 'down' ? 'text-red-400' : 'text-gray-600'}`}>
            {subtext}
          </p>
        )}
      </div>
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center border"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
  </motion.div>
);

// Application Funnel Card
const ApplicationFunnel = ({ data }) => {
  const funnelData = [
    { stage: "Applied", count: data.total || 0, color: "#FFD700" },
    { stage: "Reviewed", count: data.reviewed || 0, color: "#3B82F6" },
    { stage: "Interview", count: data.interview || 0, color: "#8B5CF6" },
    { stage: "Hired", count: data.hired || 0, color: "#00FF94" },
  ];

  const maxCount = Math.max(...funnelData.map(d => d.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative p-5 bg-[#111111] border border-white/10 rounded-sm"
    >
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10" />
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-[#FFD700]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Application Pipeline</h3>
      </div>
      <div className="space-y-3">
        {funnelData.map((item, idx) => (
          <div key={item.stage}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 font-mono uppercase">{item.stage}</span>
              <span className="text-xs font-mono text-white">{item.count}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-sm overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.count / maxCount) * 100}%` }}
                transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
                className="h-full rounded-sm"
                style={{ backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Job Type Distribution Chart
const JobTypeChart = ({ jobs }) => {
  const typeData = useMemo(() => {
    const counts = {};
    jobs.forEach(job => {
      const type = job.jobType || "Other";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const COLORS = ["#FFD700", "#00FF94", "#3B82F6", "#8B5CF6", "#EC4899", "#F97316"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="relative p-5 bg-[#111111] border border-white/10 rounded-sm"
    >
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10" />
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-[#FFD700]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Jobs by Type</h3>
      </div>
      {typeData.length > 0 ? (
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111111",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "2px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[140px] flex items-center justify-center text-gray-600 text-xs font-mono">
          No jobs posted yet
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {typeData.slice(0, 4).map((item, idx) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
            <span className="text-[10px] text-gray-500 font-mono">{item.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Quick Action Card
const QuickActionCard = ({ icon: Icon, label, description, onClick, color = "#FFD700" }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="relative p-4 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/50 transition-all duration-300 text-left w-full"
  >
    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10 group-hover:border-[#FFD700]/50 transition-colors" />
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center border"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[10px] text-gray-500 font-mono">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#FFD700] transition-colors" />
    </div>
  </motion.button>
);

const AdminJobs = () => {
  useGetAllAdminJobs();
  const [input, setInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { allAdminJobs } = useSelector((store) => store.job);

  useEffect(() => {
    dispatch(setSearchJobByText(input));
  }, [input, dispatch]);

  // Calculate stats
  const stats = useMemo(() => {
    const jobs = allAdminJobs || [];
    const activeJobs = jobs.filter(j => j.isActive !== false).length;
    const totalViews = jobs.reduce((sum, j) => sum + (j.views || 0), 0);
    const totalApplications = jobs.reduce((sum, j) => sum + (j.applications?.length || 0), 0);
    const pendingApplications = jobs.reduce((sum, j) =>
      sum + (j.applications?.filter(a => a.status === 'pending')?.length || 0), 0);

    return {
      total: jobs.length,
      active: activeJobs,
      inactive: jobs.length - activeJobs,
      views: totalViews,
      applications: totalApplications,
      pending: pendingApplications,
    };
  }, [allAdminJobs]);

  // Application pipeline stats
  const pipelineStats = useMemo(() => {
    const jobs = allAdminJobs || [];
    let total = 0, reviewed = 0, interview = 0, hired = 0;

    jobs.forEach(job => {
      (job.applications || []).forEach(app => {
        total++;
        if (['reviewed', 'shortlisted'].includes(app.status)) reviewed++;
        if (['interview', 'video_scheduled', 'video_completed'].includes(app.status)) interview++;
        if (app.status === 'hired') hired++;
      });
    });

    return { total, reviewed, interview, hired };
  }, [allAdminJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFD700] rounded-sm flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
                Job Management
              </h1>
              <p className="text-gray-500 text-sm font-mono">
                {stats.total} total jobs • {stats.active} active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LiveIndicator />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-white/10 text-gray-400 hover:bg-white/5 rounded-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {user?.role !== "recruiter" && (
              <Button
                onClick={() => navigate("/admin/jobs/create")}
                className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post Job
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Jobs"
            value={stats.total}
            subtext={`${stats.active} active`}
            icon={Briefcase}
            delay={0.1}
            color="#FFD700"
          />
          <StatCard
            label="Total Views"
            value={stats.views.toLocaleString()}
            subtext="All time"
            icon={Eye}
            delay={0.15}
            color="#3B82F6"
          />
          <StatCard
            label="Applications"
            value={stats.applications}
            subtext={`${stats.pending} pending`}
            icon={Users}
            delay={0.2}
            color="#8B5CF6"
            trend={stats.pending > 0 ? 'up' : undefined}
          />
          <StatCard
            label="Conversion"
            value={stats.applications > 0 ? `${Math.round((pipelineStats.hired / stats.applications) * 100)}%` : '0%'}
            subtext="Application to hire"
            icon={TrendingUp}
            delay={0.25}
            color="#00FF94"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ApplicationFunnel data={pipelineStats} />
          <JobTypeChart jobs={allAdminJobs || []} />

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#FFD700]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h3>
            </div>
            {user?.role !== "recruiter" && (
              <QuickActionCard
                icon={Plus}
                label="Post New Job"
                description="Create a job listing"
                onClick={() => navigate("/admin/jobs/create")}
              />
            )}
            <QuickActionCard
              icon={Users}
              label="View All Applicants"
              description="Review candidates"
              onClick={() => navigate("/admin/applications")}
              color="#8B5CF6"
            />
            <QuickActionCard
              icon={Activity}
              label="Analytics"
              description="View detailed stats"
              onClick={() => navigate("/admin/analytics")}
              color="#00FF94"
            />
          </motion.div>
        </div>

        {/* Search & Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-[#111111] border border-white/10 rounded-sm p-5 relative"
        >
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/10" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#FFD700]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Posted Jobs
              </h2>
              <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 rounded-sm text-[10px] ml-2">
                {allAdminJobs?.length || 0}
              </Badge>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search jobs..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="pl-10 bg-[#0A0A0A] border-white/10 text-white rounded-sm font-mono text-sm placeholder:text-gray-600"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-gray-400 hover:bg-white/5 rounded-sm"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <AdminJobsTable />
        </motion.div>
      </div>
    </div>
  );
};

export default AdminJobs;
