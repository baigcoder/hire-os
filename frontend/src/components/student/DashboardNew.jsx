import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import {
  Briefcase,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
  TrendingUp,
  UserCheck,
  CalendarCheck,
  Search,
  MapPin,
  Building,
  DollarSign,
  Target,
  Zap,
  ArrowUpRight,
  Brain,
  FileSearch,
  Mic,
  Download,
  Mail,
  Phone,
  LayoutDashboard,
  Sparkles,
  GraduationCap,
  Video,
  ShieldCheck,
  MessageSquare,
  BrainCircuit,
  Bookmark,
  Calendar,
  BarChart3,
  Rocket,
  BookOpen,
  Users,
  Bell,
  ChevronDown,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import MockTestPrep from "./MockTestPrep";
import LiveInterview from "./LiveInterview";
import TrialWelcomeModal from "./TrialWelcomeModal";
import JobsForYou from "./JobsForYou";
import ProfileCompletionCard from "./ProfileCompletionCard";
import TrialBanner from "./TrialBanner";
import {
  ApplicationStatusChart,
  WeeklyActivityChart,
  SkillsMatchChart,
} from "./DashboardCharts";
import { WriteReviewButton } from "../shared/AddReviewModal";
// New Dashboard Features
import SavedJobs from "./SavedJobs";
import InterviewCalendar from "./InterviewCalendar";
import SkillGapAnalysis from "./SkillGapAnalysis";
import CareerTimeline from "./CareerTimeline";
import SalaryInsights from "./SalaryInsights";
import LearningResources from "./LearningResources";
import NetworkConnections from "./NetworkConnections";
import DailyJobAlerts from "./DailyJobAlerts";
import PracticeHistory from "./PracticeHistory";
import { useSupabaseDashboard } from "../../hooks/useSupabaseDashboard";
import DashboardLoader from "../shared/DashboardLoader";

// LIVE Badge Component
const LiveBadge = ({ isLive }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isLive
      ? "bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30"
      : "bg-gray-500/10 text-gray-400 border-gray-500/30"
      }`}
  >
    <motion.div
      animate={{ scale: isLive ? [1, 1.2, 1] : 1 }}
      transition={{ repeat: isLive ? Infinity : 0, duration: 1.5 }}
      className={`w-2 h-2 rounded-full ${isLive ? "bg-[#00FF94]" : "bg-gray-500"}`}
    />
    {isLive ? "LIVE" : "OFFLINE"}
  </motion.div>
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((store) => store.auth);

  const [stats, setStats] = useState({
    applied: 0,
    accepted: 0,
    rejected: 0,
    interviews: 0,
    pending: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );
  const [aiJobs, setAiJobs] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Trial Welcome Modal state
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState(null);

  // Real-time dashboard connection using Supabase Realtime
  const { isLive, lastUpdate, refreshStats } = useSupabaseDashboard({
    onStatsUpdate: useCallback((data) => {
      console.log("📊 Real-time stats update:", data);
      if (data.stats) {
        setStats((prev) => ({ ...prev, ...data.stats }));
      }
    }, []),
    onApplicationUpdate: useCallback((data) => {
      console.log("📊 Application update:", data);
      // Refresh applications list
      fetchApplicationData();
    }, []),
  });

  // Check if we should show trial welcome modal (on first visit after signup)
  useEffect(() => {
    const shouldShowTrial = localStorage.getItem("showTrialWelcome");
    const storedTrialEndDate = localStorage.getItem("trialEndDate");

    if (shouldShowTrial === "true") {
      setShowTrialModal(true);
      setTrialEndDate(storedTrialEndDate);
      // Clear the flag so modal doesn't show again
      localStorage.removeItem("showTrialWelcome");
      localStorage.removeItem("trialEndDate");
    }
  }, []);

  // Fetch application data
  useEffect(() => {
    const fetchApplicationData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/application/get");
        if (res.data.success) {
          const applications = res.data.application || [];
          const pendingCount = applications.filter(
            (app) => app.status === "pending",
          ).length;
          const acceptedCount = applications.filter(
            (app) => app.status === "accepted",
          ).length;
          const rejectedCount = applications.filter(
            (app) => app.status === "rejected",
          ).length;
          const interviewCount = applications.filter(
            (app) => app.status === "interview",
          ).length;

          setStats({
            applied: applications.length,
            accepted: acceptedCount,
            rejected: rejectedCount,
            interviews: interviewCount,
            pending: pendingCount,
          });

          // Sort applications by date (newest first)
          const sortedApplications = applications
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
          setRecentApplications(sortedApplications);
        }
      } catch (error) {
        console.error("Error fetching application data:", error);
        toast.error("Failed to load application data");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchApplicationData();
    }
  }, [user]);

  const fetchAIMatchedJobs = useCallback(async (withLoader = true) => {
    try {
      if (withLoader) {
        setAiLoading(true);
      }
      const res = await api.get("/job/ai-matched", {
        params: { limit: 20 },
      });

      if (res.data.success) {
        const rawJobs = res.data.data?.jobs || [];
        const normalizedJobs = rawJobs.map((job) => ({
          ...job,
          matchScore: job.match?.score ?? 0,
          matchedSkills: job.match?.matchedSkills || [],
          missingSkills: job.match?.missingSkills || job.match?.skillGaps || [],
          aiInsight: job.match?.recommendation || "",
          whyGoodFit: job.match?.whyGoodFit || "",
          topStrengths: job.match?.topStrengths || [],
        }));
        setAiJobs(normalizedJobs);
      }
    } catch (error) {
      console.error("Error fetching AI-matched jobs:", error);
    } finally {
      if (withLoader) {
        setAiLoading(false);
      }
    }
  }, []);

  const skillsKey = useMemo(() => {
    const skills = user?.profile?.skills || [];
    return Array.isArray(skills) ? [...skills].sort().join("|") : "";
  }, [user?.profile?.skills]);

  useEffect(() => {
    if (user) {
      fetchAIMatchedJobs(true);
    }
  }, [user, skillsKey, fetchAIMatchedJobs]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchAIMatchedJobs(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [user, fetchAIMatchedJobs]);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    let completion = 0;
    if (user?.fullname) completion += 20;
    if (user?.email) completion += 20;
    if (user?.phoneNumber) completion += 15;
    if (user?.profile?.bio) completion += 15;
    if (user?.profile?.skills?.length > 0) completion += 15;
    if (user?.profile?.resume) completion += 15;
    return completion;
  }, [user]);

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
        label: "Under Review",
      },
      under_review: {
        color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
        label: "Being Reviewed",
      },
      shortlisted: {
        color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
        label: "Shortlisted",
      },
      interview: {
        color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
        label: "Interview Scheduled",
      },
      pending_ceo_approval: {
        color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
        label: "Final Review",
      },
      hired: {
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
        label: "🎉 Hired!",
      },
      accepted: {
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
        label: "Offer Received",
      },
      rejected: {
        color: "bg-red-500/10 text-red-500 border-red-500/30",
        label: "Not Selected",
      },
      withdrawn: {
        color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
        label: "Withdrawn",
      },
    };
    const badge = badges[status?.toLowerCase()] || {
      color: "bg-gray-500/10 text-gray-500 border-gray-500/30",
      label: status,
    };
    return (
      <Badge
        className={`${badge.color} border px-3 py-1 text-xs rounded-full uppercase tracking-wider font-bold`}
      >
        {badge.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate success rate
  const successRate =
    stats.applied > 0 ? ((stats.accepted / stats.applied) * 100).toFixed(0) : 0;

  // Show loading state
  if (loading) {
    return <DashboardLoader type="student" message="LOADING DASHBOARD" />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] selection:bg-[#FFD700]/30 selection:text-[#FFD700]">
      {/* Trial Welcome Modal */}
      <TrialWelcomeModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        userName={user?.fullname}
        trialEndDate={trialEndDate || user?.trialEndDate}
      />

      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8 pt-20 relative z-10">
        {/* Trial Status Banner */}
        <TrialBanner />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* User Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-1/3"
          >
            <div className="bg-[#111111] border border-white/10 rounded-md p-6 relative overflow-hidden group hover:border-[#FFD700]/30 transition-colors duration-300">
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />

              <button
                onClick={() => navigate("/settings")}
                className="absolute top-4 right-4 text-gray-500 hover:text-[#FFD700] transition-colors z-20"
                title="Settings"
              >
                <Settings size={20} />
              </button>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                      <AvatarImage
                        src={user?.profile?.profilePhoto}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-zinc-800 text-yellow-500 text-2xl font-bold">
                        {user?.fullname?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {profileCompletion === 100 && (
                      <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1">
                        <div className="bg-yellow-500 text-black p-1 rounded-full">
                          <CheckCircle size={12} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">
                      {user?.fullname}
                    </h1>
                    <Badge
                      variant="outline"
                      className="border-[#FFD700]/30 text-[#FFD700] bg-[#FFD700]/5 text-xs uppercase tracking-wider"
                    >
                      <GraduationCap className="h-3 w-3 mr-1" /> Candidate
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <Mail size={14} className="text-yellow-500" />
                    </div>
                    {user?.email}
                  </div>
                  {user?.phoneNumber && (
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Phone size={14} className="text-yellow-500" />
                      </div>
                      {user?.phoneNumber}
                    </div>
                  )}
                </div>

                <div className="bg-white/5 rounded-sm p-3 border border-white/5">
                  <div className="flex justify-between mb-2 text-xs">
                    <span className="text-gray-500 uppercase tracking-wider">
                      Profile Strength
                    </span>
                    <span className="text-[#FFD700] font-mono">
                      {profileCompletion}%
                    </span>
                  </div>
                  <Progress
                    value={profileCompletion}
                    className="h-1 bg-white/5"
                    indicatorClassName="bg-[#FFD700]"
                  />
                </div>

                {/* Trial Status Card */}
                {user?.trialEndDate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-[#00FF94]/10 to-emerald-500/5 rounded-sm p-3 border border-[#00FF94]/30 mt-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#00FF94]" />
                        <span className="text-xs text-[#00FF94] font-bold uppercase tracking-wider">
                          Free Trial
                        </span>
                      </div>
                      <Badge className="bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/30 text-[10px]">
                        ACTIVE
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-white font-mono">
                          {Math.max(
                            0,
                            Math.ceil(
                              (new Date(user.trialEndDate) - new Date()) /
                              (1000 * 60 * 60 * 24),
                            ),
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          days remaining
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#00FF94]/20 text-[#00FF94] hover:bg-[#00FF94]/30 border border-[#00FF94]/30 text-xs"
                        onClick={() => navigate("/profile?tab=subscription")}
                      >
                        View Details
                      </Button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-5">
                  <Button
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#FFD700]/30 text-gray-400 hover:text-white rounded-sm text-xs uppercase tracking-wider"
                    onClick={() => navigate("/profile")}
                  >
                    Edit
                  </Button>
                  <Button
                    className="w-full bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold border-none rounded-sm text-xs uppercase tracking-wider"
                    onClick={() =>
                      user?.profile?.resume
                        ? window.open(user.profile.resume, "_blank")
                        : toast.error("No resume found")
                    }
                  >
                    <Download className="mr-1 h-3 w-3" /> Resume
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Real-time Stats
              </span>
              <LiveBadge isLive={isLive} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "APPLIED",
                  value: stats.applied,
                  icon: FileText,
                  color: "text-[#00FF94]",
                },
                {
                  label: "INTERVIEWS",
                  value: stats.interviews,
                  icon: Video,
                  color: "text-cyan-400",
                },
                {
                  label: "OFFERS",
                  value: stats.accepted,
                  icon: Target,
                  color: "text-[#FFD700]",
                },
                {
                  label: "PENDING",
                  value: stats.pending,
                  icon: Clock,
                  color: "text-gray-400",
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * idx }}
                >
                  <div className="h-full bg-[#111111] border border-white/10 rounded-md p-5 relative overflow-hidden group hover:border-[#FFD700]/30 transition-all">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />
                    <div className="relative z-10">
                      <div
                        className={`p-2 rounded-sm bg-white/5 w-fit mb-3 ${stat.color}`}
                      >
                        <stat.icon size={18} />
                      </div>
                      <div className="text-3xl font-bold text-white mb-1 font-mono">
                        {stat.value}
                      </div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* AI Insight Card */}
              <motion.div
                className="col-span-2 lg:col-span-4 mt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="bg-[#111111] border border-white/10 rounded-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-cyan-500/30" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                      <BrainCircuit size={24} className="text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
                        AI Interview Coach
                      </h3>
                      <p className="text-gray-500 text-xs font-mono">
                        Gemini-powered mock interview preparation
                      </p>
                    </div>
                  </div>
                  <Button
                    className="relative z-10 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 font-bold rounded-sm px-5 border border-cyan-500/30 text-xs uppercase tracking-wider"
                    onClick={() => setActiveTab("interview")}
                  >
                    Start Practice <Sparkles className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </motion.div>

              {/* Mock MCQ Test Card */}
              <motion.div
                className="col-span-2 lg:col-span-2 mt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <div className="bg-[#111111] border border-white/10 rounded-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/30">
                      <Brain size={24} className="text-[#FFD700]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
                        Mock MCQ Tests
                      </h3>
                      <p className="text-gray-500 text-xs font-mono">
                        AI-generated practice tests
                      </p>
                    </div>
                  </div>
                  <Button
                    className="relative z-10 bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30 font-bold rounded-sm px-5 border border-[#FFD700]/30 text-xs uppercase tracking-wider"
                    onClick={() => {
                      setSearchParams({ tab: "practice" });
                      setActiveTab("practice");
                    }}
                  >
                    Take Test <Target className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </motion.div>

              {/* Skill Gap Analysis Card */}
              <motion.div
                className="col-span-2 lg:col-span-2 mt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="bg-[#111111] border border-white/10 rounded-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#00FF94]/30" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm bg-[#00FF94]/10 flex items-center justify-center border border-[#00FF94]/30">
                      <BarChart3 size={24} className="text-[#00FF94]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
                        Skill Gap Analysis
                      </h3>
                      <p className="text-gray-500 text-xs font-mono">
                        Identify skills to develop
                      </p>
                    </div>
                  </div>
                  <Button
                    className="relative z-10 bg-[#00FF94]/20 text-[#00FF94] hover:bg-[#00FF94]/30 font-bold rounded-sm px-5 border border-[#00FF94]/30 text-xs uppercase tracking-wider"
                    onClick={() => {
                      setSearchParams({ tab: "career", sub: "skills" });
                      setActiveTab("career");
                    }}
                  >
                    Analyze <BarChart3 className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Feature Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 flex justify-center"
        >
          <div className="bg-[#111111] border border-white/10 rounded-md p-2 inline-flex gap-2 flex-wrap justify-center">
            {[
              {
                id: "overview",
                label: "Overview",
                icon: LayoutDashboard,
                description: "Dashboard home",
              },
              {
                id: "jobs",
                label: "Jobs",
                icon: Briefcase,
                description: "Find & save jobs",
              },
              {
                id: "interviews",
                label: "Interviews",
                icon: Video,
                description: "Mock interviews & calendar",
              },
              {
                id: "career",
                label: "Career",
                icon: TrendingUp,
                description: "Skills, salary & learning",
              },
              {
                id: "practice",
                label: "Practice",
                icon: Brain,
                description: "Mock tests",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchParams({ tab: tab.id });
                }}
                className={`group flex items-center gap-2 px-5 py-3 rounded-sm text-sm font-medium transition-all relative ${activeTab === tab.id
                  ? "bg-[#FFD700] text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* JOBS TAB - Consolidated job discovery */}
          {activeTab === "jobs" && (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Sub-navigation for Jobs */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${!searchParams.get("sub") || searchParams.get("sub") === "find" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() => setSearchParams({ tab: "jobs", sub: "find" })}
                >
                  <Search className="w-4 h-4 mr-2" /> Find Jobs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "saved" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() => setSearchParams({ tab: "jobs", sub: "saved" })}
                >
                  <Bookmark className="w-4 h-4 mr-2" /> Saved Jobs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "alerts" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "jobs", sub: "alerts" })
                  }
                >
                  <Bell className="w-4 h-4 mr-2" /> Job Alerts
                </Button>
              </div>

              {(!searchParams.get("sub") ||
                searchParams.get("sub") === "find") && <JobsForYou />}
              {searchParams.get("sub") === "saved" && <SavedJobs />}
              {searchParams.get("sub") === "alerts" && <DailyJobAlerts />}
            </motion.div>
          )}

          {/* INTERVIEWS TAB - Consolidated interview prep */}
          {activeTab === "interviews" && (
            <motion.div
              key="interviews"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Sub-navigation for Interviews */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${!searchParams.get("sub") || searchParams.get("sub") === "mock" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "interviews", sub: "mock" })
                  }
                >
                  <Video className="w-4 h-4 mr-2" /> Mock Interview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "calendar" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "interviews", sub: "calendar" })
                  }
                >
                  <Calendar className="w-4 h-4 mr-2" /> Calendar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "history" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "interviews", sub: "history" })
                  }
                >
                  <Clock className="w-4 h-4 mr-2" /> History
                </Button>
              </div>

              {(!searchParams.get("sub") ||
                searchParams.get("sub") === "mock") && <LiveInterview />}
              {searchParams.get("sub") === "calendar" && <InterviewCalendar />}
              {searchParams.get("sub") === "history" && <PracticeHistory />}
            </motion.div>
          )}

          {/* CAREER TAB - Consolidated career growth */}
          {activeTab === "career" && (
            <motion.div
              key="career"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Sub-navigation for Career */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${!searchParams.get("sub") || searchParams.get("sub") === "skills" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "skills" })
                  }
                >
                  <BarChart3 className="w-4 h-4 mr-2" /> Skill Gap
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "salary" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "salary" })
                  }
                >
                  <DollarSign className="w-4 h-4 mr-2" /> Salary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "learning" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "learning" })
                  }
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Learning
                </Button>
              </div>

              {(!searchParams.get("sub") ||
                searchParams.get("sub") === "skills") && <SkillGapAnalysis />}
              {searchParams.get("sub") === "salary" && <SalaryInsights />}
              {searchParams.get("sub") === "learning" && <LearningResources />}
            </motion.div>
          )}

          {/* PRACTICE TAB - Mock Tests */}
          {activeTab === "practice" && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MockTestPrep />
            </motion.div>
          )}

          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Main Content Areas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Applications Lists */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Application Pipeline Tracker */}
                  {recentApplications.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 mb-6"
                    >
                      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="text-yellow-500" size={20} />
                        Application Pipeline
                      </h3>
                      <div className="relative">
                        {/* Progress Line */}
                        <div className="absolute top-6 left-0 right-0 h-1 bg-zinc-800 rounded-full mx-8" />

                        {/* Stages */}
                        <div className="grid grid-cols-2 gap-y-6 md:flex md:justify-between relative z-10">
                          {[
                            {
                              stage: "Applied",
                              icon: FileText,
                              count: stats.applied,
                              color: "blue",
                            },
                            {
                              stage: "Review",
                              icon: Clock,
                              count: stats.pending,
                              color: "yellow",
                            },
                            {
                              stage: "Interview",
                              icon: Video,
                              count: stats.interviews,
                              color: "purple",
                            },
                            {
                              stage: "Offer",
                              icon: Target,
                              count: stats.accepted,
                              color: "emerald",
                            },
                          ].map((step, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col items-center"
                            >
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 transition-all
                                                    ${step.count > 0
                                    ? `bg-${step.color}-500/20 border-${step.color}-500 text-${step.color}-400`
                                    : "bg-zinc-900 border-zinc-700 text-zinc-500"
                                  }`}
                                style={{
                                  backgroundColor:
                                    step.count > 0
                                      ? `rgba(var(--${step.color}-rgb), 0.2)`
                                      : undefined,
                                  borderColor:
                                    step.count > 0
                                      ? `var(--${step.color}-color)`
                                      : undefined,
                                }}
                              >
                                <step.icon size={20} />
                              </div>
                              <span className="text-xs text-gray-400 font-medium">
                                {step.stage}
                              </span>
                              <span
                                className={`text-lg font-bold ${step.count > 0 ? "text-white" : "text-zinc-600"}`}
                              >
                                {step.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Success Rate
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-yellow-500">
                            {successRate}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">
                      Recent Applications
                    </h2>
                    <Button
                      variant="ghost"
                      className="text-yellow-500 hover:text-yellow-400 hover:bg-transparent"
                      onClick={() => navigate("/applied-jobs")}
                    >
                      View All <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {recentApplications.length > 0 ? (
                      recentApplications.map((app, idx) => (
                        <motion.div
                          key={app._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * idx }}
                          className="group bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden"
                          onClick={() => navigate("/applied-jobs")}
                        >
                          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-yellow-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white font-bold group-hover:bg-yellow-500/20 group-hover:text-yellow-500 transition-colors">
                                {app.job?.company?.name?.charAt(0) || (
                                  <Building size={20} />
                                )}
                              </div>
                              <div>
                                <h3 className="font-bold text-white group-hover:text-yellow-500 transition-colors">
                                  {app.job?.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {app.job?.company?.name} •{" "}
                                  {formatDate(app.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getStatusBadge(app.status)}
                              <ArrowUpRight
                                className="text-gray-600 group-hover:text-white transition-colors"
                                size={20}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-20 bg-[#0a0a0a] border border-white/10 rounded-3xl border-dashed">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="text-gray-600" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">
                          No applications yet
                        </h3>
                        <p className="text-gray-500 mb-6">
                          Start your journey by exploring open positions.
                        </p>
                        <Button
                          className="bg-white text-black hover:bg-gray-200"
                          onClick={() => navigate("/browse")}
                        >
                          Browse Jobs
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Live Animated Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <ApplicationStatusChart stats={stats} />
                    <WeeklyActivityChart applications={recentApplications} />
                  </div>
                  <div className="mt-6">
                    <SkillsMatchChart skills={user?.profile?.skills || []} />
                  </div>
                </div>

                {/* Right Sidebar: AI Recommendations */}
                <div className="space-y-6">
                  <motion.div
                    className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden relative"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-[#FFD700]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            AI Recommendations
                          </h3>
                          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                            RAG + GPT MATCHING
                          </p>
                        </div>
                      </div>
                      <LiveBadge isLive={isLive} />
                    </div>

                    <div className="p-4 space-y-3">
                      {aiLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="relative">
                            <div className="w-12 h-12 border-2 border-[#FFD700]/20 rounded-full animate-pulse" />
                            <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-[#FFD700] animate-pulse" />
                          </div>
                          <p className="text-gray-500 mt-3 font-mono text-xs tracking-wider uppercase">
                            Analyzing best matches...
                          </p>
                        </div>
                      ) : aiJobs.length > 0 ? (
                        aiJobs.slice(0, 4).map((job, idx) => {
                          const score = job.matchScore || 0;
                          const isExpanded = expandedJobId === job._id;
                          const tone =
                            score >= 85
                              ? {
                                badge:
                                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                border: "hover:border-emerald-500/30",
                              }
                              : score >= 70
                                ? {
                                  badge:
                                    "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30",
                                  border: "hover:border-[#FFD700]/30",
                                }
                                : score >= 55
                                  ? {
                                    badge:
                                      "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                    border: "hover:border-blue-500/30",
                                  }
                                  : {
                                    badge:
                                      "bg-white/5 text-gray-400 border-white/10",
                                    border: "hover:border-white/20",
                                  };

                          return (
                            <motion.div
                              key={job._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.08 * idx }}
                              className={`group relative p-3 bg-[#0A0A0A] border border-white/10 rounded-2xl ${tone.border} transition-all cursor-pointer`}
                              onClick={() =>
                                navigate(`/description/${job._id}`)
                              }
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#FFD700]/30 transition-colors shrink-0">
                                  {job.company?.logo ? (
                                    <img
                                      src={job.company.logo}
                                      alt=""
                                      className="w-7 h-7 object-contain rounded"
                                    />
                                  ) : (
                                    <Building className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-semibold text-white group-hover:text-[#FFD700] transition-colors truncate">
                                        {job.title}
                                      </h4>
                                      <p className="text-xs text-gray-500 font-mono truncate">
                                        {job.company?.name}
                                      </p>
                                    </div>
                                    <Badge
                                      className={`${tone.badge} text-[10px] font-mono uppercase tracking-wider`}
                                    >
                                      {score}% match
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-3 text-[10px] mt-2 text-gray-400 font-mono uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {job.location || "Remote"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3 h-3 text-[#FFD700]" />
                                      <span className="text-gray-300">
                                        {job.salary || "Competitive"}
                                      </span>
                                    </span>
                                  </div>

                                  {(job.aiInsight ||
                                    job.matchedSkills?.length > 0) && (
                                      <div className="mt-2 space-y-2">
                                        {job.aiInsight && (
                                          <p className="text-xs text-gray-400 leading-relaxed">
                                            {job.aiInsight}
                                          </p>
                                        )}
                                        {(job.matchedSkills?.length > 0 ||
                                          job.missingSkills?.length > 0) && (
                                            <div className="flex flex-wrap gap-1.5">
                                              {(job.matchedSkills || [])
                                                .slice(0, 3)
                                                .map((s) => (
                                                  <Badge
                                                    key={`${job._id}-${s}`}
                                                    className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 text-[10px] font-mono uppercase tracking-wider"
                                                  >
                                                    {s}
                                                  </Badge>
                                                ))}
                                              {(job.missingSkills || [])
                                                .slice(0, 2)
                                                .map((s) => (
                                                  <Badge
                                                    key={`${job._id}-missing-${s}`}
                                                    className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-mono uppercase tracking-wider"
                                                  >
                                                    {s}
                                                  </Badge>
                                                ))}
                                              {(job.matchedSkills || []).length >
                                                3 && (
                                                  <Badge className="bg-white/5 text-gray-400 border-white/10 text-[10px] font-mono uppercase tracking-wider">
                                                    +
                                                    {(job.matchedSkills || [])
                                                      .length - 3}
                                                  </Badge>
                                                )}
                                            </div>
                                          )}
                                      </div>
                                    )}
                                  {(job.whyGoodFit ||
                                    (job.topStrengths &&
                                      job.topStrengths.length > 0)) && (
                                      <div className="mt-3 border-t border-white/5 pt-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedJobId(
                                              isExpanded ? null : job._id,
                                            );
                                          }}
                                          className="flex items-center justify-between w-full text-[10px] text-gray-400 font-mono uppercase tracking-wider hover:text-[#FFD700] transition-colors"
                                        >
                                          <span>Why this job?</span>
                                          <ChevronDown
                                            className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                          />
                                        </button>
                                        {isExpanded && (
                                          <div className="mt-2 space-y-1">
                                            {job.whyGoodFit && (
                                              <p className="text-xs text-gray-400 leading-relaxed">
                                                {job.whyGoodFit}
                                              </p>
                                            )}
                                            {job.topStrengths &&
                                              job.topStrengths.length > 0 && (
                                                <ul className="text-[11px] text-gray-400 list-disc list-inside">
                                                  {job.topStrengths
                                                    .slice(0, 3)
                                                    .map((item, index) => (
                                                      <li
                                                        key={`${job._id}-strength-${index}`}
                                                      >
                                                        {item}
                                                      </li>
                                                    ))}
                                                </ul>
                                              )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>

                              <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight className="w-4 h-4 text-[#FFD700]" />
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="text-center py-10 text-gray-500">
                          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">
                            {profileCompletion < 70
                              ? "Complete your profile for personalized recommendations"
                              : "No job matches found. Check back soon!"}
                          </p>
                          {profileCompletion < 70 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 border-[#FFD700]/30 text-[#FFD700]"
                              onClick={() => navigate("/profile")}
                            >
                              Complete Profile
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-4 border-t border-white/10">
                      <Button
                        className="w-full bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm text-xs font-bold uppercase tracking-wider"
                        onClick={() => navigate("/jobs")}
                      >
                        View All Matches
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentDashboard;
