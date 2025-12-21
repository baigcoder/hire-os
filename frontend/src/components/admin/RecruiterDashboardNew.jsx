import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  Calendar,
  Users,
  Briefcase,
  Clock,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Bell,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Phone,
  Download,
  Linkedin,
  Globe,
  UserPlus,
  MapPin,
  Building,
  Search,
  Filter,
  MonitorPlay,
  BrainCircuit,
  Send,
  Key,
  User,
  Shield,
  RefreshCw,
  Sparkles,
  Target,
  CheckSquare,
  Square,
  Trash2,
  MoreHorizontal,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Crown,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  APPLICATION_API_END_POINT,
  USER_API_END_POINT,
  RECRUITER_ANALYTICS_API_END_POINT,
  INTERVIEW_API_END_POINT,
} from "@/utils/constant";
import Navbar from "../shared/Navbar";
import SubscriptionPanel from "../shared/SubscriptionPanel";
import { WriteReviewButton } from "../shared/AddReviewModal";

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { allAdminJobs } = useSelector((store) => store.job);
  const { user } = useSelector((store) => store.auth);

  // State management
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplicants: 0,
    pendingInterviews: 0,
    acceptedCandidates: 0,
    conversionRate: 0,
    recentApplications: [],
    applicationsByStatus: [],
    applicationTrends: [],
    topPerformingJobs: [],
    // New: Trends for KPI cards
    trends: { applicants: 12, jobs: -2, interviews: 5, hireRate: 3 },
  });

  // Source tracking data (fetched from API)
  const [sourceData, setSourceData] = useState([]);

  // Real interview data from API
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  // Bulk selection state
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Quick filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Pass to CEO state
  const [passToCeoDialogOpen, setPassToCeoDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [passToCeoNotes, setPassToCeoNotes] = useState("");
  const [passingToCeo, setPassingToCeo] = useState(false);

  // Profile state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Toggle select all candidates
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(stats.recentApplications.map((app) => app.id));
    }
    setSelectAll(!selectAll);
  };

  // Toggle single candidate selection
  const handleSelectCandidate = (id) => {
    if (selectedCandidates.includes(id)) {
      setSelectedCandidates(selectedCandidates.filter((c) => c !== id));
    } else {
      setSelectedCandidates([...selectedCandidates, id]);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedCandidates.length === 0) {
      toast.error("No candidates selected");
      return;
    }
    toast.success(`${action} ${selectedCandidates.length} candidates`);
    setSelectedCandidates([]);
    setSelectAll(false);
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  // Filter candidates
  const filteredApplications = useMemo(() => {
    return stats.recentApplications.filter((app) => {
      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        app.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [stats.recentApplications, statusFilter, searchQuery]);

  // Pass candidate to CEO for final approval
  const handlePassToCEO = async (applicationId) => {
    if (!applicationId) return;
    setPassingToCeo(true);
    try {
      const response = await axios.post(
        `${APPLICATION_API_END_POINT}/${applicationId}/pass-to-ceo`,
        { notes: passToCeoNotes, recommendation: "Recommended" },
        { withCredentials: true },
      );
      if (response.data.success) {
        toast.success("Candidate passed to CEO for final approval!");
        setPassToCeoDialogOpen(false);
        setPassToCeoNotes("");
        setSelectedApplication(null);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to pass candidate to CEO",
      );
    } finally {
      setPassingToCeo(false);
    }
  };

  // Change password handler
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const response = await axios.put(
        `${USER_API_END_POINT}/profile/update`,
        { password: passwordData.newPassword },
        { withCredentials: true },
      );
      if (response.data.success) {
        toast.success("Password updated successfully");
        setProfileDialogOpen(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  // Fetch dynamic analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Fetch source stats and trends in parallel
        const [sourceRes, trendsRes] = await Promise.all([
          axios
            .get(`${RECRUITER_ANALYTICS_API_END_POINT}/source-stats`, {
              withCredentials: true,
            })
            .catch(() => ({ data: { success: false } })),
          axios
            .get(`${RECRUITER_ANALYTICS_API_END_POINT}/trends`, {
              withCredentials: true,
            })
            .catch(() => ({ data: { success: false } })),
        ]);

        if (sourceRes.data.success && sourceRes.data.sources?.length > 0) {
          setSourceData(sourceRes.data.sources);
        } else {
          // Fallback for empty data
          setSourceData([{ name: "Direct", value: 100, color: "#10B981" }]);
        }

        if (trendsRes.data.success) {
          setStats((prev) => ({
            ...prev,
            trends: trendsRes.data.trends,
          }));
        }
      } catch (error) {
        console.error("Analytics fetch error:", error);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Fetch real interviews from API
  useEffect(() => {
    const fetchInterviews = async () => {
      setInterviewsLoading(true);
      try {
        const res = await axios.get(
          `${INTERVIEW_API_END_POINT}/recruiter/my-interviews`,
          {
            withCredentials: true,
          },
        );
        if (res.data.success) {
          // Filter to only upcoming interviews
          const now = new Date();
          const upcoming = (res.data.interviews || [])
            .filter((int) => new Date(int.scheduledAt) > now)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
            .slice(0, 5)
            .map((int) => ({
              id: int._id,
              applicantName: int.studentId?.fullname || "Candidate",
              applicantPhoto: int.studentId?.profile?.profilePhoto,
              jobTitle: int.jobId?.title || "Position",
              date: int.scheduledAt,
              mode:
                int.type === "video"
                  ? "Video Call"
                  : int.type === "phone"
                    ? "Phone"
                    : "In-Person",
              status: int.status,
            }));
          setUpcomingInterviews(upcoming);
        }
      } catch (error) {
        console.error("Failed to fetch interviews:", error);
        // Leave interviews empty - no mock data
        setUpcomingInterviews([]);
      } finally {
        setInterviewsLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  // Calculate comprehensive statistics (Memoized logic from previous version, adapted)
  useEffect(() => {
    if (!allAdminJobs || allAdminJobs.length === 0) return;

    const totalJobs = allAdminJobs.length;
    const activeJobs = allAdminJobs.filter(
      (job) => job.isActive !== false,
    ).length;
    let totalApplicants = 0;
    let pendingInterviews = 0;
    let acceptedCandidates = 0;
    let rejectedCandidates = 0;
    let recentApplications = [];
    const statusCounts = { pending: 0, accepted: 0, rejected: 0, interview: 0 };
    const monthlyData = {};
    const jobPerformance = {};

    // Initialize last 6 months
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      monthlyData[d.toLocaleDateString("en-US", { month: "short" })] = 0;
    }

    allAdminJobs.forEach((job) => {
      if (job.applications?.length > 0) {
        totalApplicants += job.applications.length;
        jobPerformance[job._id] = {
          title: job.title,
          applicants: job.applications.length,
          accepted: 0,
        };

        job.applications.forEach((app) => {
          if (statusCounts[app.status] !== undefined)
            statusCounts[app.status]++;
          if (app.status === "accepted") {
            acceptedCandidates++;
            jobPerformance[job._id].accepted++;
          }
          if (app.status === "rejected") rejectedCandidates++;

          const mKey = new Date(app.createdAt).toLocaleDateString("en-US", {
            month: "short",
          });
          if (monthlyData[mKey] !== undefined) monthlyData[mKey]++;

          if (app.status === "interview") pendingInterviews++;

          recentApplications.push({
            applicantName: app.applicant?.fullname,
            jobTitle: job.title,
            status: app.status,
            date: app.createdAt,
          });
        });
      }
    });

    const sortedRecent = recentApplications
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    setStats({
      totalJobs,
      activeJobs,
      totalApplicants,
      pendingInterviews,
      acceptedCandidates,
      rejectedCandidates,
      conversionRate:
        totalApplicants > 0
          ? ((acceptedCandidates / totalApplicants) * 100).toFixed(1)
          : 0,
      recentApplications: sortedRecent,
      applicationsByStatus: [
        { name: "Pending", value: statusCounts.pending, color: "#EAB308" }, // Gold/Yellow
        { name: "Interview", value: statusCounts.interview, color: "#A855F7" }, // Purple
        { name: "Accepted", value: statusCounts.accepted, color: "#10B981" }, // Emerald
        { name: "Rejected", value: statusCounts.rejected, color: "#EF4444" }, // Red
      ],
      applicationTrends: Object.keys(monthlyData).map((k) => ({
        name: k,
        applications: monthlyData[k],
      })),
      topPerformingJobs: Object.values(jobPerformance)
        .sort((a, b) => b.applicants - a.applicants)
        .slice(0, 5),
    });
  }, [allAdminJobs]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "accepted":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "interview":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] selection:bg-[#FFD700]/30 selection:text-[#FFD700]">
      <Navbar />

      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8 relative z-10 pt-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10"
        >
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-white/10 shadow-2xl">
                <AvatarImage src={user?.profile?.profilePhoto} />
                <AvatarFallback className="bg-zinc-900 text-white font-bold text-xl">
                  R
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-black p-1 rounded-full">
                <div className="bg-emerald-500 rounded-full p-1">
                  <CheckCircle size={10} className="text-black" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
                {user?.fullname || "Recruiter"}
              </h1>
              <p className="text-gray-500 flex items-center gap-2 mt-1 font-mono text-xs">
                <Building size={12} className="text-[#FFD700]" />{" "}
                {user?.profile?.company?.name || "HIRE.OS Operator"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full xl:w-auto">
            <Button
              onClick={refreshData}
              disabled={refreshing}
              className="bg-white/5 text-white hover:bg-white/10 h-10 w-10 rounded-sm border border-white/10 p-0"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
            </Button>
            <Button
              onClick={() => navigate("/recruiter/applications")}
              className="flex-1 xl:flex-initial bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold h-10 rounded-sm shadow-[0_0_20px_rgba(255,215,0,0.2)] uppercase tracking-wider text-xs"
            >
              <Users className="mr-2 h-4 w-4" /> Manage
            </Button>
            <Button
              onClick={() => navigate("/recruiter/jobs")}
              className="flex-1 xl:flex-initial bg-white/5 text-white hover:bg-white/10 font-medium h-10 rounded-sm border border-white/10 uppercase tracking-wider text-xs"
            >
              <Briefcase className="mr-2 h-4 w-4" /> Jobs
            </Button>
            <Button
              onClick={() => navigate("/notifications")}
              className="bg-white/5 text-white hover:bg-white/10 h-10 w-10 rounded-sm border border-white/10 p-0 relative"
            >
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center">
                3
              </span>
            </Button>
            <WriteReviewButton className="h-10 rounded-sm text-xs" />
          </div>
        </motion.div>

        {/* Industrial KPI Cards with Trends */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "APPLICANTS",
              value: stats.totalApplicants,
              icon: Users,
              color: "text-[#00FF94]",
              bgColor: "bg-[#00FF94]/10",
              trend: stats.trends?.applicants || 12,
            },
            {
              label: "ACTIVE JOBS",
              value: stats.activeJobs,
              icon: Briefcase,
              color: "text-[#FFD700]",
              bgColor: "bg-[#FFD700]/10",
              trend: stats.trends?.jobs || -2,
            },
            {
              label: "INTERVIEWS",
              value: stats.pendingInterviews,
              icon: Calendar,
              color: "text-cyan-400",
              bgColor: "bg-cyan-400/10",
              trend: stats.trends?.interviews || 5,
            },
            {
              label: "HIRE RATE",
              value: `${stats.conversionRate}%`,
              icon: Target,
              color: "text-[#FFD700]",
              bgColor: "bg-[#FFD700]/10",
              trend: stats.trends?.hireRate || 3,
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-5 rounded-sm border border-white/10 bg-[#111111] hover:border-[#FFD700]/30 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />
              <div className="flex justify-between items-start mb-3">
                <div
                  className={`p-2 rounded-sm ${stat.bgColor} border border-white/10`}
                >
                  <stat.icon size={18} className={stat.color} />
                </div>
                {/* Trend Indicator */}
                <div
                  className={`flex items-center gap-1 text-[10px] font-mono ${stat.trend > 0 ? "text-emerald-400" : stat.trend < 0 ? "text-red-400" : "text-gray-500"}`}
                >
                  {stat.trend > 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : stat.trend < 0 ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : null}
                  {stat.trend > 0 ? "+" : ""}
                  {stat.trend}%
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1 font-mono">
                {stat.value}
              </div>
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Charts & Trends */}
          <div className="xl:col-span-2 space-y-8">
            {/* Status Distribution, Source Tracking & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pipeline Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#111111] border border-white/10 rounded-sm p-5"
              >
                <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFD700]" />
                  Pipeline Status
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.applicationsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.applicationsByStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="rgba(0,0,0,0.5)"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111",
                          customBorder: "1px solid #333",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                  {stats.applicationsByStatus.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[10px] text-gray-400 font-mono"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      ></div>
                      {s.name} ({s.value})
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Source Tracking */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-[#111111] border border-white/10 rounded-sm p-5"
              >
                <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Candidate Sources
                </h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sourceData.map((entry, index) => (
                          <Cell
                            key={`source-${index}`}
                            fill={entry.color}
                            stroke="rgba(0,0,0,0.5)"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111",
                          border: "1px solid #333",
                          borderRadius: "4px",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {sourceData.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[10px] text-gray-400 font-mono"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      ></div>
                      {s.name} ({s.value}%)
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Velocity Index */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#111111] border border-white/10 rounded-sm p-5 lg:col-span-3"
              >
                <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Velocity Index
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.applicationTrends}>
                      <defs>
                        <linearGradient
                          id="colorApps"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10B981"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10B981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#222"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#555"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#555"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="applications"
                        stroke="#10B981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorApps)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Recent Applicants Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#111111] border border-white/10 rounded-sm p-5 overflow-hidden"
            >
              {/* Header with Filters */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#FFD700]" />
                  Recent Candidates
                </h3>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 md:w-48">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="pl-9 h-8 bg-white/5 border-white/10 text-white text-xs rounded-sm"
                    />
                  </div>
                  {/* Status Filters */}
                  <div className="flex gap-1">
                    {["all", "pending", "interview", "accepted"].map(
                      (status) => (
                        <Button
                          key={status}
                          size="sm"
                          onClick={() => setStatusFilter(status)}
                          className={`h-8 px-3 text-[10px] uppercase tracking-wider rounded-sm ${
                            statusFilter === status
                              ? "bg-[#FFD700] text-black font-bold"
                              : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
                          }`}
                        >
                          {status}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="link"
                    className="text-[#FFD700] text-xs uppercase tracking-wider"
                    onClick={() => navigate("/admin/jobs")}
                  >
                    View All
                  </Button>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              <AnimatePresence>
                {selectedCandidates.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-sm flex items-center justify-between"
                  >
                    <span className="text-sm text-[#FFD700] font-mono">
                      {selectedCandidates.length} candidate
                      {selectedCandidates.length > 1 ? "s" : ""} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleBulkAction("Advanced")}
                        className="h-7 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] uppercase border border-emerald-500/30"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Advance
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBulkAction("Rejected")}
                        className="h-7 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] uppercase border border-red-500/30"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBulkAction("Email sent to")}
                        className="h-7 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[10px] uppercase border border-blue-500/30"
                      >
                        <Mail className="w-3 h-3 mr-1" /> Email
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="py-4 pl-4 w-8">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                          className="border-white/30 data-[state=checked]:bg-[#FFD700] data-[state=checked]:border-[#FFD700]"
                        />
                      </th>
                      <th className="py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th className="py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredApplications.length > 0 ? (
                      filteredApplications.map((app, i) => (
                        <tr
                          key={app.id || i}
                          className={`group hover:bg-white/5 transition-colors ${selectedCandidates.includes(app.id) ? "bg-[#FFD700]/5" : ""}`}
                        >
                          <td className="py-4 pl-4 w-8">
                            <Checkbox
                              checked={selectedCandidates.includes(app.id)}
                              onCheckedChange={() =>
                                handleSelectCandidate(app.id)
                              }
                              className="border-white/30 data-[state=checked]:bg-[#FFD700] data-[state=checked]:border-[#FFD700]"
                            />
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-sm bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] font-bold border border-[#FFD700]/20">
                                {app.applicantName?.charAt(0)}
                              </div>
                              <div className="font-medium text-gray-200">
                                {app.applicantName}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-gray-400 text-sm font-mono">
                            {app.jobTitle}
                          </td>
                          <td className="py-4 text-gray-500 text-sm font-mono">
                            {new Date(app.date).toLocaleDateString()}
                          </td>
                          <td className="py-4">
                            <Badge
                              className={`${getStatusColor(app.status)} px-3 py-1 bg-opacity-10 border-opacity-20`}
                            >
                              {app.status}
                            </Badge>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            {(app.status === "interview" ||
                              app.status === "video_completed" ||
                              app.status === "accepted") && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setPassToCeoDialogOpen(true);
                                }}
                                className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30"
                              >
                                <Send className="w-3 h-3 mr-1" />
                                To CEO
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="py-8 text-center text-gray-500"
                        >
                          No applicants yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Interviews */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10" />
              <h3 className="text-sm font-bold text-white mb-5 relative z-10 flex items-center gap-2 uppercase tracking-wider">
                <MonitorPlay className="text-cyan-400" size={16} /> Interviews
              </h3>

              <div className="space-y-4 relative z-10">
                {upcomingInterviews.length > 0 ? (
                  upcomingInterviews.map((int, i) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/5 rounded-sm p-3 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-gray-200 text-sm">
                          {int.applicantName}
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-cyan-500/10 text-cyan-400 text-[10px] uppercase tracking-wider"
                        >
                          {int.mode}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mb-2 font-mono">
                        {int.jobTitle}
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-medium border border-cyan-500/30 h-7 rounded-sm text-xs uppercase tracking-wider"
                        onClick={() => navigate("/interview/lobby")}
                      >
                        Start Session
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    No upcoming interviews
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full border-dashed border-white/10 text-gray-500 hover:text-[#FFD700] hover:border-[#FFD700]/30 bg-transparent rounded-sm text-xs uppercase tracking-wider"
                  onClick={() => navigate("/recruiter/interviews")}
                >
                  Schedule New
                </Button>
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#FFD700]/10 rounded-sm">
                  <BrainCircuit className="text-[#FFD700]" size={16} />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  AI Insights
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-4 font-mono">
                Job postings receiving 24% more qualified candidates than market
                average.
              </p>
              <div className="h-1.5 w-full bg-white/5 rounded-sm overflow-hidden">
                <div className="h-full bg-[#FFD700] w-[74%]"></div>
              </div>
              <div className="mt-2 text-right text-[10px] text-[#FFD700] font-mono uppercase tracking-wider">
                Top 5% Performance
              </div>
            </div>

            {/* Top Jobs */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-5">
              <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wider">
                Top Jobs
              </h3>
              <div className="space-y-3">
                {stats.topPerformingJobs.map((job, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-white/5 rounded-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-gray-600 font-mono text-xs">
                        0{i + 1}
                      </div>
                      <div className="text-gray-300 font-medium text-sm truncate w-28">
                        {job.title}
                      </div>
                    </div>
                    <div className="text-[#00FF94] font-mono text-xs">
                      {job.applicants}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Status - Compact */}
            <SubscriptionPanel compact={true} showUpgrade={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
