/**
 * RecruiterDashboardEnhanced.jsx
 * Comprehensive recruiter dashboard with real-time analytics
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  Target,
  Zap,
  Calendar,
  Mail,
  BarChart3,
  FileText,
  Video,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Bell,
  Settings,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  UserCheck,
  Building2,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import DashboardLoader from "../shared/DashboardLoader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  RECRUITER_ANALYTICS_API_END_POINT,
  COMPANY_API_END_POINT,
} from "@/utils/constant";
import { supabaseRealtime } from "@/lib/supabase";

// Animated stat card component
const StatCard = ({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  delay = 0,
}) => {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative p-6 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-2">
            {label}
          </p>
          <p className="text-3xl font-bold text-white font-mono">{value}</p>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? "text-[#00FF94]" : "text-red-400"}`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="font-mono">{Math.abs(change)}%</span>
              <span className="text-gray-600 text-xs">{changeLabel}</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-sm flex items-center justify-center border`}
          style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
};

// Pipeline Stage Component
const PipelineStage = ({ stage, count, conversionRate, color, isLast }) => (
  <div className="flex items-center">
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-16 rounded-sm flex items-center justify-center text-lg font-bold text-black"
        style={{ backgroundColor: color }}
      >
        {count}
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center max-w-[80px]">
        {stage}
      </p>
      {conversionRate > 0 && (
        <p className="text-[10px] text-[#FFD700] font-mono mt-1">
          {conversionRate}%
        </p>
      )}
    </div>
    {!isLast && (
      <div className="w-8 h-0.5 bg-gradient-to-r from-white/20 to-white/5 mx-1" />
    )}
  </div>
);

// Activity Item Component
const ActivityItem = ({ activity, isNew = false }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case "new_application":
        return { icon: FileText, color: "#FFD700" };
      case "status_change":
        return { icon: RefreshCw, color: "#00FF94" };
      case "interview_scheduled":
        return { icon: Calendar, color: "#3B82F6" };
      default:
        return { icon: Activity, color: "#9CA3AF" };
    }
  };

  const { icon: Icon, color } = getActivityIcon(activity.type);

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={`flex items-start gap-3 p-3 hover:bg-white/5 rounded-sm transition-colors ${isNew ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' : ''}`}
    >
      <div
        className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Avatar className="w-5 h-5">
            <AvatarImage src={activity.applicant?.photo} />
            <AvatarFallback className="text-[8px] bg-[#FFD700]/10 text-[#FFD700]">
              {activity.applicant?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white truncate">
            {activity.applicant?.name}
          </span>
          {isNew && (
            <Badge className="bg-[#FFD700] text-black text-[8px] px-1 py-0">NEW</Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {activity.type === "new_application"
            ? "Applied for"
            : "Updated status on"}
          <span className="text-[#FFD700] ml-1">{activity.job}</span>
        </p>
        <p className="text-[10px] text-gray-600 font-mono mt-1">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
      <Badge
        className={`text-[10px] rounded-sm ${activity.status === "hired"
          ? "bg-[#00FF94]/10 text-[#00FF94]"
          : activity.status === "rejected"
            ? "bg-red-500/10 text-red-400"
            : activity.status === "interview"
              ? "bg-blue-500/10 text-blue-400"
              : "bg-[#FFD700]/10 text-[#FFD700]"
          }`}
      >
        {activity.status}
      </Badge>
    </motion.div>
  );
};

const RecruiterDashboardEnhanced = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [activities, setActivities] = useState([]);
  const [companyData, setCompanyData] = useState(null);
  const [newActivityIds, setNewActivityIds] = useState(new Set());
  const channelRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time application updates
    const setupRealtimeSubscription = () => {
      const companyId = user?.companyId;
      if (!companyId) return;

      // Channel name based on company ID
      const channelName = `recruiter-dashboard-${companyId}`;

      channelRef.current = supabaseRealtime.subscribe(channelName, {
        onBroadcast: {
          // Listen for new applications
          new_application: (payload) => {
            console.log("📬 New application received:", payload);

            // Show toast notification
            toast.success(`🎉 New Application!`, {
              description: `${payload.applicantName} applied for ${payload.jobTitle}`,
              duration: 5000,
              action: {
                label: "View",
                onClick: () => navigate(`/admin/jobs/${payload.jobId}/applicants`),
              },
            });

            // Add to activities with "new" flag
            const newActivity = {
              type: "new_application",
              applicant: { name: payload.applicantName },
              job: payload.jobTitle,
              status: "pending",
              timestamp: new Date().toISOString(),
              _id: payload.applicationId,
            };

            setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
            setNewActivityIds(prev => new Set([...prev, payload.applicationId]));

            // Update overview counts
            setOverview(prev => prev ? {
              ...prev,
              totalApplications: (prev.totalApplications || 0) + 1,
              pendingApplications: (prev.pendingApplications || 0) + 1,
            } : prev);

            // Update funnel (first stage)
            setFunnel(prev => {
              if (prev.length > 0) {
                const updated = [...prev];
                updated[0] = { ...updated[0], count: (updated[0].count || 0) + 1 };
                return updated;
              }
              return prev;
            });

            // Clear "new" flag after 10 seconds
            setTimeout(() => {
              setNewActivityIds(prev => {
                const updated = new Set(prev);
                updated.delete(payload.applicationId);
                return updated;
              });
            }, 10000);
          },
        },
        onSubscribe: (status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ Subscribed to real-time updates:", channelName);
          }
        },
      });
    };

    setupRealtimeSubscription();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabaseRealtime.removeChannel(channelRef.current);
      }
    };
  }, [user?.companyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, funnelRes, activityRes, companyRes] =
        await Promise.all([
          axios.get(`${RECRUITER_ANALYTICS_API_END_POINT}/overview`, {
            withCredentials: true,
          }),
          axios.get(`${RECRUITER_ANALYTICS_API_END_POINT}/funnel`, {
            withCredentials: true,
          }),
          axios.get(`${RECRUITER_ANALYTICS_API_END_POINT}/activity?limit=10`, {
            withCredentials: true,
          }),
          axios.get(`${COMPANY_API_END_POINT}/dashboard`, {
            withCredentials: true,
          }),
        ]);

      if (overviewRes.data.success) setOverview(overviewRes.data.overview);
      if (funnelRes.data.success) setFunnel(funnelRes.data.funnel);
      if (activityRes.data.success) setActivities(activityRes.data.activities);
      if (companyRes.data.success) setCompanyData(companyRes.data.company);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLoader
        type="recruiter"
        message="LOADING RECRUITER DASHBOARD..."
      />
    );
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
      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-10 gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#FFD700] rounded-sm flex items-center justify-center">
              {companyData?.logo ? (
                <img
                  src={companyData.logo}
                  alt="Company"
                  className="w-full h-full object-cover rounded-sm"
                />
              ) : (
                <Building2 className="w-8 h-8 text-black" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {companyData?.name || "Recruiter Dashboard"}
              </h1>
              <p className="text-gray-500 font-mono text-sm mt-1">
                Welcome back, {user?.fullname || "Recruiter"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-white/10 text-gray-400 hover:bg-white/5 rounded-sm"
              onClick={fetchDashboardData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => navigate("/admin/jobs/create")}
              className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post Job
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Active Jobs"
            value={overview?.activeJobs || 0}
            icon={Briefcase}
            color="#FFD700"
            delay={0.1}
          />
          <StatCard
            label="Total Applications"
            value={overview?.totalApplications || 0}
            change={overview?.applicationGrowth}
            changeLabel="this month"
            icon={FileText}
            color="#3B82F6"
            delay={0.15}
          />
          <StatCard
            label="Interviews Scheduled"
            value={overview?.interviewsScheduled || 0}
            change={overview?.interviewsThisMonth}
            changeLabel="completed"
            icon={Video}
            color="#8B5CF6"
            delay={0.2}
          />
          <StatCard
            label="Hires This Month"
            value={overview?.hiresThisMonth || 0}
            change={overview?.hireGrowth}
            changeLabel="vs last month"
            icon={UserCheck}
            color="#00FF94"
            delay={0.25}
          />
        </div>

        {/* Application Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative p-6 bg-[#111111] border border-white/10 rounded-sm mb-10"
        >
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/10" />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Application Funnel
              </h2>
              <p className="text-gray-500 text-sm">
                Track candidates through hiring stages
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-[#FFD700]">
              View Details <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center justify-between overflow-x-auto pb-4">
            {funnel.map((stage, idx) => (
              <PipelineStage
                key={stage.stage}
                stage={stage.stage}
                count={stage.count}
                conversionRate={stage.conversionRate}
                color={funnelColors[idx % funnelColors.length]}
                isLast={idx === funnel.length - 1}
              />
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FFD700]" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    icon: Briefcase,
                    label: "View Jobs",
                    path: "/admin/jobs",
                    color: "#FFD700",
                  },
                  {
                    icon: FileText,
                    label: "Applications",
                    path: "/admin/applications",
                    color: "#3B82F6",
                  },
                  {
                    icon: Mail,
                    label: "Email Templates",
                    path: "/admin/email-templates",
                    color: "#8B5CF6",
                  },
                  {
                    icon: BarChart3,
                    label: "Analytics",
                    path: "/admin/analytics",
                    color: "#00FF94",
                  },
                ].map((action, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => navigate(action.path)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className="relative p-4 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/50 transition-all duration-300 flex flex-col items-center justify-center gap-2"
                  >
                    <action.icon
                      className="w-6 h-6 group-hover:scale-110 transition-transform"
                      style={{ color: action.color }}
                    />
                    <span className="text-xs font-mono uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative p-6 bg-[#111111] border border-white/10 rounded-sm"
            >
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-white/10" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FFD700]" />
                  Recent Activity
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-white"
                >
                  View All
                </Button>
              </div>

              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {activities.length > 0 ? (
                  activities.map((activity, idx) => (
                    <ActivityItem
                      key={activity._id || idx}
                      activity={activity}
                      isNew={newActivityIds.has(activity._id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Response Rate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="relative p-6 bg-[#111111] border border-white/10 rounded-sm"
            >
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10" />

              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FFD700]" />
                Response Rate
              </h3>

              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-white/10"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#FFD700"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(overview?.responseRate || 0) * 3.52} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white font-mono">
                    {overview?.responseRate || 0}%
                  </span>
                </div>
              </div>

              <p className="text-center text-gray-500 text-sm">
                of applications reviewed
              </p>
            </motion.div>

            {/* Pending Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="relative p-6 bg-[#111111] border border-[#FFD700]/30 rounded-sm"
            >
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />

              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FFD700]" />
                Pending Actions
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-[#FFD700]/10 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-[#FFD700]" />
                    </div>
                    <span className="text-sm text-gray-300">
                      Applications to Review
                    </span>
                  </div>
                  <Badge className="bg-[#FFD700] text-black font-bold">
                    {overview?.pendingApplications || 0}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-blue-500/10 flex items-center justify-center">
                      <Video className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-300">
                      Upcoming Interviews
                    </span>
                  </div>
                  <Badge className="bg-blue-500 text-white font-bold">
                    {overview?.interviewsScheduled || 0}
                  </Badge>
                </div>
              </div>

              <Button
                className="w-full mt-4 bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold"
                onClick={() => navigate("/admin/applications?status=pending")}
              >
                Review Applications
              </Button>
            </motion.div>

            {/* Team Size */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="relative p-6 bg-[#111111] border border-white/10 rounded-sm"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FFD700]" />
                Team
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white font-mono">
                    {overview?.teamSize || 0}
                  </p>
                  <p className="text-gray-500 text-sm">Active Recruiters</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-gray-400"
                  onClick={() => navigate("/admin/team")}
                >
                  Manage Team
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboardEnhanced;
