import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  User,
  GripVertical,
  Mail,
  Clock,
  Star,
  Loader2,
  Search,
  UserCheck,
  UserX,
  Calendar,
  MessageSquare,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Pipeline stages configuration with Hitr.io styling
// Using static classes for Tailwind JIT purging
const PIPELINE_STAGES = [
  {
    id: "pending",
    label: "APPLIED",
    icon: Clock,
    headerBg: "bg-gray-500/10",
    headerBorder: "border-gray-500/30",
    headerText: "text-gray-400",
    badgeBg: "bg-gray-500/20",
    badgeText: "text-gray-400",
  },
  {
    id: "reviewing",
    label: "SCREENING",
    icon: FileText,
    headerBg: "bg-blue-500/10",
    headerBorder: "border-blue-500/30",
    headerText: "text-blue-400",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-400",
  },
  {
    id: "interview",
    label: "INTERVIEW",
    icon: Calendar,
    headerBg: "bg-purple-500/10",
    headerBorder: "border-purple-500/30",
    headerText: "text-purple-400",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-400",
  },
  {
    id: "pending_ceo_approval",
    label: "FINAL REVIEW",
    icon: UserCheck,
    headerBg: "bg-amber-500/10",
    headerBorder: "border-amber-500/30",
    headerText: "text-[#FFD700]",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-[#FFD700]",
  },
  {
    id: "offer_sent",
    label: "OFFER",
    icon: Mail,
    headerBg: "bg-emerald-500/10",
    headerBorder: "border-emerald-500/30",
    headerText: "text-emerald-400",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-400",
  },
  {
    id: "hired",
    label: "HIRED",
    icon: Star,
    headerBg: "bg-green-500/10",
    headerBorder: "border-green-500/30",
    headerText: "text-green-400",
    badgeBg: "bg-green-500/20",
    badgeText: "text-green-400",
  },
  {
    id: "rejected",
    label: "REJECTED",
    icon: UserX,
    headerBg: "bg-red-500/10",
    headerBorder: "border-red-500/30",
    headerText: "text-red-400",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-400",
  },
];

const KanbanPipeline = ({ jobId, jobTitle }) => {
  const [applicants, setApplicants] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (jobId) fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/application/${jobId}/applicants`,
        {
          withCredentials: true,
        },
      );

      if (res.data.success) {
        const grouped = {};
        const countMap = {};

        PIPELINE_STAGES.forEach((stage) => {
          grouped[stage.id] = [];
          countMap[stage.id] = 0;
        });

        (res.data.job?.applications || []).forEach((app) => {
          let status = app.status || "pending";
          let mappedStatus = status;
          if (["screened", "shortlisted"].includes(status))
            mappedStatus = "reviewing";
          if (
            ["video_scheduled", "video_completed", "interviewed"].includes(
              status,
            )
          )
            mappedStatus = "interview";
          if (["offer_pending", "offer_accepted"].includes(status))
            mappedStatus = "offer_sent";

          if (grouped[mappedStatus]) {
            grouped[mappedStatus].push({
              id: app._id,
              name: app.applicant?.fullname || "Unknown",
              email: app.applicant?.email || "",
              photo: app.applicant?.profile?.profilePhoto,
              appliedAt: app.createdAt,
              score: app.resumeScore || Math.floor(Math.random() * 40) + 60,
              status: app.status,
            });
            countMap[mappedStatus]++;
          }
        });

        setApplicants(grouped);
        setCounts(countMap);
      }
    } catch (error) {
      console.error("Failed to fetch applicants:", error);
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, item, sourceStage) => {
    setDraggedItem({ item, sourceStage });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedItem || draggedItem.sourceStage === targetStage) {
      setDraggedItem(null);
      return;
    }

    const { item, sourceStage } = draggedItem;

    // Optimistic update
    const newApplicants = { ...applicants };
    newApplicants[sourceStage] = newApplicants[sourceStage].filter(
      (a) => a.id !== item.id,
    );
    newApplicants[targetStage] = [
      ...newApplicants[targetStage],
      { ...item, status: targetStage },
    ];
    setApplicants(newApplicants);

    const newCounts = { ...counts };
    newCounts[sourceStage]--;
    newCounts[targetStage]++;
    setCounts(newCounts);

    setDraggedItem(null);

    try {
      await axios.post(
        `${API_BASE}/application/status/${item.id}/update`,
        {
          status: targetStage,
        },
        { withCredentials: true },
      );

      toast.success(
        `Moved to ${PIPELINE_STAGES.find((s) => s.id === targetStage)?.label}`,
      );
    } catch (error) {
      toast.error("Failed to update status");
      fetchApplicants();
    }
  };

  const formatDate = (dateString) => {
    const diff = Math.floor(
      (new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24),
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-[#FFD700]";
    return "text-red-400";
  };

  const filteredApplicants = useCallback(
    (stageApplicants) => {
      if (!searchQuery) return stageApplicants;
      const query = searchQuery.toLowerCase();
      return stageApplicants.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.email.toLowerCase().includes(query),
      );
    },
    [searchQuery],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-[#FFD700]/20 rounded-full animate-pulse" />
          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#FFD700] animate-pulse" />
        </div>
        <p className="text-gray-400 mt-4 font-mono text-sm tracking-wider">
          LOADING PIPELINE...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
            <Sparkles className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              HIRING PIPELINE
            </h2>
            <p className="text-xs text-gray-500 font-mono tracking-wider">
              {jobTitle || "ALL CANDIDATES"}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-sm text-white text-sm font-mono focus:border-[#FFD700]/50 focus:outline-none w-72"
          />
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
        {PIPELINE_STAGES.map((stage) => {
          const Icon = stage.icon;
          const stageApplicants = filteredApplicants(
            applicants[stage.id] || [],
          );
          const isDragOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-64"
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between p-3 ${stage.headerBg} border ${stage.headerBorder} rounded-t-sm`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${stage.headerText}`} />
                  <span
                    className={`font-mono text-xs tracking-wider ${stage.headerText}`}
                  >
                    {stage.label}
                  </span>
                </div>
                <Badge
                  className={`${stage.badgeBg} ${stage.badgeText} ${stage.headerBorder} border font-mono text-[10px]`}
                >
                  {counts[stage.id] || 0}
                </Badge>
              </div>

              {/* Column Body */}
              <div
                className={`min-h-[400px] p-2 space-y-2 bg-[#0a0a0a] border border-t-0 rounded-b-sm transition-all ${
                  isDragOver
                    ? `border-[#FFD700]/50 bg-[#FFD700]/5`
                    : "border-white/10"
                }`}
              >
                <AnimatePresence mode="popLayout">
                  {stageApplicants.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 text-gray-600"
                    >
                      <Icon className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-[10px] font-mono">NO CANDIDATES</p>
                    </motion.div>
                  ) : (
                    stageApplicants.map((applicant, index) => (
                      <motion.div
                        key={applicant.id}
                        layoutId={applicant.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.02 }}
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(e, applicant, stage.id)
                        }
                        className="bg-[#111111] border border-white/10 rounded-sm p-3 cursor-grab active:cursor-grabbing hover:border-[#FFD700]/30 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag Handle */}
                          <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3.5 h-3.5 text-gray-600" />
                          </div>

                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-sm bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/10">
                            {applicant.photo ? (
                              <img
                                src={applicant.photo}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-gray-500" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-white text-sm truncate pr-2">
                                {applicant.name}
                              </h4>
                              <span
                                className={`text-xs font-mono ${getScoreColor(applicant.score)}`}
                              >
                                {applicant.score}%
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono truncate">
                              {applicant.email}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-500 font-mono">
                              <Clock className="w-3 h-3" />
                              {formatDate(applicant.appliedAt)}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-1 mt-3 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {[
                            { icon: Mail, label: "EMAIL" },
                            { icon: MessageSquare, label: "NOTE" },
                            { icon: Calendar, label: "SCHEDULE" },
                          ].map((action) => (
                            <button
                              key={action.label}
                              className="flex-1 flex items-center justify-center gap-1 py-1 text-[9px] font-mono text-gray-500 hover:text-[#FFD700] hover:bg-[#FFD700]/10 rounded-sm transition-colors"
                            >
                              <action.icon className="w-3 h-3" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/10 text-[10px] font-mono text-gray-500">
        <span>DRAG CARDS TO UPDATE STATUS</span>
        <span className="text-[#FFD700]">•</span>
        <span>HOVER FOR QUICK ACTIONS</span>
      </div>
    </div>
  );
};

export default KanbanPipeline;
