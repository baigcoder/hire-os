import React, { useEffect, useCallback } from "react";
import Navbar from "../shared/Navbar";
import { useSelector, useDispatch } from "react-redux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import InterviewCard from "./InterviewCard";
import useGetAppliedJobs from "@/hooks/useGetAppliedJobs";
import { useSupabaseDashboard } from "@/hooks/useSupabaseDashboard";
import { toast } from "sonner";
import { setAllAppliedJobs } from "@/redux/jobSlice";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";

const AppliedJobs = () => {
  const dispatch = useDispatch();

  // Use the custom hook to fetch applied jobs
  useGetAppliedJobs();

  // Get applications from Redux store
  const { allAppliedJobs } = useSelector((store) => store.job);
  const applications = allAppliedJobs || [];
  const { user } = useSelector((store) => store.auth);
  const loading = !allAppliedJobs;

  // Refetch applications function
  const refetchApplications = useCallback(async () => {
    try {
      const res = await axios.get(`${APPLICATION_API_END_POINT}/get`, {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAllAppliedJobs(res.data.applications));
      }
    } catch (error) {
      console.error("Error refetching applications:", error);
    }
  }, [dispatch]);

  // Subscribe to real-time interview updates
  useSupabaseDashboard({
    onInterviewScheduled: (payload) => {
      console.log("🎯 Interview scheduled received:", payload);
      toast.success(
        `🎉 Interview Scheduled! ${payload.jobTitle} at ${payload.companyName}`,
        {
          description: `Date: ${new Date(payload.scheduledAt).toLocaleDateString()}`,
          action: {
            label: "View",
            onClick: () => window.location.reload(),
          },
        }
      );
      // Refetch applications to update the list
      refetchApplications();
    },
  });

  // Filter applications by status
  const pendingApplications = applications.filter((app) =>
    ["pending", "under_review", "reviewing"].includes(app.status),
  );
  const acceptedApplications = applications.filter((app) =>
    ["accepted", "hired", "offer_accepted", "offer_sent"].includes(app.status),
  );
  const rejectedApplications = applications.filter((app) =>
    app.status === "rejected",
  );
  const interviewApplications = applications.filter((app) =>
    [
      "interview",
      "mcq_pending",
      "mcq_passed",
      "video_scheduled",
      "video_completed",
    ].includes(app.status),
  );

  const getStatusConfig = (status) => {
    const s = status?.toLowerCase() || "";
    if (["pending", "under_review", "reviewing"].includes(s))
      return { bg: "bg-gray-500/10", text: "text-gray-400", label: "Applied" };
    if (["accepted", "hired", "offer_accepted", "offer_sent"].includes(s))
      return { bg: "bg-[#172a1d]", text: "text-[#3fc07a]", label: "Accepted" };
    if (s === "rejected")
      return { bg: "bg-white/5", text: "text-gray-400", label: "Not selected" };
    return { bg: "bg-primary/10", text: "text-primary", label: status[0].toUpperCase() + status.slice(1).replace("_", " ") };
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif]">
      <Navbar />
      <div className="relative">
        <div className="app-title-row">
          <h1 className="app-h1">Applications</h1>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 bg-card border border-white/10 p-1 rounded-sm flex-wrap h-auto">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-sm text-gray-500 text-xs py-2 px-4"
            >
              All ({applications.length})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-sm text-gray-500 text-xs py-2 px-4"
            >
              Applied ({pendingApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="accepted"
              className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-sm text-gray-500 text-xs py-2 px-4"
            >
              Accepted ({acceptedApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-sm text-gray-500 text-xs py-2 px-4"
            >
              Not selected ({rejectedApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="interview"
              className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-sm text-gray-500 text-xs py-2 px-4"
            >
              Interviews ({interviewApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {loading ? (
              <div className="text-center py-20 text-xs text-gray-500 loader-dots">
                Loading…
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-card border border-white/10 rounded-sm p-12 text-center">
                <p className="text-gray-500 text-xs">
                  No applications yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ...interviewApplications,
                  ...pendingApplications,
                  ...acceptedApplications,
                  ...rejectedApplications,
                ].map((application) => {
                  const isInterview = [
                    "interview",
                    "mcq_pending",
                    "mcq_passed",
                    "video_scheduled",
                    "video_completed",
                  ].includes(application.status);

                  if (isInterview) {
                    return (
                      <InterviewCard
                        key={application._id}
                        application={application}
                      />
                    );
                  }

                  const config = getStatusConfig(application.status);
                  return (
                    <div
                      key={application._id}
                      className="bg-background border border-white/10 rounded-sm p-5 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">
                            {application.job?.title}
                          </h3>
                          <p className="text-primary text-xs opacity-80">
                            {application.job?.company?.name}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs border ${config.bg} ${config.text} border-current/20 rounded-sm`}
                        >
                          {config.label}
                        </span>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          APPLICATION ID: {application._id.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="interview" className="mt-0">
            {interviewApplications.length === 0 ? (
              <div className="bg-card border border-white/10 rounded-sm p-12 text-center">
                <p className="text-gray-500 text-xs">
                  No interviews scheduled.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {interviewApplications.map((application) => (
                  <InterviewCard
                    key={application._id}
                    application={application}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApplications.map((application) => {
                const config = getStatusConfig(application.status);
                return (
                  <div
                    key={application._id}
                    className="bg-background border border-white/10 rounded-sm p-5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white">
                          {application.job?.title}
                        </h3>
                        <p className="text-primary text-xs">
                          {application.job?.company?.name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs border ${config.bg} ${config.text} border-current/20 rounded-sm`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="accepted" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {acceptedApplications.map((application) => {
                const config = getStatusConfig(application.status);
                return (
                  <div
                    key={application._id}
                    className="bg-background border border-white/10 rounded-sm p-5 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.3)]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white">
                          {application.job?.title}
                        </h3>
                        <p className="text-primary text-xs">
                          {application.job?.company?.name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs border ${config.bg} ${config.text} border-current/20 rounded-sm`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedApplications.map((application) => {
                const config = getStatusConfig(application.status);
                return (
                  <div
                    key={application._id}
                    className="bg-background border border-white/10 rounded-sm p-5 opacity-60"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white">
                          {application.job?.title}
                        </h3>
                        <p className="text-primary text-xs">
                          {application.job?.company?.name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs border ${config.bg} ${config.text} border-current/20 rounded-sm`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AppliedJobs;
