import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import {
  Building,
  Users,
  Briefcase,
  TrendingUp,
  Award,
  Calendar,
  Mail,
  Phone,
  Globe,
  MapPin,
  Crown,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Download,
  Upload,
  Edit,
  Plus,
  Send,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Sparkles,
  Shield,
  AlertCircle,
  ArrowUpRight,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { COMPANY_API_END_POINT } from "@/utils/constant";
import DashboardLoader from "../shared/DashboardLoader";
import { useSelector } from "react-redux";

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await axios.get(`${COMPANY_API_END_POINT}/dashboard`, {
          withCredentials: true,
        });
        if (response.data.success) {
          // Transform API data to match component structure if needed, or update JSX
          // Here we map the API response to the expected structure
          const data = response.data.company;

          // Helper to format date
          const formatDate = (date) =>
            date ? new Date(date).toISOString().split("T")[0] : "";

          setCompanyData({
            companyName: data.name,
            companyEmail: data.email,
            companyPhone: data.phone || "N/A",
            companyWebsite: data.website || "",
            location: data.location || "N/A",
            industry: data.industry || "N/A",
            companySize: data.companySize || "N/A",
            logo: data.logo,
            subscription: {
              plan:
                data.subscription?.planDetails?.name?.toLowerCase() || "basic",
              billingCycle:
                data.subscription?.planDetails?.billingCycle || "monthly",
              status: data.subscription?.isActive ? "active" : "inactive",
              startDate: formatDate(data.subscription?.startDate),
              endDate: formatDate(data.subscription?.endDate),
              amount: data.subscription?.planDetails?.price || 0,
              features: {
                maxJobPostings: data.features?.maxJobPostings || 0,
                maxRecruiters: data.features?.maxRecruiters || 0,
                advancedAnalytics: data.features?.advancedAnalytics || false,
                prioritySupport: data.features?.prioritySupport || false,
                customBranding: data.features?.customBranding || false,
                aiRecommendations: data.features?.aiRecommendations || false,
              },
            },
            usage: {
              jobsPosted: data.usage?.jobsPosted || 0,
              activeRecruiters: data.recruitersCount || 0,
              totalApplications: data.usage?.totalApplications || 0,
              pendingApplications: data.usage?.pendingApplications || 0,
            },
            recruiters: data.recruiters.map((r) => ({
              id: r._id,
              name: r.name,
              email: r.email,
              status: r.status,
              joinedAt: r.joinedAt,
              jobsPosted: 0, // API doesn't return this per recruiter yet
            })),
            billingHistory: data.billingHistory || [],
          });
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        toast.error("Failed to load company dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, []);

  // Handle invite recruiter
  const handleInviteRecruiter = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("Please enter a valid email");
      return;
    }

    if (
      companyData.subscription.features.maxRecruiters !== -1 &&
      companyData.usage.activeRecruiters >=
        companyData.subscription.features.maxRecruiters
    ) {
      toast.error("Recruiter limit reached. Please upgrade your plan.");
      return;
    }

    try {
      const response = await axios.post(
        `${COMPANY_API_END_POINT}/recruiters/invite`,
        {
          email: inviteEmail,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        toast.success(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail("");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to invite recruiter",
      );
    }
  };

  if (loading) {
    return (
      <DashboardLoader type="recruiter" message="LOADING COMPANY DASHBOARD" />
    );
  }

  if (!companyData) return null;

  // Calculate usage percentages
  const jobUsagePercent =
    companyData.subscription.features.maxJobPostings === -1
      ? 0
      : (companyData.usage.jobsPosted /
          companyData.subscription.features.maxJobPostings) *
        100;
  const recruiterUsagePercent =
    companyData.subscription.features.maxRecruiters === -1
      ? 0
      : (companyData.usage.activeRecruiters /
          companyData.subscription.features.maxRecruiters) *
        100;

  // Format price
  const formatPrice = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get plan badge color
  const getPlanColor = (plan) => {
    switch (plan) {
      case "basic":
        return "bg-blue-100 text-blue-700";
      case "professional":
        return "bg-purple-100 text-purple-700";
      case "enterprise":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Get plan icon
  const getPlanIcon = (plan) => {
    switch (plan) {
      case "basic":
        return Briefcase;
      case "professional":
        return Zap;
      case "enterprise":
        return Crown;
      default:
        return Award;
    }
  };

  const PlanIcon = getPlanIcon(companyData.subscription.plan);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 mb-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-white/30 shadow-2xl ring-4 ring-white/20">
                <AvatarImage src={companyData.logo} />
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {companyData.companyName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-white/30">
                    <Building className="h-3 w-3 mr-1" /> Company
                  </Badge>
                  <Badge
                    className={`${getPlanColor(companyData.subscription.plan)} capitalize`}
                  >
                    <PlanIcon className="h-3 w-3 mr-1" />
                    {companyData.subscription.plan}
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {companyData.companyName}
                </h1>
                <p className="text-blue-50 text-lg mb-3">
                  Manage your recruitment and team
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-blue-50">
                      {companyData.companyEmail}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-blue-50">
                      {companyData.companyPhone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-blue-50">{companyData.location}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <Button
                onClick={() => navigate("/company/settings")}
                className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
                size="lg"
              >
                <Settings className="mr-2 h-5 w-5" /> Settings
              </Button>
              <Button
                onClick={() => navigate("/admin/jobs/create")}
                variant="outline"
                size="lg"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                <Plus className="mr-2 h-5 w-5" /> Post Job
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                <span>Jobs Posted</span>
                <Briefcase className="h-5 w-5 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {companyData.usage.jobsPosted}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {companyData.subscription.features.maxJobPostings === -1
                  ? "Unlimited"
                  : `of ${companyData.subscription.features.maxJobPostings} limit`}
              </p>
              <Progress value={jobUsagePercent} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                <span>Active Recruiters</span>
                <Users className="h-5 w-5 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                {companyData.usage.activeRecruiters}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {companyData.subscription.features.maxRecruiters === -1
                  ? "Unlimited"
                  : `of ${companyData.subscription.features.maxRecruiters} limit`}
              </p>
              <Progress value={recruiterUsagePercent} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                <span>Total Applications</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {companyData.usage.totalApplications}
              </div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                <span>Pending Review</span>
                <Clock className="h-5 w-5 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700">
                {companyData.usage.pendingApplications}
              </div>
              <p className="text-xs text-gray-500 mt-1">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subscription Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    Subscription Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Current Plan</p>
                        <p className="text-2xl font-bold capitalize">
                          {companyData.subscription.plan}
                        </p>
                      </div>
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Renews on</span>
                      <span className="font-semibold">
                        {formatDate(companyData.subscription.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Active Features:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {companyData.subscription.features.advancedAnalytics && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Advanced Analytics</span>
                        </div>
                      )}
                      {companyData.subscription.features.prioritySupport && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Priority Support</span>
                        </div>
                      )}
                      {companyData.subscription.features.customBranding && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Custom Branding</span>
                        </div>
                      )}
                      {companyData.subscription.features.aiRecommendations && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>AI Matching</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => navigate("/company/pricing")}
                    variant="outline"
                    className="w-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade Plan
                  </Button>
                </CardFooter>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => navigate("/admin/jobs/create")}
                    >
                      <Plus className="h-6 w-6 text-blue-500" />
                      <span className="text-sm font-medium">Post Job</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => navigate("/admin/jobs")}
                    >
                      <Briefcase className="h-6 w-6 text-purple-500" />
                      <span className="text-sm font-medium">View Jobs</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <BarChart3 className="h-6 w-6 text-green-500" />
                      <span className="text-sm font-medium">Analytics</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <Download className="h-6 w-6 text-amber-500" />
                      <span className="text-sm font-medium">Reports</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            {/* Invite Recruiter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  Invite Recruiter
                </CardTitle>
                <CardDescription>
                  Send an invitation to add a new recruiter to your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="recruiter@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleInviteRecruiter()
                    }
                  />
                  <Button onClick={handleInviteRecruiter}>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invite
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {companyData.usage.activeRecruiters} of{" "}
                  {companyData.subscription.features.maxRecruiters === -1
                    ? "Unlimited"
                    : companyData.subscription.features.maxRecruiters}{" "}
                  recruiters used
                </p>
              </CardContent>
            </Card>

            {/* Recruiters List */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your recruitment team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companyData.recruiters.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                      No recruiters found.
                    </p>
                  ) : (
                    companyData.recruiters.map((recruiter) => (
                      <div
                        key={recruiter.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {recruiter.name
                                ? recruiter.name.charAt(0)
                                : recruiter.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">
                              {recruiter.name || "Invited User"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {recruiter.email}
                            </p>
                            <p className="text-xs text-gray-400">
                              Joined {formatDate(recruiter.joinedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              recruiter.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {recruiter.status}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Plan</p>
                    <p className="text-xl font-bold capitalize">
                      {companyData.subscription.plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Billing Cycle</p>
                    <p className="text-xl font-bold capitalize">
                      {companyData.subscription.billingCycle}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Start Date</p>
                    <p className="font-semibold">
                      {formatDate(companyData.subscription.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      Next Billing Date
                    </p>
                    <p className="font-semibold">
                      {formatDate(companyData.subscription.endDate)}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Monthly Amount</span>
                    <span className="text-2xl font-bold">
                      {formatPrice(companyData.subscription.amount)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button variant="outline" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Change Plan
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>View your past transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companyData.billingHistory.length === 0 ? (
                    <p className="text-center text-gray-500">
                      No billing history available.
                    </p>
                  ) : (
                    companyData.billingHistory.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">
                            {bill.plan} - {bill.duration}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(bill.date)} • {bill.transactionId}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold">
                              {formatPrice(bill.amount)}
                            </p>
                            <Badge className="bg-green-100 text-green-700">
                              {bill.status}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CompanyDashboard;
