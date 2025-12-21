import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Crown,
  Plus,
  Settings,
  CreditCard,
  ChevronRight,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  BarChart3,
  Zap,
  Video,
  UserPlus,
  MoreVertical,
  RefreshCw,
  Trash2,
  Edit2,
  Upload,
  UserCheck,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Terminal,
  Activity,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Progress } from "../ui/progress";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { toast } from "sonner";
import axios from "axios";
import { COMPANY_API_END_POINT } from "@/utils/constant";
import Navbar from "../shared/Navbar";
import { WriteReviewButton } from "../shared/AddReviewModal";

// Industrial Live Status Indicator
const LiveIndicator = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00FF94]/10 border border-[#00FF94]/20 rounded-sm">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF94]"></span>
    </span>
    <span className="text-[#00FF94] text-xs font-mono uppercase tracking-wider">
      System Online
    </span>
  </div>
);

// Industrial Stat Card
const IndustrialStatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  delay = 0,
  progress = 0,
  color = "#FFD700",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="relative p-6 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-all duration-300"
  >
    {/* Corner accents */}
    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />
    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />

    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-2">
          {label}
        </p>
        <p className="text-3xl font-bold text-white font-mono">{value}</p>
        {subtext && (
          <p
            className={`text-xs mt-1 font-mono ${subtext.startsWith("+") ? "text-[#00FF94]" : subtext.startsWith("-") ? "text-red-400" : "text-gray-600"}`}
          >
            {subtext}
          </p>
        )}
      </div>
      <div
        className="w-12 h-12 rounded-sm flex items-center justify-center border"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
    </div>
    <Progress
      value={Math.min(progress, 100)}
      className="mt-4 h-1 bg-white/5"
      indicatorClassName="bg-[#FFD700]"
    />
  </motion.div>
);

const CompanyAdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [dashboardData, setDashboardData] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState({});
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [processingApproval, setProcessingApproval] = useState(null);
  const [registrationIncomplete, setRegistrationIncomplete] = useState(false);

  // Security guard: Check if company_admin has completed registration
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      // Check if user has companyId (indicates completed registration)
      if (user?.role === "company_admin" && !user?.companyId) {
        // Check for pending registration in sessionStorage
        const pendingRegistration = sessionStorage.getItem("pendingCompanyRegistration");

        if (!pendingRegistration) {
          // No company and no pending registration - redirect to pricing
          console.log("⚠️ Company admin without company - redirecting to pricing");
          setRegistrationIncomplete(true);
          toast.error("Please complete your company registration first");
          navigate("/company/pricing", {
            replace: true,
            state: { fromIncompleteRegistration: true }
          });
          return;
        }
      }
    };

    if (user) {
      checkRegistrationStatus();
    }
  }, [user, navigate]);

  useEffect(() => {
    // Only fetch data if registration is complete
    if (!registrationIncomplete && user?.companyId) {
      fetchDashboardData();
      fetchRecruiters();
      fetchPendingApprovals();
    } else if (!user?.companyId && user?.role === "company_admin") {
      // Don't fetch, will redirect
      setLoading(false);
    } else {
      fetchDashboardData();
      fetchRecruiters();
      fetchPendingApprovals();
    }
  }, [registrationIncomplete, user]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${COMPANY_API_END_POINT}/dashboard`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecruiters = async () => {
    try {
      const response = await axios.get(`${COMPANY_API_END_POINT}/recruiters`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setRecruiters(response.data.recruiters);
      }
    } catch (error) {
      console.error("Recruiters fetch error:", error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await axios.get(
        `${COMPANY_API_END_POINT}/pending-approvals`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setPendingApprovals(response.data.pendingApprovals);
      }
    } catch (error) {
      console.error("Pending approvals fetch error:", error);
    }
  };

  const handleApproval = async (applicationId, decision) => {
    setProcessingApproval(applicationId);
    try {
      const response = await axios.post(
        `${COMPANY_API_END_POINT}/candidates/${applicationId}/approve`,
        { decision, notes: approvalNotes },
        { withCredentials: true },
      );
      if (response.data.success) {
        toast.success(response.data.message);
        setApprovalNotes("");
        fetchPendingApprovals();
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to process approval",
      );
    } finally {
      setProcessingApproval(null);
    }
  };

  const updateCompanyProfile = async () => {
    setUpdatingProfile(true);
    try {
      const response = await axios.put(
        `${COMPANY_API_END_POINT}/profile`,
        companyProfile,
        { withCredentials: true },
      );
      if (response.data.success) {
        toast.success("Company profile updated");
        setProfileDialogOpen(false);
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleInviteRecruiter = async () => {
    if (!inviteEmail) {
      toast.error("Email is required");
      return;
    }

    setInviting(true);
    try {
      const response = await axios.post(
        `${COMPANY_API_END_POINT}/recruiters/invite`,
        {
          email: inviteEmail,
          name: inviteName,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteDialogOpen(false);
        setInviteEmail("");
        setInviteName("");
        fetchRecruiters();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveRecruiter = async (recruiterId) => {
    try {
      const response = await axios.delete(
        `${COMPANY_API_END_POINT}/recruiters/${recruiterId}`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        toast.success("Recruiter removed");
        fetchRecruiters();
      }
    } catch (error) {
      toast.error("Failed to remove recruiter");
    }
  };

  const handleResendInvite = async (recruiterId) => {
    try {
      const response = await axios.post(
        `${COMPANY_API_END_POINT}/recruiters/${recruiterId}/resend-invite`,
        {},
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        toast.success("Invitation resent");
      }
    } catch (error) {
      toast.error("Failed to resend invitation");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-[#FFD700]/30 rounded-sm" />
            <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] rounded-sm animate-spin" />
          </div>
          <p className="text-[#FFD700]/70 font-mono text-sm uppercase tracking-wider">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const company = dashboardData?.company;
  const subscription = company?.subscription;
  const usage = company?.usage || {};
  const features = company?.features || {};

  const usagePercentage =
    features.maxJobPostings === "Unlimited" || features.maxJobPostings === -1
      ? 10
      : (usage.activeJobs / features.maxJobPostings) * 100;

  const recruiterPercentage =
    features.maxRecruiters === "Unlimited" || features.maxRecruiters === -1
      ? 10
      : (company?.recruitersCount / features.maxRecruiters) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
      <Navbar />

      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 py-8 pt-24 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-10 gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#FFD700] rounded-sm flex items-center justify-center">
              {company?.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-full h-full object-cover rounded-sm"
                />
              ) : (
                <Building2 className="w-8 h-8 text-black" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {company?.name || "Company Dashboard"}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge
                  className={`rounded-sm text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 ${subscription?.isActive
                      ? "bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30"
                      : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                >
                  {subscription?.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge className="rounded-sm text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30">
                  <Crown className="w-3 h-3 mr-1" />
                  {subscription?.planDetails?.name || "Basic"} Plan
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LiveIndicator />
            <Button
              variant="outline"
              className="border-white/10 text-gray-400 hover:bg-white/5 hover:border-[#FFD700]/30 rounded-sm font-mono text-xs uppercase tracking-wider"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => navigate("/admin/jobs/create")}
              className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold text-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post Job
            </Button>
            <WriteReviewButton className="rounded-sm text-xs" />
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <IndustrialStatCard
            label="Active Jobs"
            value={usage.activeJobs || 0}
            subtext={`of ${features.maxJobPostings === -1 ? "∞" : features.maxJobPostings}`}
            icon={Briefcase}
            delay={0.1}
            progress={
              features.maxJobPostings > 0
                ? ((usage.activeJobs || 0) / features.maxJobPostings) * 100
                : 30
            }
          />
          <IndustrialStatCard
            label="Team Members"
            value={company?.recruitersCount || 0}
            subtext={`of ${features.maxRecruiters === -1 ? "∞" : features.maxRecruiters}`}
            icon={Users}
            delay={0.15}
            progress={
              features.maxRecruiters > 0
                ? ((company?.recruitersCount || 0) / features.maxRecruiters) *
                100
                : 20
            }
            color="#3B82F6"
          />
          <IndustrialStatCard
            label="Total Applications"
            value={usage.totalApplications || 0}
            subtext={
              usage.applicationGrowth
                ? `${usage.applicationGrowth > 0 ? "+" : ""}${usage.applicationGrowth}% this month`
                : "No growth data"
            }
            icon={TrendingUp}
            delay={0.2}
            progress={Math.min((usage.totalApplications || 0) / 10, 100)}
            color="#8B5CF6"
          />
          <IndustrialStatCard
            label="Interviews Conducted"
            value={usage.interviewsConducted || 0}
            subtext={`${usage.hiresThisMonth || 0} hires this month`}
            icon={Video}
            delay={0.25}
            progress={Math.min((usage.interviewsConducted || 0) / 5, 100)}
            color="#00FF94"
          />
        </div>

        {/* Quick Actions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Terminal className="w-4 h-4 text-[#FFD700]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Quick Actions
            </h2>
          </div>
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
                color: "#FFD700",
              },
              {
                icon: Video,
                label: "Interviews",
                path: "/admin/interviews",
                color: "#FFD700",
              },
              {
                icon: BarChart3,
                label: "Analytics",
                path: "/admin/analytics",
                color: "#FFD700",
              },
            ].map((action, idx) => (
              <motion.button
                key={idx}
                onClick={() => navigate(action.path)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + idx * 0.05 }}
                className="relative p-6 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[120px]"
              >
                {/* Corner accents */}
                <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/50 transition-colors" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-white/10 group-hover:border-[#FFD700]/50 transition-colors" />

                <div className="w-10 h-10 flex items-center justify-center">
                  <action.icon className="w-6 h-6 text-[#FFD700] group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-gray-400 group-hover:text-[#FFD700] transition-colors">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Subscription Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative p-6 bg-[#111111] border border-[#FFD700]/20 rounded-sm"
          >
            {/* Corner accents */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#FFD700]/30" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#FFD700]/30" />

            <div className="flex items-center gap-2 mb-6">
              <Crown className="w-5 h-5 text-[#FFD700]" />
              <h3 className="text-lg font-bold text-white">Subscription</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm font-mono">
                  Current Plan
                </span>
                <Badge className="bg-[#FFD700] text-black text-xs font-bold rounded-sm px-2">
                  {subscription?.planDetails?.name || "Basic"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm font-mono">Status</span>
                <span
                  className={`text-sm font-mono ${subscription?.isActive ? "text-[#00FF94]" : "text-red-400"}`}
                >
                  {subscription?.isActive ? "Active" : "Expired"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm font-mono">
                  Days Remaining
                </span>
                <span className="text-white font-bold font-mono">
                  {subscription?.daysRemaining || 0} days
                </span>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <Button
                onClick={() => navigate("/company/pricing")}
                className="w-full bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold text-xs uppercase tracking-wider"
              >
                <Zap className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/10 text-gray-400 hover:bg-white/5 rounded-sm font-mono text-xs uppercase tracking-wider"
                onClick={() => navigate("/company/billing")}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                View Billing
              </Button>
            </div>
          </motion.div>

          {/* Team Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-2 relative p-6 bg-[#111111] border border-white/10 rounded-sm"
          >
            {/* Corner accents */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/10" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Team Members</h3>
                <p className="text-gray-500 text-sm">
                  Manage your recruiters and their permissions
                </p>
              </div>
              <Dialog
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold text-xs uppercase tracking-wider">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111111] border-white/10 rounded-sm">
                  <DialogHeader>
                    <DialogTitle className="text-white font-bold">
                      Invite Recruiter
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                      Send an invitation to add a new team member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label
                        htmlFor="email"
                        className="text-gray-400 text-xs uppercase tracking-wider font-mono"
                      >
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="recruiter@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="bg-white/5 border-white/10 text-white mt-2 rounded-sm font-mono"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="name"
                        className="text-gray-400 text-xs uppercase tracking-wider font-mono"
                      >
                        Name (Optional)
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white mt-2 rounded-sm font-mono"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                      className="border-white/10 text-gray-400 rounded-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInviteRecruiter}
                      disabled={inviting}
                      className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold"
                    >
                      {inviting ? "Sending..." : "Send Invitation"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {recruiters.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                  <p className="text-gray-500 font-mono">No team members yet</p>
                  <p className="text-gray-600 text-sm">
                    Invite recruiters to help manage applications
                  </p>
                </div>
              ) : (
                recruiters.map((recruiter) => (
                  <div
                    key={recruiter._id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-sm border border-white/5 hover:border-[#FFD700]/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10 rounded-sm">
                        <AvatarImage
                          src={recruiter.userId?.profile?.profilePhoto}
                        />
                        <AvatarFallback className="bg-[#FFD700]/10 text-[#FFD700] rounded-sm font-bold">
                          {(recruiter.name || recruiter.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">
                          {recruiter.name || recruiter.email.split("@")[0]}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">
                          {recruiter.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`rounded-sm text-[10px] font-mono uppercase ${recruiter.status === "active"
                            ? "bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30"
                            : "bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30"
                          }`}
                      >
                        {recruiter.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-white"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#111111] border-white/10 rounded-sm">
                          {recruiter.status === "invited" && (
                            <DropdownMenuItem
                              onClick={() => handleResendInvite(recruiter._id)}
                              className="text-gray-300 focus:bg-white/5"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Resend Invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemoveRecruiter(recruiter._id)}
                            className="text-red-400 focus:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Pending Approvals - CEO Exclusive */}
        {pendingApprovals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 relative p-6 bg-[#111111] border border-orange-500/30 rounded-sm"
          >
            {/* Corner accents */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-orange-500/30" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-orange-500/30" />

            <div className="flex items-center gap-3 mb-6">
              <UserCheck className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-white">
                Pending Approvals
              </h3>
              <Badge className="bg-orange-500 text-black text-xs font-bold rounded-sm px-2">
                {pendingApprovals.length}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Candidates passed by recruiters for your final decision
            </p>

            <div className="space-y-4">
              {pendingApprovals.map((application) => (
                <div
                  key={application._id}
                  className="p-4 bg-white/5 rounded-sm border border-white/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 rounded-sm">
                        <AvatarImage
                          src={application.applicant?.profile?.profilePhoto}
                        />
                        <AvatarFallback className="bg-orange-500/10 text-orange-400 rounded-sm font-bold">
                          {application.applicant?.fullname?.[0]?.toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-semibold">
                          {application.applicant?.fullname}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">
                          {application.applicant?.email}
                        </p>
                        <Badge className="mt-1 rounded-sm text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                          {application.job?.title}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600 font-mono">
                        Passed by
                      </p>
                      <p className="text-sm text-gray-400">
                        {application.recruiterReview?.reviewedBy?.fullname ||
                          "Recruiter"}
                      </p>
                    </div>
                  </div>

                  {application.recruiterReview?.notes && (
                    <div className="mt-3 p-3 bg-white/5 rounded-sm border border-white/5">
                      <p className="text-xs text-gray-600 mb-1 font-mono uppercase tracking-wider">
                        Recruiter Notes:
                      </p>
                      <p className="text-sm text-gray-400">
                        {application.recruiterReview.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <Input
                      placeholder="Add notes (optional)"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="flex-1 bg-white/5 border-white/10 text-white rounded-sm font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(`/ceo/reports/${application.interviewId}`)
                      }
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-sm text-xs uppercase tracking-wider"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View Report
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleApproval(application._id, "approved")
                      }
                      disabled={processingApproval === application._id}
                      className="bg-[#00FF94] hover:bg-[#00FF94]/80 text-black rounded-sm font-bold text-xs uppercase tracking-wider"
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Hire
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleApproval(application._id, "rejected")
                      }
                      disabled={processingApproval === application._id}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm text-xs uppercase tracking-wider"
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#FFD700]" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Briefcase, label: "View Jobs", route: "/admin/jobs" },
              {
                icon: Eye,
                label: "Applications",
                route: "/admin/applications",
              },
              { icon: Video, label: "Interviews", route: "/admin/interviews" },
              {
                icon: BarChart3,
                label: "Analytics",
                route: "/admin/analytics",
              },
            ].map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-3 bg-[#111111] border-white/10 hover:bg-white/5 hover:border-[#FFD700]/30 rounded-sm transition-all group"
                onClick={() => navigate(action.route)}
              >
                <action.icon className="w-6 h-6 text-[#FFD700] group-hover:scale-110 transition-transform" />
                <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">
                  {action.label}
                </span>
              </Button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompanyAdminDashboard;
