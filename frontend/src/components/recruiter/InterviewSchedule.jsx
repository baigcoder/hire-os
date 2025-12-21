/**
 * RecruiterInterviewSchedule - Interview Management Page for Recruiters
 * Industrial HIRE.OS Theme
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  Briefcase,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  ArrowLeft,
  CalendarDays,
  Users,
  Monitor,
  Building,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import Navbar from "../shared/Navbar";
import {
  INTERVIEW_API_END_POINT,
  APPLICATION_API_END_POINT,
} from "@/utils/constant";

const RecruiterInterviewSchedule = () => {
  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);
  const { allAdminJobs } = useSelector((store) => store.job);

  // State
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("calendar");

  // Schedule dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    applicationId: "",
    scheduledAt: "",
    duration: 30,
    type: "video",
    notes: "",
  });

  // Candidates eligible for interview
  const [eligibleCandidates, setEligibleCandidates] = useState([]);

  // Fetch interviews
  useEffect(() => {
    fetchInterviews();
    fetchEligibleCandidates();
  }, []);

  const fetchInterviews = async () => {
    try {
      const res = await axios.get(
        `${INTERVIEW_API_END_POINT}/recruiter/my-interviews`,
        {
          withCredentials: true,
        },
      );
      if (res.data.success) {
        setInterviews(res.data.interviews || []);
      }
    } catch (error) {
      console.error("Failed to fetch interviews:", error);
      toast.error("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleCandidates = async () => {
    try {
      // Get applications in 'pending' or 'reviewing' status
      const res = await axios.get(
        `${APPLICATION_API_END_POINT}/recruiter/all`,
        {
          withCredentials: true,
        },
      );
      if (res.data.success) {
        const eligible = (res.data.applications || []).filter((app) =>
          ["pending", "reviewing", "shortlisted"].includes(app.status),
        );
        setEligibleCandidates(eligible);
      }
    } catch (error) {
      console.error("Failed to fetch eligible candidates:", error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchInterviews(), fetchEligibleCandidates()]);
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleScheduleInterview = async () => {
    if (!scheduleData.applicationId || !scheduleData.scheduledAt) {
      toast.error("Please select a candidate and date/time");
      return;
    }

    setScheduling(true);
    try {
      const res = await axios.post(
        `${INTERVIEW_API_END_POINT}/schedule`,
        scheduleData,
        { withCredentials: true },
      );

      if (res.data.success) {
        toast.success("Interview scheduled successfully!");
        setScheduleDialogOpen(false);
        setScheduleData({
          applicationId: "",
          scheduledAt: "",
          duration: 30,
          type: "video",
          notes: "",
        });
        fetchInterviews();
        fetchEligibleCandidates();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to schedule interview",
      );
    } finally {
      setScheduling(false);
    }
  };

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Filter interviews by selected date
  const filteredInterviews = useMemo(() => {
    return interviews.filter((int) => {
      const matchesDate =
        viewMode === "calendar"
          ? isSameDay(parseISO(int.scheduledAt), selectedDate)
          : true;
      const matchesStatus =
        statusFilter === "all" || int.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        int.studentId?.fullname
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        int.jobId?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [interviews, selectedDate, statusFilter, searchQuery, viewMode]);

  // Stats
  const stats = useMemo(
    () => ({
      total: interviews.length,
      upcoming: interviews.filter(
        (i) => new Date(i.scheduledAt) > new Date() && i.status !== "cancelled",
      ).length,
      completed: interviews.filter((i) => i.status === "completed").length,
      today: interviews.filter((i) =>
        isSameDay(parseISO(i.scheduledAt), new Date()),
      ).length,
    }),
    [interviews],
  );

  const getInterviewTypeIcon = (type) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "phone":
        return <Phone className="w-4 h-4" />;
      case "in-person":
        return <MapPin className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "in-progress":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8 relative z-10 pt-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-wider">
                Interview Schedule
              </h1>
              <p className="text-gray-500 text-sm font-mono">
                Manage and schedule candidate interviews
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={refreshData}
              disabled={refreshing}
              className="bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={() => setScheduleDialogOpen(true)}
              className="bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Interviews",
              value: stats.total,
              icon: Calendar,
              color: "text-[#FFD700]",
            },
            {
              label: "Upcoming",
              value: stats.upcoming,
              icon: Clock,
              color: "text-cyan-400",
            },
            {
              label: "Today",
              value: stats.today,
              icon: CalendarDays,
              color: "text-emerald-400",
            },
            {
              label: "Completed",
              value: stats.completed,
              icon: CheckCircle,
              color: "text-purple-400",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111111] border border-white/10 rounded-sm p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-gray-500 text-xs uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <div className="text-3xl font-bold text-white font-mono">
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* View Toggle and Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
            <TabsList className="bg-[#111111] border border-white/10">
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates..."
                className="pl-10 bg-[#111111] border-white/10 text-white w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-[#111111] border-white/10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Week Calendar */}
            <div className="lg:col-span-1 bg-[#111111] border border-white/10 rounded-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-mono text-gray-400">
                  {format(currentWeek, "MMM yyyy")}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {weekDays.map((day, i) => {
                  const dayInterviews = interviews.filter((int) =>
                    isSameDay(parseISO(int.scheduledAt), day),
                  );
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={`w-full p-3 rounded-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-[#FFD700] text-black"
                          : isToday
                            ? "bg-cyan-500/10 border border-cyan-500/30"
                            : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-left">
                        <div
                          className={`text-xs uppercase tracking-wider ${isSelected ? "text-black/60" : "text-gray-500"}`}
                        >
                          {format(day, "EEE")}
                        </div>
                        <div
                          className={`text-lg font-bold font-mono ${isSelected ? "text-black" : "text-white"}`}
                        >
                          {format(day, "d")}
                        </div>
                      </div>
                      {dayInterviews.length > 0 && (
                        <Badge
                          className={
                            isSelected
                              ? "bg-black/20 text-black"
                              : "bg-[#FFD700]/20 text-[#FFD700]"
                          }
                        >
                          {dayInterviews.length}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interview List for Selected Day */}
            <div className="lg:col-span-3 space-y-4">
              <div className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">
                {format(selectedDate, "EEEE, MMMM d, yyyy")} —{" "}
                {filteredInterviews.length} interviews
              </div>

              {filteredInterviews.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {filteredInterviews.map((interview, i) => (
                    <motion.div
                      key={interview._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-[#111111] border border-white/10 rounded-sm p-5 hover:border-[#FFD700]/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border border-white/10">
                            <AvatarImage
                              src={interview.studentId?.profile?.profilePhoto}
                            />
                            <AvatarFallback className="bg-[#FFD700]/10 text-[#FFD700]">
                              {interview.studentId?.fullname?.charAt(0) || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold text-white">
                              {interview.studentId?.fullname || "Candidate"}
                            </h3>
                            <p className="text-gray-500 text-sm font-mono">
                              {interview.jobId?.title || "Position"}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status}
                        </Badge>
                      </div>

                      <div className="mt-4 flex items-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-cyan-400" />
                          {format(parseISO(interview.scheduledAt), "HH:mm")}
                        </div>
                        <div className="flex items-center gap-2">
                          {getInterviewTypeIcon(interview.type)}
                          <span className="capitalize">
                            {interview.type || "Video"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          {interview.duration || 30} min
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        {interview.status === "scheduled" &&
                          new Date(interview.scheduledAt) <= new Date() && (
                            <Button
                              size="sm"
                              onClick={() =>
                                navigate(`/interview/live/${interview._id}`)
                              }
                              className="bg-cyan-500 hover:bg-cyan-600 text-white"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Start Interview
                            </Button>
                          )}
                        {interview.status === "completed" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(`/interview/${interview._id}/report`)
                            }
                            className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          >
                            View Report
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="bg-[#111111] border border-white/10 rounded-sm p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-gray-400 font-bold mb-2">
                    No Interviews
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    No interviews scheduled for this day
                  </p>
                  <Button
                    onClick={() => setScheduleDialogOpen(true)}
                    className="bg-[#FFD700] hover:bg-[#FFE44D] text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {filteredInterviews.length > 0 ? (
              filteredInterviews.map((interview, i) => (
                <motion.div
                  key={interview._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#111111] border border-white/10 rounded-sm p-5 hover:border-[#FFD700]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={interview.studentId?.profile?.profilePhoto}
                        />
                        <AvatarFallback className="bg-[#FFD700]/10 text-[#FFD700]">
                          {interview.studentId?.fullname?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-white">
                          {interview.studentId?.fullname}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          {interview.jobId?.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white font-mono">
                          {format(
                            parseISO(interview.scheduledAt),
                            "MMM d, HH:mm",
                          )}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {interview.duration || 30} min
                        </div>
                      </div>
                      <Badge className={getStatusColor(interview.status)}>
                        {interview.status}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                No interviews found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Interview Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="bg-[#111111] border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wider">
              Schedule Interview
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Select a candidate and schedule an interview
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Candidate Selection */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Select Candidate
              </label>
              <Select
                value={scheduleData.applicationId}
                onValueChange={(v) =>
                  setScheduleData({ ...scheduleData, applicationId: v })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCandidates.map((app) => (
                    <SelectItem key={app._id} value={app._id}>
                      <div className="flex items-center gap-2">
                        <span>{app.applicant?.fullname}</span>
                        <span className="text-gray-500 text-xs">
                          — {app.job?.title}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={scheduleData.scheduledAt}
                  onChange={(e) =>
                    setScheduleData({
                      ...scheduleData,
                      scheduledAt: e.target.value,
                    })
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Duration
                </label>
                <Select
                  value={scheduleData.duration.toString()}
                  onValueChange={(v) =>
                    setScheduleData({ ...scheduleData, duration: parseInt(v) })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Interview Type */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Interview Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {["video", "phone", "in-person"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setScheduleData({ ...scheduleData, type })}
                    className={`p-3 rounded-sm border transition-all flex flex-col items-center gap-2 ${
                      scheduleData.type === type
                        ? "bg-[#FFD700] border-[#FFD700] text-black"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                    }`}
                  >
                    {type === "video" && <Video className="w-5 h-5" />}
                    {type === "phone" && <Phone className="w-5 h-5" />}
                    {type === "in-person" && <MapPin className="w-5 h-5" />}
                    <span className="text-xs uppercase font-bold">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Notes (Optional)
              </label>
              <Input
                value={scheduleData.notes}
                onChange={(e) =>
                  setScheduleData({ ...scheduleData, notes: e.target.value })
                }
                placeholder="Interview focus areas, special instructions..."
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setScheduleDialogOpen(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleInterview}
              disabled={
                scheduling ||
                !scheduleData.applicationId ||
                !scheduleData.scheduledAt
              }
              className="bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold"
            >
              {scheduling ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterInterviewSchedule;
