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
      return { bg: "bg-gray-500/10", text: "text-gray-400", label: "PENDING" };
    if (["accepted", "hired", "offer_accepted", "offer_sent"].includes(s))
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "ACCEPTED" };
    if (s === "rejected")
      return { bg: "bg-red-500/10", text: "text-red-400", label: "REJECTED" };
    return { bg: "bg-[#FFD700]/10", text: "text-[#FFD700]", label: status.toUpperCase().replace("_", " ") };
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="text-[#FFD700]">📋</span> MY APPLICATIONS
            </h1>
            <p className="text-gray-500 font-mono text-xs tracking-widest uppercase">
              System: Active • Applications: {applications.length}
            </p>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 bg-[#111111] border border-white/10 p-1 rounded-sm flex-wrap h-auto">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-sm text-gray-500 font-mono text-[10px] tracking-wider py-2 px-4"
            >
              ALL ({applications.length})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-sm text-gray-500 font-mono text-[10px] tracking-wider py-2 px-4"
            >
              PENDING ({pendingApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="accepted"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-sm text-gray-500 font-mono text-[10px] tracking-wider py-2 px-4"
            >
              ACCEPTED ({acceptedApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-sm text-gray-500 font-mono text-[10px] tracking-wider py-2 px-4"
            >
              REJECTED ({rejectedApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="interview"
              className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-black rounded-sm text-gray-500 font-mono text-[10px] tracking-wider py-2 px-4"
            >
              INTERVIEWS ({interviewApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {loading ? (
              <div className="text-center py-20 font-mono text-xs text-gray-500 loader-dots">
                INITIALIZING DATA STREAM...
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-[#111111] border border-white/10 rounded-sm p-12 text-center">
                <p className="text-gray-500 font-mono text-xs tracking-wider">
                  NO ACTIVE APPLICATIONS FOUND IN DATABASE
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
                      className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 hover:border-[#FFD700]/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-white group-hover:text-[#FFD700] transition-colors uppercase tracking-tight">
                            {application.job?.title}
                          </h3>
                          <p className="text-[#FFD700] text-xs font-mono tracking-wider opacity-80 uppercase">
                            {application.job?.company?.name}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-[10px] font-mono border ${config.bg} ${config.text} border-current/20 rounded-sm`}
                        >
                          {config.label}
                        </span>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-gray-600 font-mono uppercase">
                          APPLICATION ID: {application._id.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono uppercase">
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
              <div className="bg-[#111111] border border-white/10 rounded-sm p-12 text-center">
                <p className="text-gray-500 font-mono text-xs tracking-wider">
                  NO SCHEDULED INTERVIEWS DETECTED
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
                    className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white uppercase tracking-tight">
                          {application.job?.title}
                        </h3>
                        <p className="text-[#FFD700] text-xs font-mono uppercase">
                          {application.job?.company?.name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-mono border ${config.bg} ${config.text} border-current/20 rounded-sm`}>
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
                    className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.3)]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white uppercase tracking-tight">
                          {application.job?.title}
                        </h3>
                        <p className="text-[#FFD700] text-xs font-mono uppercase">
                          {application.job?.company?.name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-mono border ${config.bg} ${config.text} border-current/20 rounded-sm`}>
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
                    className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 opacity-60"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white uppercase tracking-tight">
                          {application.job?.title}
                        </h3>
                        <p className="text-[#FFD700] text-xs font-mono uppercase">
                          {application.job?.company?.name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-mono border ${config.bg} ${config.text} border-current/20 rounded-sm`}>
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
