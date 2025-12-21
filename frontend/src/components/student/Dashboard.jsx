import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Briefcase,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
  TrendingUp,
  UserCheck,
  CalendarCheck,
} from "lucide-react";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";

const Dashboard = () => {
  const { user } = useSelector((store) => store.auth);
  const { allJobs } = useSelector((store) => store.job);
  const [stats, setStats] = useState({
    applied: 0,
    accepted: 0,
    rejected: 0,
    interviews: 0,
    pending: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);

  useEffect(() => {
    const fetchApplicationData = async () => {
      try {
        const res = await axios.get(`${APPLICATION_API_END_POINT}/get`, {
          withCredentials: true,
        });
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

          // Sort applications by date (newest first) and take the latest 3
          const sortedApplications = applications
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);
          setRecentApplications(sortedApplications);
        }
      } catch (error) {
        console.error("Error fetching application data:", error);
      }
    };

    if (user) {
      fetchApplicationData();
    }
  }, [user]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        );
      case "interview":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Interview
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto my-8 px-4 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.fullname.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your job search activity.
          </p>
        </div>
        <Link to="/profile">
          <Button variant="outline">View Profile</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Applications"
          value={stats.applied}
          icon={<FileText className="h-5 w-5 text-blue-500" />}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          color="yellow"
        />
        <StatCard
          title="Interviews"
          value={stats.interviews}
          icon={<CalendarCheck className="h-5 w-5 text-purple-500" />}
          color="purple"
        />
        <StatCard
          title="Accepted"
          value={stats.accepted}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          color="green"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Job Openings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Job Openings
            </CardTitle>
            <CardDescription>Latest opportunities posted.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allJobs.length > 0 ? (
                allJobs.slice(0, 4).map((job) => (
                  <Link
                    to={`/description/${job._id}`}
                    key={job._id}
                    className="block hover:bg-muted/50 p-3 rounded-lg border transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {job.company?.name} • {job.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {job.jobType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {job.salary} LPA
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent job openings found.
                </p>
              )}
            </div>
            {allJobs.length > 4 && (
              <div className="mt-4">
                <Link to="/jobs">
                  <Button variant="outline" className="w-full">
                    View All Jobs
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Recent Applications
            </CardTitle>
            <CardDescription>Your latest application updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.length > 0 ? (
                recentApplications.map((app) => (
                  <div
                    key={app._id}
                    className="flex items-center justify-between gap-2 p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {app.job?.title || "Job Title Missing"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent application updates.
                </p>
              )}
            </div>

            <div className="mt-6">
              <Link to="/applied-jobs">
                <Button variant="outline" className="w-full">
                  View All Applications
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper component for Stat Cards
const StatCard = ({ title, value, icon, color }) => (
  <Card className={`border-l-4 border-${color}-500`}>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-bold text-${color}-600`}>{value}</div>
    </CardContent>
  </Card>
);

export default Dashboard;
