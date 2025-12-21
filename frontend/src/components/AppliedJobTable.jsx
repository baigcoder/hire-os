import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  Briefcase,
  Clock,
  Building2,
  ExternalLink,
  FileText,
} from "lucide-react";

const statusConfig = {
  pending: {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-gray-500/30",
    label: "PENDING",
  },
  reviewing: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    label: "REVIEWING",
  },
  under_review: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    label: "REVIEWING",
  },
  shortlisted: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    label: "SHORTLISTED",
  },
  interview: {
    bg: "bg-[#FFD700]/10",
    text: "text-[#FFD700]",
    border: "border-[#FFD700]/30",
    label: "INTERVIEW",
  },
  hired: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    label: "HIRED",
  },
  accepted: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    label: "ACCEPTED",
  },
  rejected: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    label: "REJECTED",
  },
};

const AppliedJobTable = () => {
  const { allAppliedJobs } = useSelector((store) => store.job);
  const navigate = useNavigate();

  const getStatusStyle = (status) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en", { month: "short" }).toUpperCase();
    return `${day} ${month}`;
  };

  if (!allAppliedJobs || allAppliedJobs.length === 0) {
    return (
      <div className="bg-[#111111] border border-white/10 rounded-sm p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-white/5 flex items-center justify-center border border-white/10">
          <FileText className="w-7 h-7 text-gray-600" />
        </div>
        <h3 className="text-white font-bold mb-2">NO APPLICATIONS YET</h3>
        <p className="text-gray-500 text-xs font-mono tracking-wider mb-6">
          Start applying to jobs to track your progress
        </p>
        <button
          onClick={() => navigate("/jobs")}
          className="px-6 py-2 bg-[#FFD700] text-black font-mono text-xs hover:bg-[#FFD700]/90 rounded-sm transition-colors"
        >
          BROWSE JOBS
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FFD700]/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
            <Briefcase className="w-4 h-4 text-[#FFD700]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">YOUR APPLICATIONS</h3>
            <p className="text-[10px] text-gray-500 font-mono tracking-wider">
              TRACK YOUR JOB APPLICATIONS
            </p>
          </div>
        </div>
        <Badge className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 font-mono text-[10px]">
          {allAppliedJobs.length} TOTAL
        </Badge>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                DATE
              </th>
              <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                JOB ROLE
              </th>
              <th className="text-left py-3 px-4 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                COMPANY
              </th>
              <th className="text-right py-3 px-4 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                STATUS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allAppliedJobs.map((appliedJob, index) => {
              const statusStyle = getStatusStyle(appliedJob?.status);

              return (
                <motion.tr
                  key={appliedJob._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() =>
                    appliedJob?.job?._id &&
                    navigate(`/description/${appliedJob.job._id}`)
                  }
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-mono text-gray-400">
                        {formatDate(appliedJob?.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white group-hover:text-[#FFD700] transition-colors font-medium">
                        {appliedJob?.job?.title || "Job no longer available"}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-sm bg-white/5 flex items-center justify-center border border-white/10">
                        {appliedJob?.job?.company?.logo ? (
                          <img
                            src={appliedJob.job.company.logo}
                            alt=""
                            className="w-full h-full object-cover rounded-sm"
                          />
                        ) : (
                          <Building2 className="w-3 h-3 text-gray-600" />
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {appliedJob?.job?.company?.name || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge
                      className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border font-mono text-[10px]`}
                    >
                      {statusStyle.label}
                    </Badge>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppliedJobTable;
