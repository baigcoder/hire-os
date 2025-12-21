/**
 * DailyJobAlerts Component
 * Personalized daily job recommendations with preferences
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  MapPin,
  DollarSign,
  Clock,
  Building,
  Bookmark,
  ArrowUpRight,
  Sparkles,
  Filter,
  Settings,
  Check,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  JOB_ALERTS_API_END_POINT,
  SAVED_JOBS_API_END_POINT,
} from "@/utils/constant";

const DailyJobAlerts = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    locations: [],
    jobTypes: [],
    salaryMin: "",
    salaryMax: "",
  });
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    fetchDailyAlerts();
    fetchPreferences();
  }, []);

  const fetchDailyAlerts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${JOB_ALERTS_API_END_POINT}/daily`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setJobs(res.data.jobs || []);
        setSummary(res.data.summary || null);
      }
    } catch (error) {
      console.error("Error fetching daily alerts:", error);
      toast.error("Failed to load job alerts");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await axios.get(`${JOB_ALERTS_API_END_POINT}/preferences`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setPreferences(res.data.preferences || {});
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  };

  const savePreferences = async () => {
    try {
      setSavingPrefs(true);
      const res = await axios.put(
        `${JOB_ALERTS_API_END_POINT}/preferences`,
        preferences,
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success("Preferences saved!");
        setShowSettings(false);
        fetchDailyAlerts(); // Refresh with new preferences
      }
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSaveJob = async (jobId) => {
    try {
      const res = await axios.post(
        `${SAVED_JOBS_API_END_POINT}/toggle/${jobId}`,
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setJobs((prev) =>
          prev.map((job) =>
            job._id === jobId ? { ...job, isSaved: res.data.isSaved } : job,
          ),
        );
      }
    } catch (error) {
      toast.error("Failed to save job");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMatchColor = (score) => {
    if (score >= 80)
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 60) return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    if (score >= 40)
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-gray-400 bg-gray-500/10 border-gray-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="text-[#FFD700]" /> Daily Job Alerts
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Personalized job recommendations just for you
          </p>
        </div>

        <Button
          variant="outline"
          className="border-white/10 text-gray-400 hover:text-white"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4 mr-2" /> Preferences
        </Button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#111111] border border-white/10 rounded-2xl p-6 overflow-hidden"
          >
            <h3 className="text-lg font-bold text-white mb-4">
              Alert Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Preferred Locations
                </label>
                <Input
                  placeholder="e.g., Remote, Bangalore, Mumbai"
                  value={preferences.locations?.join(", ") || ""}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      locations: e.target.value
                        .split(",")
                        .map((l) => l.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Job Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Full-time",
                    "Part-time",
                    "Remote",
                    "Contract",
                    "Internship",
                  ].map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          jobTypes: prev.jobTypes?.includes(type)
                            ? prev.jobTypes.filter((t) => t !== type)
                            : [...(prev.jobTypes || []), type],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        preferences.jobTypes?.includes(type)
                          ? "bg-[#FFD700] text-black"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Salary Range (LPA)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={preferences.salaryMin || ""}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        salaryMin: e.target.value,
                      }))
                    }
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={preferences.salaryMax || ""}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        salaryMax: e.target.value,
                      }))
                    }
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      emailAlerts: !prev.emailAlerts,
                    }))
                  }
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    preferences.emailAlerts ? "bg-[#FFD700]" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                      preferences.emailAlerts ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-400">
                  Email notifications
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                className="text-gray-400"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                onClick={savePreferences}
                disabled={savingPrefs}
              >
                {savingPrefs ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Matches",
              value: summary.totalMatches,
              color: "text-[#FFD700]",
            },
            {
              label: "New Today",
              value: summary.newJobs,
              color: "text-emerald-400",
            },
            {
              label: "Avg Match",
              value: `${summary.avgMatchScore}%`,
              color: "text-cyan-400",
            },
            {
              label: "Last Updated",
              value: "Just now",
              color: "text-gray-400",
            },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#111111] border border-white/10 rounded-xl p-4"
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Job List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/10" />
                <div className="flex-1">
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-white/10 rounded w-1/2 mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-white/10 rounded w-20" />
                    <div className="h-6 bg-white/10 rounded w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
          <Bell className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            No job alerts today
          </h3>
          <p className="text-gray-500 mb-6">
            Update your preferences to get better matches
          </p>
          <Button
            className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
            onClick={() => setShowSettings(true)}
          >
            Set Preferences
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, idx) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group bg-[#111111] border border-white/10 rounded-xl p-5 hover:border-[#FFD700]/30 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Company Logo */}
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-[#FFD700]/30 transition-colors">
                  {job.company?.logo ? (
                    <img
                      src={job.company.logo}
                      alt=""
                      className="w-10 h-10 object-contain rounded"
                    />
                  ) : (
                    <Building className="w-6 h-6 text-gray-500" />
                  )}
                </div>

                {/* Job Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-[#FFD700] transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {job.company?.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {job.isNew && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                          NEW
                        </Badge>
                      )}
                      <Badge className={getMatchColor(job.matchScore)}>
                        {job.matchScore}% Match
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location || "Remote"}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-[#FFD700]" />
                      {job.salary || "Competitive"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(job.createdAt)}
                    </span>
                  </div>

                  {/* Alert Reason */}
                  {job.alertReason && (
                    <p className="text-xs text-cyan-400 mb-3 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {job.alertReason}
                    </p>
                  )}

                  {/* Matched Skills */}
                  {job.matchedSkills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {job.matchedSkills.slice(0, 4).map((skill, i) => (
                        <Badge
                          key={i}
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                        >
                          <Check className="w-2 h-2 mr-1" /> {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                      onClick={() => navigate(`/description/${job._id}`)}
                    >
                      View Job <ArrowUpRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`border-white/10 ${
                        job.isSaved
                          ? "text-[#FFD700] border-[#FFD700]/30"
                          : "text-gray-400 hover:text-white"
                      }`}
                      onClick={() => handleSaveJob(job._id)}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${job.isSaved ? "fill-current" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyJobAlerts;
