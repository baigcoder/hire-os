/**
 * CEODashboard - Executive-level dashboard with KPIs, analytics, and approvals
 * Hire.iOS Industrial Theme
 * Now with real-time Supabase updates and AI-generated insights
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { supabase, supabaseRealtime } from "../../lib/supabase";
import {
  Users,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Award,
  Target,
  DollarSign,
  Calendar,
  ChevronRight,
  Building,
  Star,
  Zap,
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  FileText,
  Loader2,
  RefreshCw,
  Filter,
  Sparkles,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  UserCheck,
  Brain,
  Wifi,
  WifiOff,
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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import Navbar from "../shared/Navbar";
import SubscriptionPanel from "../shared/SubscriptionPanel";
import DashboardLoader from "../shared/DashboardLoader";
import InterviewReports from "./InterviewReports";
import RealtimeNotifications from "../shared/RealtimeNotifications";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const CEODashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Real-time connection state
  const [isConnected, setIsConnected] = useState(false);
  const [noCompany, setNoCompany] = useState(false);

  // Dashboard data states
  const [stats, setStats] = useState({
    openPositions: 0,
    pendingApprovals: 0,
    hiresThisMonth: 0,
    avgTimeToHire: 0,
    offerAcceptanceRate: 0,
    activeRecruiters: 0,
  });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recruiterPerformance, setRecruiterPerformance] = useState([]);
  const [hiringTrends, setHiringTrends] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Approval modal state
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [ceoNotes, setCeoNotes] = useState("");
  const [processingDecision, setProcessingDecision] = useState(false);

  // Initialize Supabase Realtime connection
  useEffect(() => {
    if (!user?.companyId && !user?._id) return;

    const channelName = `ceo-dashboard:${user?.companyId || user?._id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Real-time event handlers
    channel.on("broadcast", { event: "new-application" }, ({ payload }) => {
      toast.info(
        `New Application: ${payload.data?.applicantName} applied for ${payload.data?.jobTitle}`,
        {
          duration: 5000,
          icon: "📥",
        },
      );
      fetchExecutiveStats();
    });

    channel.on("broadcast", { event: "new-approval" }, ({ payload }) => {
      toast.success(
        `Pending Approval: ${payload.data?.applicantName} for ${payload.data?.jobTitle}`,
        {
          duration: 5000,
          icon: "👑",
        },
      );
      fetchPendingApprovals();
      fetchExecutiveStats();
    });

    channel.on("broadcast", { event: "stats-update" }, ({ payload }) => {
      setStats((prev) => ({ ...prev, ...payload.data }));
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        console.log("📊 CEO Dashboard connected to Supabase Realtime");
      } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
        setIsConnected(false);
      }
    });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user?.companyId, user?._id]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchExecutiveStats(),
        fetchPendingApprovals(),
        fetchRecruiterPerformance(),
        fetchHiringTrends(),
        fetchAIInsights(),
      ]);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI-generated hiring insights
  const fetchAIInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/insights/hiring`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setAiInsights(res.data.insights);
      }
    } catch (error) {
      console.error("AI Insights fetch error:", error);
      // Set fallback insights
      setAiInsights({
        executiveSummary:
          "AI insights are currently unavailable. Check back later for hiring analytics.",
        performanceRating: "Unavailable",
        keyHighlights: [],
        actionItems: ["Refresh to retry loading insights"],
        aiPowered: false,
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const fetchExecutiveStats = async () => {
    try {
      // Fetch from multiple endpoints and aggregate
      const [jobsRes, statsRes] = await Promise.all([
        axios
          .get(`${API_BASE}/job/getadminjobs`, { withCredentials: true })
          .catch(() => ({ data: { jobs: [] } })),
        axios
          .get(`${API_BASE}/company/dashboard`, { withCredentials: true })
          .catch(() => ({ data: {} })),
      ]);

      const jobs = jobsRes?.data?.jobs || [];
      const dashData = statsRes?.data?.company || statsRes?.data || {};

      // Calculate stats from real data
      const openJobs = jobs.filter(
        (j) => j.status !== "closed" && j.isActive !== false,
      ).length;
      const pending = dashData.pendingApprovals?.length || 0;
      const hires = dashData.usage?.hiresThisMonth || 0;
      const avgTime = dashData.avgTimeToHire || 0;
      const offerRate = dashData.offerAcceptanceRate || 0;
      const recruiters = dashData.recruitersCount || 0;

      setStats({
        openPositions: openJobs,
        pendingApprovals: pending,
        hiresThisMonth: hires,
        avgTimeToHire: avgTime,
        offerAcceptanceRate: offerRate,
        activeRecruiters: recruiters,
      });

      // Calculate department stats from jobs
      const deptMap = {};
      jobs.forEach((job) => {
        const dept = job.department || "General";
        if (!deptMap[dept])
          deptMap[dept] = { name: dept, open: 0, filled: 0, pending: 0 };
        if (job.status === "closed") deptMap[dept].filled++;
        else if (job.applications?.length > 0) deptMap[dept].pending++;
        else deptMap[dept].open++;
      });
      const deptStats = Object.values(deptMap).slice(0, 4);
      setDepartmentStats(
        deptStats.length > 0
          ? deptStats
          : [{ name: "No departments yet", open: 0, filled: 0, pending: 0 }],
      );
    } catch (error) {
      console.error("Stats fetch error:", error);
      // Check if error is due to missing company
      if (
        error.response?.status === 404 &&
        error.response?.data?.message?.includes("Company not found")
      ) {
        setNoCompany(true);
      }
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const res = await axios.get(`${API_BASE}/company/pending-approvals`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setPendingApprovals(res.data.pendingApprovals || []);
      }
    } catch (error) {
      // Mock data for demo
      setPendingApprovals([
        {
          _id: "1",
          applicant: {
            fullname: "John Smith",
            email: "john@example.com",
            profile: { profilePhoto: "" },
          },
          job: {
            title: "Senior Software Engineer",
            company: { name: "TechCorp" },
          },
          status: "pending_ceo_approval",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          recruiterScore: 92,
          interviewScore: 88,
          urgency: "high",
        },
        {
          _id: "2",
          applicant: {
            fullname: "Sarah Johnson",
            email: "sarah@example.com",
            profile: { profilePhoto: "" },
          },
          job: { title: "Product Manager", company: { name: "TechCorp" } },
          status: "pending_ceo_approval",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          recruiterScore: 85,
          interviewScore: 90,
          urgency: "medium",
        },
      ]);
    }
  };

  const fetchRecruiterPerformance = async () => {
    try {
      // Try to fetch real performance data first
      const perfRes = await axios
        .get(`${API_BASE}/company/recruiter-performance`, {
          withCredentials: true,
        })
        .catch(() => null);

      if (perfRes?.data?.success) {
        setRecruiterPerformance(perfRes.data.recruiters || []);
        return;
      }

      // Fallback to recruiters list with calculated metrics
      const res = await axios.get(`${API_BASE}/company/recruiters`, {
        withCredentials: true,
      });
      if (res.data.success) {
        const recruiters = (res.data.recruiters || []).map((r) => ({
          ...r,
          positionsFilled: r.performance?.positionsFilled || 0,
          avgTimeToFill: r.performance?.avgTimeToFill || 0,
          qualityScore: r.performance?.qualityScore || 0,
          activeInterviews: r.activeInterviews || 0,
        }));
        setRecruiterPerformance(recruiters);
      }
    } catch (error) {
      console.error("Recruiter performance fetch error:", error);
      setRecruiterPerformance([]);
    }
  };

  const fetchHiringTrends = async () => {
    try {
      // Try to fetch real stats
      const res = await axios
        .get(`${API_BASE}/stats/applications`, {
          params: { period: "30d" },
          withCredentials: true,
        })
        .catch(() => null);

      if (res?.data?.success && res.data.byDate) {
        // Group by week
        const weeklyData = res.data.byDate.reduce((acc, day, idx) => {
          const weekNum = Math.floor(idx / 7);
          if (!acc[weekNum])
            acc[weekNum] = {
              week: `W${weekNum + 1}`,
              applications: 0,
              interviews: 0,
              hires: 0,
            };
          acc[weekNum].applications += day.count || 0;
          return acc;
        }, []);
        setHiringTrends(Object.values(weeklyData).slice(0, 4));
        return;
      }

      // Empty state - no data available
      setHiringTrends([
        { week: "W1", applications: 0, interviews: 0, hires: 0 },
        { week: "W2", applications: 0, interviews: 0, hires: 0 },
        { week: "W3", applications: 0, interviews: 0, hires: 0 },
        { week: "W4", applications: 0, interviews: 0, hires: 0 },
      ]);
    } catch (error) {
      console.error("Hiring trends fetch error:", error);
      setHiringTrends([]);
    }
  };

  const handleApprovalDecision = async (applicationId, decision) => {
    setProcessingDecision(true);
    try {
      const res = await axios.post(
        `${API_BASE}/company/candidates/${applicationId}/approve`,
        { decision, notes: ceoNotes },
        { withCredentials: true },
      );

      if (res.data.success) {
        toast.success(
          `Candidate ${decision === "approved" ? "Approved" : "Rejected"} successfully`,
        );
        setSelectedApproval(null);
        setCeoNotes("");
        fetchPendingApprovals();
        fetchExecutiveStats();
      }
    } catch (error) {
      toast.error("Failed to process decision");
    } finally {
      setProcessingDecision(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const formatDate = (date) => {
    const diff = Math.floor(
      (new Date() - new Date(date)) / (1000 * 60 * 60 * 24),
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff}d ago`;
  };

  // Executive KPI Cards
  const kpiCards = [
    {
      label: "Open Positions",
      value: stats.openPositions,
      icon: Briefcase,
      trend: "+3",
      trendUp: true,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      label: "Pending Approvals",
      value: pendingApprovals.length,
      icon: Clock,
      trend: pendingApprovals.length > 0 ? "Action Required" : "All Clear",
      urgent: pendingApprovals.length > 0,
      color: "text-[#FFD700]",
      bgColor: "bg-[#FFD700]/10",
      borderColor: "border-[#FFD700]/30",
    },
    {
      label: "Hires This Month",
      value: stats.hiresThisMonth,
      icon: UserCheck,
      trend: "+5",
      trendUp: true,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    },
    {
      label: "Avg Time-to-Hire",
      value: `${stats.avgTimeToHire}d`,
      icon: Timer,
      trend: "-2d",
      trendUp: true,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
    },
    {
      label: "Offer Acceptance",
      value: `${stats.offerAcceptanceRate}%`,
      icon: Target,
      trend: "+8%",
      trendUp: true,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/30",
    },
    {
      label: "Active Recruiters",
      value: stats.activeRecruiters,
      icon: Users,
      trend: "Optimal",
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/30",
    },
  ];

  if (loading) {
    return (
      <DashboardLoader type="admin" message="LOADING EXECUTIVE DASHBOARD..." />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFD700]/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-8 relative z-10 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FFD700]/20 to-amber-600/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
              <Crown className="w-7 h-7 text-[#FFD700]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                EXECUTIVE DASHBOARD
              </h1>
              <p className="text-gray-500 text-sm font-mono tracking-wider">
                Welcome back, {user?.fullname?.split(" ")[0] || "CEO"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Real-time connection indicator */}
            <Badge
              className={`${isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"} border px-3 py-1.5`}
            >
              {isConnected ? (
                <Wifi className="w-3 h-3 mr-1.5" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1.5" />
              )}
              {isConnected ? "LIVE" : "OFFLINE"}
            </Badge>
            <RealtimeNotifications />
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={refreshing}
              className="border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* No Company Warning Banner */}
        {noCompany && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-sm bg-[#FFD700]/20 flex items-center justify-center">
                <Building className="w-6 h-6 text-[#FFD700]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[#FFD700] font-bold text-lg">
                  Complete Company Setup
                </h3>
                <p className="text-[#FFD700]/70 text-sm">
                  You need to register your company to access the full dashboard
                  and start posting jobs.
                </p>
              </div>
              <Button
                onClick={() => navigate("/company/pricing")}
                className="bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold"
              >
                Setup Company
              </Button>
            </div>
          </motion.div>
        )}

        {/* Executive KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {kpiCards.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-[#111111] border ${kpi.urgent ? "border-[#FFD700]/50 animate-pulse" : "border-white/10"} rounded-sm p-4 hover:border-[#FFD700]/30 transition-all group cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2 rounded-sm ${kpi.bgColor} border ${kpi.borderColor}`}
                >
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {kpi.trend && (
                  <span
                    className={`text-[10px] font-mono flex items-center gap-0.5 ${kpi.trendUp
                      ? "text-emerald-400"
                      : kpi.urgent
                        ? "text-[#FFD700]"
                        : "text-gray-500"
                      }`}
                  >
                    {kpi.trendUp && <ArrowUpRight className="w-3 h-3" />}
                    {kpi.trend}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-1 font-mono">
                {kpi.value}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                {kpi.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-[#111111] border border-white/10 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black font-mono text-xs"
            >
              OVERVIEW
            </TabsTrigger>
            <TabsTrigger
              value="approvals"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black font-mono text-xs"
            >
              APPROVALS ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black font-mono text-xs"
            >
              TEAM PERFORMANCE
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black font-mono text-xs"
            >
              INTERVIEW REPORTS
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hiring Pipeline Summary */}
              <div className="lg:col-span-2 bg-[#111111] border border-white/10 rounded-sm p-6">
                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#FFD700]" />
                  HIRING PIPELINE BY DEPARTMENT
                </h3>
                <div className="space-y-4">
                  {departmentStats.map((dept, idx) => (
                    <div key={dept.name} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300 font-mono">
                          {dept.name}
                        </span>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-blue-400">
                            {dept.open} Open
                          </span>
                          <span className="text-emerald-400">
                            {dept.filled} Filled
                          </span>
                          <span className="text-amber-400">
                            {dept.pending} Pending
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div
                          className="bg-emerald-500/50 rounded-sm transition-all group-hover:bg-emerald-500"
                          style={{
                            width: `${(dept.filled / (dept.open + dept.filled + dept.pending)) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-blue-500/50 rounded-sm transition-all group-hover:bg-blue-500"
                          style={{
                            width: `${(dept.open / (dept.open + dept.filled + dept.pending)) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-amber-500/50 rounded-sm transition-all group-hover:bg-amber-500"
                          style={{
                            width: `${(dept.pending / (dept.open + dept.filled + dept.pending)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Approvals */}
              <div className="bg-[#111111] border border-white/10 rounded-sm p-6">
                <h3 className="text-white font-bold mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#FFD700]" />
                    URGENT APPROVALS
                  </span>
                  {pendingApprovals.length > 0 && (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 animate-pulse">
                      {pendingApprovals.length} Waiting
                    </Badge>
                  )}
                </h3>

                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-500 text-sm font-mono">
                      All caught up!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovals.slice(0, 3).map((approval) => (
                      <div
                        key={approval._id}
                        className="p-3 bg-white/5 border border-white/10 rounded-sm hover:border-[#FFD700]/30 transition-all cursor-pointer group"
                        onClick={() => setSelectedApproval(approval)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-white/10">
                            <AvatarFallback className="bg-[#FFD700]/10 text-[#FFD700] text-sm font-bold">
                              {approval.applicant?.fullname?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-sm font-medium truncate">
                                {approval.applicant?.fullname}
                              </span>
                              <Badge
                                className={getUrgencyColor(approval.urgency)}
                              >
                                {approval.urgency?.toUpperCase() || "PENDING"}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {approval.job?.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                          <span className="text-[10px] text-gray-500 font-mono">
                            {formatDate(approval.createdAt)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              className="h-6 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprovalDecision(
                                  approval._id,
                                  "approved",
                                );
                              }}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 px-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprovalDecision(
                                  approval._id,
                                  "rejected",
                                );
                              }}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingApprovals.length > 3 && (
                      <Button
                        variant="ghost"
                        className="w-full text-[#FFD700] hover:bg-[#FFD700]/10"
                        onClick={() => setActiveTab("approvals")}
                      >
                        View All ({pendingApprovals.length}){" "}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Subscription Panel */}
              <SubscriptionPanel />
            </div>

            {/* Weekly Hiring Trends */}
            <div className="bg-[#111111] border border-white/10 rounded-sm p-6">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#FFD700]" />
                WEEKLY HIRING TRENDS
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {hiringTrends.map((week, idx) => (
                  <div key={week.week} className="text-center">
                    <div className="text-xs text-gray-500 font-mono mb-3">
                      {week.week}
                    </div>
                    <div className="space-y-2">
                      <div className="h-24 flex items-end justify-center gap-1">
                        <div
                          className="w-6 bg-blue-500/50 rounded-t-sm transition-all hover:bg-blue-500"
                          style={{
                            height: `${(week.applications / 150) * 100}%`,
                          }}
                          title={`${week.applications} Applications`}
                        />
                        <div
                          className="w-6 bg-purple-500/50 rounded-t-sm transition-all hover:bg-purple-500"
                          style={{ height: `${(week.interviews / 40) * 100}%` }}
                          title={`${week.interviews} Interviews`}
                        />
                        <div
                          className="w-6 bg-emerald-500/50 rounded-t-sm transition-all hover:bg-emerald-500"
                          style={{ height: `${(week.hires / 15) * 100}%` }}
                          title={`${week.hires} Hires`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                  <span className="text-xs text-gray-500 font-mono">
                    Applications
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                  <span className="text-xs text-gray-500 font-mono">
                    Interviews
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                  <span className="text-xs text-gray-500 font-mono">Hires</span>
                </div>
              </div>
            </div>

            {/* AI Insights Panel */}
            <div className="bg-[#111111] border border-white/10 rounded-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#FFD700]" />
                  AI HIRING INSIGHTS
                </h3>
                {aiInsights?.aiPowered && (
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Powered
                  </Badge>
                )}
              </div>

              {insightsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
                  <span className="ml-3 text-gray-400 font-mono text-sm">
                    Generating insights...
                  </span>
                </div>
              ) : aiInsights ? (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="bg-white/5 p-4 rounded-sm border-l-4 border-[#FFD700]">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {aiInsights.executiveSummary}
                    </p>
                  </div>

                  {/* Performance Rating */}
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500 font-mono uppercase">
                      Performance
                    </div>
                    <Badge
                      className={`
                                            ${aiInsights.performanceRating === "Excellent" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
                                            ${aiInsights.performanceRating === "Good" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : ""}
                                            ${aiInsights.performanceRating === "Needs Attention" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : ""}
                                            ${aiInsights.performanceRating === "Critical" ? "bg-red-500/20 text-red-400 border-red-500/30" : ""}
                                            border px-3 py-1
                                        `}
                    >
                      {aiInsights.performanceRating}
                    </Badge>
                    {aiInsights.efficiencyScore !== undefined && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-gray-500 font-mono">
                          Efficiency
                        </span>
                        <span className="text-lg font-bold text-[#FFD700] font-mono">
                          {aiInsights.efficiencyScore}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Key Highlights */}
                  {aiInsights.keyHighlights?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 font-mono uppercase mb-2">
                        Key Highlights
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {aiInsights.keyHighlights.map((highlight, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-sm"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {highlight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {aiInsights.actionItems?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 font-mono uppercase mb-2">
                        Recommended Actions
                      </div>
                      <div className="space-y-2">
                        {aiInsights.actionItems.map((action, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-gray-300 text-sm"
                          >
                            <ChevronRight className="w-4 h-4 text-[#FFD700] mt-0.5 flex-shrink-0" />
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Areas */}
                  {aiInsights.riskAreas?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 font-mono uppercase mb-2">
                        Risk Areas
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {aiInsights.riskAreas.map((risk, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded-sm"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {risk}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prediction */}
                  {aiInsights.prediction && (
                    <div className="bg-purple-500/10 p-3 rounded-sm border border-purple-500/20">
                      <div className="flex items-center gap-2 text-purple-400 text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-mono text-xs uppercase">
                          Prediction:
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">
                        {aiInsights.prediction}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-mono">
                    No insights available
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-4">
            <div className="bg-[#111111] border border-white/10 rounded-sm">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FFD700]" />
                  PENDING CEO APPROVALS
                </h3>
                <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30">
                  {pendingApprovals.length} Candidates
                </Badge>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50" />
                  <h4 className="text-white text-lg font-bold mb-2">
                    All Caught Up!
                  </h4>
                  <p className="text-gray-500 text-sm">
                    No pending approvals at this time.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {pendingApprovals.map((approval) => (
                    <div
                      key={approval._id}
                      className="p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-14 h-14 border-2 border-white/10">
                          <AvatarImage
                            src={approval.applicant?.profile?.profilePhoto}
                          />
                          <AvatarFallback className="bg-[#FFD700]/10 text-[#FFD700] text-lg font-bold">
                            {approval.applicant?.fullname?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-white font-bold">
                              {approval.applicant?.fullname}
                            </h4>
                            <Badge
                              className={getUrgencyColor(approval.urgency)}
                            >
                              {approval.urgency?.toUpperCase() || "PENDING"}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {approval.job?.title}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs font-mono">
                            <span className="text-gray-500">
                              Recruiter Score:{" "}
                              <span className="text-emerald-400">
                                {approval.recruiterScore || 85}%
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Interview:{" "}
                              <span className="text-purple-400">
                                {approval.interviewScore || 88}%
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Submitted: {formatDate(approval.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="border-white/10 text-gray-400 hover:bg-white/5"
                            onClick={() => setSelectedApproval(approval)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                          <Button
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                            onClick={() =>
                              handleApprovalDecision(approval._id, "approved")
                            }
                          >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                            onClick={() =>
                              handleApprovalDecision(approval._id, "rejected")
                            }
                          >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Team Performance Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="bg-[#111111] border border-white/10 rounded-sm">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#FFD700]" />
                  RECRUITER PERFORMANCE LEADERBOARD
                </h3>
              </div>
              <div className="divide-y divide-white/10">
                {recruiterPerformance
                  .sort((a, b) => b.positionsFilled - a.positionsFilled)
                  .map((recruiter, idx) => (
                    <div
                      key={recruiter._id}
                      className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-sm flex items-center justify-center font-bold font-mono ${idx === 0
                          ? "bg-[#FFD700]/20 text-[#FFD700]"
                          : idx === 1
                            ? "bg-gray-300/20 text-gray-300"
                            : idx === 2
                              ? "bg-amber-700/20 text-amber-600"
                              : "bg-white/5 text-gray-500"
                          }`}
                      >
                        {idx + 1}
                      </div>
                      <Avatar className="w-12 h-12 border border-white/10">
                        <AvatarFallback className="bg-purple-500/10 text-purple-400 font-bold">
                          {recruiter.fullname?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">
                          {recruiter.fullname}
                        </h4>
                        <p className="text-gray-500 text-xs font-mono">
                          {recruiter.email}
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-8 text-center">
                        <div>
                          <div className="text-xl font-bold text-emerald-400 font-mono">
                            {recruiter.positionsFilled}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                            Filled
                          </div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-blue-400 font-mono">
                            {recruiter.avgTimeToFill}d
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                            Avg Time
                          </div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-purple-400 font-mono">
                            {recruiter.qualityScore}%
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                            Quality
                          </div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-[#FFD700] font-mono">
                            {recruiter.activeInterviews}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                            Active
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>

          {/* Interview Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <InterviewReports />
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Detail Modal */}
      <AnimatePresence>
        {selectedApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedApproval(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-[#FFD700]/20 rounded-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Crown className="w-6 h-6 text-[#FFD700]" />
                  CEO REVIEW: {selectedApproval.applicant?.fullname}
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-sm">
                    <div className="text-xs text-gray-500 font-mono mb-1">
                      POSITION
                    </div>
                    <div className="text-white font-medium">
                      {selectedApproval.job?.title}
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-sm">
                    <div className="text-xs text-gray-500 font-mono mb-1">
                      INTERVIEW SCORE
                    </div>
                    <div className="text-emerald-400 font-bold font-mono text-xl">
                      {selectedApproval.interviewScore || 88}%
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-mono mb-2 block">
                    CEO NOTES
                  </label>
                  <Textarea
                    value={ceoNotes}
                    onChange={(e) => setCeoNotes(e.target.value)}
                    placeholder="Add your notes for this decision..."
                    className="bg-white/5 border-white/10 text-white min-h-[100px]"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedApproval(null)}
                  className="border-white/10 text-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleApprovalDecision(selectedApproval._id, "rejected")
                  }
                  disabled={processingDecision}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                >
                  {processingDecision ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() =>
                    handleApprovalDecision(selectedApproval._id, "approved")
                  }
                  disabled={processingDecision}
                  className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold"
                >
                  {processingDecision ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve Hire
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CEODashboard;
