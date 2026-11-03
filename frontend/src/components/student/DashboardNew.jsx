import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { logout } from "@/redux/authSlice";
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
  DollarSign,
  FileSearch,
  BrainCircuit,
  BarChart3,
  BookOpen,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import MockTestPrep from "./MockTestPrep";
import TrialWelcomeModal from "./TrialWelcomeModal";
// New Dashboard Features
import SkillGapAnalysis from "./SkillGapAnalysis";
import SalaryInsights from "./SalaryInsights";
import LearningResources from "./LearningResources";
import AICareerCoach from "./AICareerCoach";
import ReferralDashboard from "./ReferralDashboard";
import ResumeAnalyzer from "./resume-intel/ResumeAnalyzerGate";
import { useSupabaseDashboard } from "../../hooks/useSupabaseDashboard";
import DashboardLoader from "../shared/DashboardLoader";
import { useAuth } from "../../context/AuthContext";

// LIVE Badge Component
const LiveBadge = ({ isLive }) => (
  <div
   
   
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isLive ? "bg-accent/10 text-accent border-accent/30" : "bg-gray-500/10 text-gray-400 border-gray-500/30" }`}
  >
    <div
     
     
      className={`w-2 h-2 rounded-full ${isLive ? "bg-accent" : "bg-gray-500"}`}
    />
    {isLive ? "LIVE" : "OFFLINE"}
  </div>
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((store) => store.auth);
  const { signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Logout handler - clears both backend session AND Supabase session
  const logoutHandler = async () => {
    try {
      // Sign out from Supabase first (clears Google session)
      await signOut();
      // Then clear backend session
      await api.get("/user/logout");
      dispatch(logout());
      localStorage.removeItem("token");
      localStorage.removeItem("pendingSignupRole");
      navigate("/");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      dispatch(logout());
      localStorage.removeItem("token");
      navigate("/");
      toast.success("Logged out");
    }
  };

  const [stats, setStats] = useState({
    applied: 0,
    accepted: 0,
    rejected: 0,
    interviews: 0,
    pending: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  // Today, Jobs and Applications have their own screens; this one keeps the career tools
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "practice" ? "practice" : "career");
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
    }, []),
    onInterviewScheduled: useCallback((data) => {
      console.log("🎯 Interview scheduled:", data);
      toast.success(`🎉 Interview Scheduled! ${data.jobTitle || "New Interview"}`, {
        description: data.companyName ? `at ${data.companyName}` : undefined,
      });
      // Update interview count immediately
      setStats((prev) => ({ ...prev, interviews: prev.interviews + 1 }));
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
            (app) => ["interview", "mcq_pending", "mcq_passed", "video_scheduled", "video_completed"].includes(app.status),
          ).length;
          const offersCount = applications.filter(
            (app) => ["accepted", "hired", "offer_sent", "offer_accepted"].includes(app.status),
          ).length;

          setStats({
            applied: applications.length,
            accepted: offersCount,
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
      video_scheduled: {
        color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        label: "Video Interview",
      },
      mcq_pending: {
        color: "bg-primary/10 text-primary border-primary/30",
        label: "MCQ Test Pending",
      },
      mcq_passed: {
        color: "bg-accent/10 text-accent border-accent/30",
        label: "MCQ Passed ✓",
      },
      video_completed: {
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        label: "Interview Complete",
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
        className={`${badge.color} border px-3 py-1 text-xs rounded-full font-bold`}
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
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 selection:text-primary">
      {/* Trial Welcome Modal */}
      <TrialWelcomeModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        userName={user?.fullname}
        trialEndDate={trialEndDate || user?.trialEndDate}
      />

      <div className="fixed inset-0 pointer-events-none">
      </div>

      <div className="relative">
        <div className="app-title-row">
          <h1 className="app-h1">Career tools</h1>
        </div>
        <div className="app-tabs" role="tablist" style={{ marginBottom: 24 }}>
          {[
            ["career", "Career"],
            ["practice", "Practice tests"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={activeTab === id ? "is-active" : ""}
              onClick={() => {
                setActiveTab(id);
                setSearchParams({ tab: id });
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">




          {/* CAREER TAB - Consolidated career growth */}
          {activeTab === "career" && (
            <div
              key="career"
             
             
             
              className="space-y-8"
            >
              {/* Sub-navigation for Career */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 px-2 sm:justify-center sm:flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${!searchParams.get("sub") || searchParams.get("sub") === "coach" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "coach" })
                  }
                >
                  <BrainCircuit className="w-4 h-4 mr-2" /> AI Coach
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "skills" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "skills" })
                  }
                >
                  <BarChart3 className="w-4 h-4 mr-2" /> Skill Gap
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "salary" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "salary" })
                  }
                >
                  <DollarSign className="w-4 h-4 mr-2" /> Salary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "referrals" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "referrals" })
                  }
                >
                  <Users className="w-4 h-4 mr-2" /> Referrals
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "resume" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "resume" })
                  }
                >
                  <FileSearch className="w-4 h-4 mr-2" /> Resume
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-white/10 ${searchParams.get("sub") === "learning" ? "bg-primary text-black" : "text-gray-400 hover:text-white"}`}
                  onClick={() =>
                    setSearchParams({ tab: "career", sub: "learning" })
                  }
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Learning
                </Button>
              </div>

              {(!searchParams.get("sub") ||
                searchParams.get("sub") === "coach") && <AICareerCoach />}
              {searchParams.get("sub") === "skills" && <SkillGapAnalysis />}
              {searchParams.get("sub") === "salary" && <SalaryInsights />}
              {searchParams.get("sub") === "referrals" && <ReferralDashboard />}
              {searchParams.get("sub") === "learning" && <LearningResources />}
              {searchParams.get("sub") === "resume" && <ResumeAnalyzer />}
            </div>
          )}

          {/* PRACTICE TAB - Mock Tests */}
          {activeTab === "practice" && (
            <div
              key="practice"
             
             
             
            >
              <MockTestPrep />
            </div>
          )}


        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentDashboard;
