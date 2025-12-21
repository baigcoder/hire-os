import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";

const ApplicantTrackingCard = ({ applications = [] }) => {
  const navigate = useNavigate();

  // Group applications by status
  const getApplicationsByStatus = () => {
    const statusGroups = {
      pending: [],
      accepted: [],
      rejected: [],
      interview: [],
    };

    applications.forEach((app) => {
      if (statusGroups[app.status]) {
        statusGroups[app.status].push(app);
      }
    });

    return statusGroups;
  };

  const statusGroups = getApplicationsByStatus();

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "interview":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "interview":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Applicant Tracking</CardTitle>
        <CardDescription>
          Monitor and manage candidate applications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(statusGroups).map(([status, apps]) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4 text-center">
              <Badge className={getStatusColor(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              <p className="text-2xl font-bold mt-2">{apps.length}</p>
              <p className="text-xs text-gray-500">applications</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Recent Activity</h3>

          {applications.length > 0 ? (
            applications
              .sort(
                (a, b) =>
                  new Date(b.updatedAt || b.createdAt) -
                  new Date(a.updatedAt || a.createdAt),
              )
              .slice(0, 5)
              .map((app, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-1">
                      {getStatusIcon(app.status)}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {app.user?.fullname || "Applicant"}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {app.job?.title || "Job Position"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(app.status)}>
                      {typeof app.status === "string" && app.status.length > 0
                        ? app.status.charAt(0).toUpperCase() +
                          app.status.slice(1)
                        : "Unknown"}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(app.updatedAt || app.createdAt)}
                    </p>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              No recent application activity
            </p>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full mt-4 flex items-center justify-center gap-2"
          onClick={() => navigate("/admin/jobs")}
        >
          View All Applications <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ApplicantTrackingCard;
