import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { Calendar, Users, Briefcase, Clock, ArrowUpRight, PlusCircle, BarChart3, TrendingUp, CheckCircle, XCircle, Bell, Filter, Search, Award, Building, Target, MapPin, Star, Zap, Globe, Phone, Mail } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import JobStatisticsCard from './JobStatisticsCard';
import ApplicantTrackingCard from './ApplicantTrackingCard';
import InterviewSchedulingCard from './InterviewSchedulingCard';
import QuickActionCard from './QuickActionCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
// import { Progress } from "../ui/progress";

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { allAdminJobs } = useSelector(store => store.job);
  const { user } = useSelector(store => store.auth);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplicants: 0,
    pendingInterviews: 0,
    recentApplications: [],
    applicationsByStatus: [],
    upcomingInterviews: []
  });

  // Colors for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    if (allAdminJobs) {
      // Calculate dashboard statistics
      const totalJobs = allAdminJobs.length;
      const activeJobs = allAdminJobs.filter(job => job.isActive).length;

      let totalApplicants = 0;
      let pendingInterviews = 0;
      let recentApplications = [];
      let upcomingInterviews = [];

      // Count applications by status
      const statusCounts = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        interview: 0
      };

      // Process job applications
      allAdminJobs.forEach(job => {
        if (job.applications) {
          totalApplicants += job.applications.length;

          job.applications.forEach(app => {
            // Count by status
            if (statusCounts[app.status] !== undefined) {
              statusCounts[app.status]++;
            }

            // Count pending interviews
            if (app.status === 'interview' && app.interviewDetails && !app.interviewDetails.completed) {
              pendingInterviews++;

              // Add to upcoming interviews if date is in the future
              const interviewDate = new Date(app.interviewDetails.date);
              if (interviewDate > new Date()) {
                upcomingInterviews.push({
                  applicantName: app.user?.fullname || 'Applicant',
                  jobTitle: job.title,
                  date: app.interviewDetails.date,
                  id: app._id
                });
              }
            }

            // Add to recent applications (last 5)
            recentApplications.push({
              applicantName: app.user?.fullname || 'Applicant',
              jobTitle: job.title,
              status: app.status,
              date: app.createdAt,
              id: app._id
            });
          });
        }
      });

      // Sort recent applications by date (newest first) and take only 5
      recentApplications.sort((a, b) => new Date(b.date) - new Date(a.date));
      recentApplications = recentApplications.slice(0, 5);

      // Sort upcoming interviews by date (soonest first)
      upcomingInterviews.sort((a, b) => new Date(a.date) - new Date(b.date));
      upcomingInterviews = upcomingInterviews.slice(0, 3);

      // Format data for pie chart
      const applicationsByStatus = [
        { name: 'Pending', value: statusCounts.pending },
        { name: 'Accepted', value: statusCounts.accepted },
        { name: 'Rejected', value: statusCounts.rejected },
        { name: 'Interview', value: statusCounts.interview }
      ];

      setStats({
        totalJobs,
        activeJobs,
        totalApplicants,
        pendingInterviews,
        recentApplications,
        applicationsByStatus,
        upcomingInterviews
      });
    }
  }, [allAdminJobs]);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'interview': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Pakistan's top companies data
  const topPakistanCompanies = [
    {
      id: 1,
      name: "Systems Limited",
      logo: "https://www.systemsltd.com/themes/systems/images/systems-logo.svg",
      industry: "Information Technology",
      location: "Lahore, Pakistan",
      employees: "5,000+",
      openings: 12,
      rating: 4.5,
      description: "Pakistan's premier technology company providing innovative IT solutions globally."
    },
    {
      id: 2,
      name: "K-Electric",
      logo: "https://upload.wikimedia.org/wikipedia/en/thumb/8/83/K-Electric_logo.svg/1200px-K-Electric_logo.svg.png",
      industry: "Energy & Utilities",
      location: "Karachi, Pakistan",
      employees: "10,000+",
      openings: 8,
      rating: 4.2,
      description: "Pakistan's only vertically-integrated power utility, serving Karachi and its surrounding areas."
    },
    {
      id: 3,
      name: "Engro Corporation",
      logo: "https://www.engro.com/images/logo.png",
      industry: "Conglomerate",
      location: "Karachi, Pakistan",
      employees: "7,500+",
      openings: 15,
      rating: 4.7,
      description: "One of Pakistan's largest conglomerates with businesses in fertilizers, foods, energy, and petrochemicals."
    },
    {
      id: 4,
      name: "Jazz",
      logo: "https://jazz.com.pk/assets/images/section-jazz-logo.png",
      industry: "Telecommunications",
      location: "Islamabad, Pakistan",
      employees: "8,000+",
      openings: 10,
      rating: 4.3,
      description: "Pakistan's leading digital communications company, offering voice, data, and digital services."
    }
  ];

  // Application trend data for line chart
  const applicationTrendData = [
    { name: 'Jan', applications: 65 },
    { name: 'Feb', applications: 80 },
    { name: 'Mar', applications: 95 },
    { name: 'Apr', applications: 75 },
    { name: 'May', applications: 110 },
    { name: 'Jun', applications: 145 },
    { name: 'Jul', applications: 130 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Enhanced Personalized Recruiter Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 my-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            <Avatar className="h-20 w-20 border-4 border-white/30 shadow-lg">
              <AvatarImage src={user?.profilePicture || "https://ui-avatars.com/api/?name=" + user?.fullname} />
              <AvatarFallback>{user?.fullname?.charAt(0) || "R"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white hover:bg-white/30 transition-colors">
                  <Users className="h-3 w-3 mr-1" /> Recruiter
                </Badge>
                <Badge className="bg-green-500/80 text-white hover:bg-green-500/90 transition-colors">
                  <CheckCircle className="h-3 w-3 mr-1" /> Active
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">Welcome, {user?.fullname || 'Recruiter'}!</h1>
              <p className="text-indigo-100 text-sm mt-1">Manage your recruitment pipeline efficiently</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <p className="text-sm text-indigo-100">{user?.email || 'recruiter@example.com'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <p className="text-sm text-indigo-100">Pakistan</p>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <p className="text-sm text-indigo-100">{user?.company?.name || 'Your Company'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            {user?.role === 'company_admin' ? (
              <Button
                onClick={() => navigate('/admin/jobs/create')}
                className="bg-white text-indigo-700 hover:bg-indigo-50 w-full md:w-auto shadow-md"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Post New Job
              </Button>
            ) : (
              <Button
                disabled
                className="bg-white/50 text-gray-500 w-full md:w-auto shadow-md cursor-not-allowed"
                title="Only CEOs can post jobs"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Post New Job (CEO Only)
              </Button>
            )}

            <div className="relative mt-3 md:mt-0">
              <Button variant="outline" size="icon" className="rounded-full bg-white/20 hover:bg-white/30 border-none">
                <Bell className="h-5 w-5 text-white" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.recentApplications.length}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Dashboard Summary with Improved Tracking Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <Briefcase className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Jobs</p>
            <p className="text-xl font-bold text-indigo-700">{stats.activeJobs}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Applicants</p>
            <p className="text-xl font-bold text-purple-700">{stats.totalApplicants}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Interviews</p>
            <p className="text-xl font-bold text-blue-700">{stats.pendingInterviews}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
          <div className="bg-white p-3 rounded-full shadow-sm">
            <Target className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Conversion Rate</p>
            <p className="text-xl font-bold text-emerald-700">{stats.totalApplicants > 0 ? Math.round((stats.applicationsByStatus.find(s => s.name === 'Accepted')?.value || 0) / stats.totalApplicants * 100) : 0}%</p>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-3">
          <Card className="h-full shadow-md border-indigo-100">
            <CardHeader className="pb-2 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-lg font-medium flex items-center">
                <Target className="h-5 w-5 mr-2 text-indigo-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className={`h-auto py-3 flex flex-col items-center justify-center gap-2 border-indigo-100 ${user?.role === 'company_admin'
                      ? 'hover:bg-indigo-50 hover:text-indigo-700'
                      : 'opacity-50 cursor-not-allowed'
                    }`}
                  onClick={() => user?.role === 'company_admin' && navigate('/admin/jobs/create')}
                  disabled={user?.role !== 'company_admin'}
                  title={user?.role !== 'company_admin' ? 'Only CEOs can post jobs' : ''}
                >
                  <div className="bg-indigo-100 p-2 rounded-full">
                    <PlusCircle className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span>Post Job</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:text-purple-700 border-purple-100"
                  onClick={() => navigate('/admin/jobs')}
                >
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <span>Applications</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-700 border-blue-100"
                  onClick={() => navigate('/admin/jobs')}
                >
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <span>Interviews</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:text-green-700 border-green-100"
                  onClick={() => navigate('/admin/companies')}
                >
                  <div className="bg-green-100 p-2 rounded-full">
                    <Building className="h-5 w-5 text-green-600" />
                  </div>
                  <span>Companies</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="group hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <Clock className="h-4 w-4 text-amber-500 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-amber-700">
                  {stats.recentApplications.length}
                </div>
                <p className="text-xs text-gray-500">new applications</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables - Enhanced Tracking UI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Applications by Status */}
        <Card className="lg:col-span-1 hover:shadow-md transition-all duration-300 border border-gray-200">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center">
              <div className="mr-2 rounded-full bg-indigo-100 p-1">
                <PieChart className="h-4 w-4 text-indigo-600" />
              </div>
              Applications by Status
            </CardTitle>
            <CardDescription>Distribution of all applications</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
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
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.applicationsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} applications`, null]}
                    contentStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: 'none'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stats.applicationsByStatus.map((status, index) => (
                <div key={index} className="flex items-center text-sm">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-gray-700">{status.name}: </span>
                  <span className="font-medium ml-1">{status.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card className="lg:col-span-2 hover:shadow-md transition-all duration-300 border border-gray-200">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center">
              <div className="mr-2 rounded-full bg-green-100 p-1">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              Recent Applications
            </CardTitle>
            <CardDescription>Latest candidates who applied</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {stats.recentApplications.length > 0 ? (
                stats.recentApplications.map((app, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                        {typeof app.applicantName === 'string' && app.applicantName.length > 0 ? app.applicantName.charAt(0) : '?'}
                      </div>
                      <div>
                        <h3 className="font-medium">{app.applicantName || 'N/A'}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Briefcase className="h-3 w-3 mr-1" /> {app.jobTitle || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getStatusColor(app.status)} px-3 py-1`}>
                        {typeof app.status === 'string' && app.status.length > 0 ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Unknown'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1 flex items-center justify-end">
                        <Clock className="h-3 w-3 mr-1" /> {formatDate(app.date)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No recent applications</p>
                  <p className="text-sm text-gray-400 mt-1">New applications will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-gray-50">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              onClick={() => navigate('/admin/jobs')}
            >
              View All Applications <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Top Pakistani Companies Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Top Pakistani Companies</h2>
            <p className="text-gray-500">Leading employers with active job openings</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/companies')}>
            View All Companies
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Add console log here */}
          {console.log('Rendering Top Pakistani Companies:', topPakistanCompanies)}
          {topPakistanCompanies.map(company => (
            <Card key={company.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gray-50 flex items-center justify-center p-4 border-b">
                <img
                  src={company.logo}
                  alt={`${company.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium ml-1">{company.rating}</span>
                  </div>
                </div>
                <CardDescription className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> {company.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-sm text-gray-600 mb-2">{company.description}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <Briefcase className="h-3 w-3 mr-1 text-gray-500" />
                    <span>{company.industry}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1 text-gray-500" />
                    <span>{company.employees}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex items-center justify-between">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  {company.openings} Open Positions
                </Badge>
                <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Enhanced Job Statistics and Applicant Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="hover:shadow-md transition-all duration-300 border border-indigo-100 rounded-xl overflow-hidden">
          <JobStatisticsCard jobs={allAdminJobs} />
        </div>
        <div className="hover:shadow-md transition-all duration-300 border border-indigo-100 rounded-xl overflow-hidden">
          <ApplicantTrackingCard applications={allAdminJobs.flatMap(job => job.applications || [])} />
        </div>
      </div>

      {/* Top Talent Pool */}
      <div className="mb-6">
        <Card className="hover:shadow-md transition-all duration-300 overflow-hidden border border-indigo-100">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 text-emerald-600 mr-2" />
              Top Talent Pool
            </CardTitle>
            <CardDescription>Track and manage your best candidates</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium mr-3">A</div>
                    <div>
                      <h3 className="font-medium">Ahmed Khan</h3>
                      <p className="text-sm text-gray-500">Full Stack Developer</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 px-2">Top Match</Badge>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <p>Skills: React, Node.js, MongoDB</p>
                  <p>Experience: 5 years</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">View Profile</Button>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium mr-3">F</div>
                    <div>
                      <h3 className="font-medium">Fatima Ali</h3>
                      <p className="text-sm text-gray-500">UI/UX Designer</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 px-2">Recommended</Badge>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <p>Skills: Figma, Adobe XD, Sketch</p>
                  <p>Experience: 3 years</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">View Profile</Button>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium mr-3">M</div>
                    <div>
                      <h3 className="font-medium">Muhammad Usman</h3>
                      <p className="text-sm text-gray-500">Data Scientist</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 px-2">Shortlisted</Badge>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <p>Skills: Python, TensorFlow, SQL</p>
                  <p>Experience: 4 years</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">View Profile</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Upcoming Interviews */}
      <div className="mb-6">
        <Card className="hover:shadow-md transition-all duration-300 overflow-hidden border border-indigo-100">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              Upcoming Interviews
            </CardTitle>
            <CardDescription>Schedule for the next few days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <InterviewSchedulingCard
              interviews={allAdminJobs.flatMap(job =>
                job.applications ?
                  job.applications.filter(app =>
                    app.status === 'interview' &&
                    app.interviewDetails &&
                    !app.interviewDetails.completed
                  ) : []
              )}
            />
          </CardContent>
        </Card>
      </div>



      {/* Application Trends Section */}
      <div className="mb-8">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center">
              <div className="mr-2 rounded-full bg-blue-100 p-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              Application Trends
            </CardTitle>
            <CardDescription>Monthly application statistics</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={applicationTrendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: 'none'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDashboard;