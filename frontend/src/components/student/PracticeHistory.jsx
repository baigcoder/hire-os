import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Brain,
  Video,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  ChevronRight,
  Filter,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ComponentLoader } from "../shared/DashboardLoader";
import axios from "axios";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const PracticeHistory = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, mock_test, mock_interview
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  // Fetch history on mount and filter change
  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, [filter, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/practice-history`, {
        params: { type: filter, page, limit: 10 },
        withCredentials: true,
      });

      if (response.data.success) {
        setHistory(response.data.history);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast.error("Failed to load practice history");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/practice-history/stats`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const deleteSession = async (id) => {
    if (!confirm("Delete this practice session?")) return;

    try {
      await axios.delete(`${API_BASE}/practice-history/${id}`, {
        withCredentials: true,
      });
      toast.success("Session deleted");
      fetchHistory();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete session");
    }
  };

  const getGradeColor = (grade) => {
    if (grade === "A+" || grade === "A")
      return "text-[#00FF94] bg-[#00FF94]/10 border-[#00FF94]/30";
    if (grade === "B+" || grade === "B")
      return "text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/30";
    if (grade === "C+" || grade === "C")
      return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    return "text-red-400 bg-red-400/10 border-red-400/30";
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-sm bg-[#FFD700]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Practice History
              </h2>
              <p className="text-gray-500 text-sm">
                Track your interview and test preparation progress
              </p>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { id: "all", label: "All", icon: Filter },
            { id: "mock_test", label: "Mock Tests", icon: Brain },
            { id: "mock_interview", label: "Interviews", icon: Video },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
                filter === f.id
                  ? "bg-[#FFD700] text-black"
                  : "bg-[#111111] border border-[#2a2a2a] text-gray-400 hover:border-[#FFD700]/30"
              }`}
            >
              <f.icon className="w-4 h-4" />
              {f.label}
            </button>
          ))}
          <button
            onClick={fetchHistory}
            className="p-2 rounded-sm bg-[#111111] border border-[#2a2a2a] text-gray-400 hover:border-[#FFD700]/30"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#FFD700]" />
              <span className="text-xs text-gray-500 uppercase">
                Total Sessions
              </span>
            </div>
            <p className="text-2xl font-bold text-white font-mono">
              {(stats.stats?.mock_test?.totalSessions || 0) +
                (stats.stats?.mock_interview?.totalSessions || 0)}
            </p>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#00FF94]" />
              <span className="text-xs text-gray-500 uppercase">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-[#00FF94] font-mono">
              {Math.round(
                ((stats.stats?.mock_test?.avgScore || 0) +
                  (stats.stats?.mock_interview?.avgScore || 0)) /
                  2,
              )}
              %
            </p>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-gray-500 uppercase">
                Best Score
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-400 font-mono">
              {Math.max(
                stats.stats?.mock_test?.bestScore || 0,
                stats.stats?.mock_interview?.bestScore || 0,
              )}
              %
            </p>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-500 uppercase">This Week</span>
            </div>
            <p className="text-2xl font-bold text-purple-400 font-mono">
              {stats.recentActivity || 0}
            </p>
          </div>
        </motion.div>
      )}

      {/* History List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111111] border border-[#2a2a2a] rounded-sm overflow-hidden"
      >
        {loading ? (
          <ComponentLoader message="Loading history" iconColor="#FFD700" />
        ) : history.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">
              No Practice Sessions Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Start practicing to build your history!
            </p>
            <div className="flex gap-3 justify-center">
              <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30">
                <Brain className="w-3 h-3 mr-1" /> Try Mock Tests
              </Badge>
              <Badge className="bg-cyan-400/10 text-cyan-400 border-cyan-400/30">
                <Video className="w-3 h-3 mr-1" /> Try Mock Interview
              </Badge>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {history.map((session, idx) => (
              <motion.div
                key={session._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() =>
                  setSelectedSession(
                    selectedSession?._id === session._id ? null : session,
                  )
                }
              >
                <div className="flex items-center gap-4">
                  {/* Type Icon */}
                  <div
                    className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                      session.type === "mock_interview"
                        ? "bg-cyan-400/10"
                        : "bg-[#FFD700]/10"
                    }`}
                  >
                    {session.type === "mock_interview" ? (
                      <Video className="w-6 h-6 text-cyan-400" />
                    ) : (
                      <Brain className="w-6 h-6 text-[#FFD700]" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-white">
                        {session.type === "mock_interview"
                          ? `${session.interviewData?.interviewType || "General"} Interview`
                          : `${session.testData?.topic || "Practice"} Test`}
                      </h4>
                      <Badge className={getGradeColor(session.grade)}>
                        {session.grade}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(session.duration)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#00FF94] font-mono">
                      {session.score}%
                    </p>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session._id);
                      }}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        selectedSession?._id === session._id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {selectedSession?._id === session._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-[#2a2a2a] overflow-hidden"
                    >
                      {session.type === "mock_interview" &&
                        session.interviewData?.summary && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-white/5 rounded-sm p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">
                                  Communication
                                </p>
                                <p className="text-xl font-bold text-cyan-400">
                                  {
                                    session.interviewData.summary
                                      .communicationScore
                                  }
                                  %
                                </p>
                              </div>
                              <div className="bg-white/5 rounded-sm p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">
                                  Confidence
                                </p>
                                <p className="text-xl font-bold text-purple-400">
                                  {
                                    session.interviewData.summary
                                      .confidenceScore
                                  }
                                  %
                                </p>
                              </div>
                              <div className="bg-white/5 rounded-sm p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">
                                  Questions
                                </p>
                                <p className="text-xl font-bold text-[#FFD700]">
                                  {session.interviewData.questionsAnswered}
                                </p>
                              </div>
                            </div>

                            {session.interviewData.summary.strengths?.length >
                              0 && (
                              <div>
                                <p className="text-xs text-gray-500 uppercase mb-2">
                                  Strengths
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {session.interviewData.summary.strengths.map(
                                    (s, i) => (
                                      <Badge
                                        key={i}
                                        className="bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30"
                                      >
                                        <CheckCircle className="w-3 h-3 mr-1" />{" "}
                                        {s}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {session.interviewData.summary.improvements
                              ?.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 uppercase mb-2">
                                  Areas to Improve
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {session.interviewData.summary.improvements.map(
                                    (s, i) => (
                                      <Badge
                                        key={i}
                                        className="bg-orange-400/10 text-orange-400 border-orange-400/30"
                                      >
                                        <AlertCircle className="w-3 h-3 mr-1" />{" "}
                                        {s}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {session.type === "mock_test" && session.testData && (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white/5 rounded-sm p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">
                              Correct
                            </p>
                            <p className="text-xl font-bold text-[#00FF94]">
                              {session.testData.correctAnswers}
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-sm p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Wrong</p>
                            <p className="text-xl font-bold text-red-400">
                              {session.testData.wrongAnswers}
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-sm p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Total</p>
                            <p className="text-xl font-bold text-[#FFD700]">
                              {session.testData.totalQuestions}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="p-4 border-t border-[#2a2a2a] flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="bg-transparent border-[#2a2a2a] text-gray-400"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="bg-transparent border-[#2a2a2a] text-gray-400"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PracticeHistory;
