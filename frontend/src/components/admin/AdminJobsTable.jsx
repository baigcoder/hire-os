import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Edit2,
  Eye,
  MoreHorizontal,
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  ExternalLink,
  TrendingUp,
  Clock,
  MapPin,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const AdminJobsTable = () => {
  const { allAdminJobs, searchJobByText } = useSelector((store) => store.job);
  const [filterJobs, setFilterJobs] = useState(allAdminJobs);
  const navigate = useNavigate();

  useEffect(() => {
    const filteredJobs = (allAdminJobs || []).filter((job) => {
      if (!searchJobByText) return true;
      const searchLower = searchJobByText.toLowerCase();
      return (
        job?.title?.toLowerCase().includes(searchLower) ||
        job?.company?.name?.toLowerCase().includes(searchLower) ||
        job?.location?.toLowerCase().includes(searchLower)
      );
    });
    setFilterJobs(filteredJobs);
  }, [allAdminJobs, searchJobByText]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!filterJobs || filterJobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
          <Eye className="w-8 h-8 text-[#FFD700]/50" />
        </div>
        <p className="text-gray-500 font-mono text-sm mb-2">No jobs found</p>
        <p className="text-gray-600 text-xs">
          {searchJobByText ? "Try adjusting your search" : "Post your first job to get started"}
        </p>
        {!searchJobByText && (
          <Button
            onClick={() => navigate("/admin/jobs/create")}
            className="mt-4 bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm text-xs"
          >
            Post a Job
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-white/10 text-[10px] text-gray-500 uppercase tracking-wider font-mono">
        <div className="col-span-4">Position</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Applicants</div>
        <div className="col-span-2">Posted</div>
        <div className="col-span-1 text-center">Status</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-white/5">
        {filterJobs.map((job, idx) => (
          <motion.div
            key={job._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-white/[0.02] transition-colors group"
          >
            {/* Position & Company */}
            <div className="col-span-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-sm flex items-center justify-center flex-shrink-0">
                  {job.company?.logo ? (
                    <img src={job.company.logo} alt="" className="w-full h-full object-cover rounded-sm" />
                  ) : (
                    <span className="text-[#FFD700] font-bold text-sm">
                      {job.company?.name?.charAt(0) || "J"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate text-sm">{job.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                    <span>{job.company?.name}</span>
                    {job.location && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Type */}
            <div className="col-span-2 flex items-center">
              <Badge
                className={`rounded-sm text-[10px] font-mono px-2 py-0.5 ${job.jobType === "Full-time"
                    ? "bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30"
                    : job.jobType === "Remote"
                      ? "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30"
                      : job.jobType === "Contract"
                        ? "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30"
                        : "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30"
                  }`}
              >
                {job.jobType || "Full-time"}
              </Badge>
            </div>

            {/* Applicants */}
            <div className="col-span-2 flex items-center">
              <button
                onClick={() => navigate(`/admin/jobs/${job._id}/applicants`)}
                className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] transition-colors group/btn"
              >
                <div className="w-7 h-7 rounded-sm bg-white/5 flex items-center justify-center group-hover/btn:bg-[#FFD700]/10 transition-colors">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-mono">
                  {job.applications?.length || 0}
                </span>
                {(job.applications?.length || 0) > 0 && (
                  <TrendingUp className="w-3 h-3 text-[#00FF94]" />
                )}
              </button>
            </div>

            {/* Posted Date */}
            <div className="col-span-2 flex items-center">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
                <Clock className="w-3 h-3" />
                {formatDate(job.createdAt)}
              </div>
            </div>

            {/* Status */}
            <div className="col-span-1 flex items-center justify-center">
              {job.isActive !== false ? (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-50"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF94]"></span>
                  </span>
                  <span className="text-[10px] text-[#00FF94] font-mono uppercase">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                  <span className="text-[10px] text-gray-500 font-mono uppercase">Paused</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-gray-500 hover:text-white hover:bg-white/5 rounded-sm"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#111111] border-white/10 rounded-sm w-44">
                  <DropdownMenuItem
                    onClick={() => navigate(`/admin/jobs/${job._id}/applicants`)}
                    className="text-gray-300 hover:bg-white/5 focus:bg-white/5 rounded-sm cursor-pointer"
                  >
                    <Users className="w-4 h-4 mr-2 text-[#FFD700]" />
                    View Applicants
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate(`/admin/jobs/${job._id}/edit`)}
                    className="text-gray-300 hover:bg-white/5 focus:bg-white/5 rounded-sm cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 mr-2 text-[#3B82F6]" />
                    Edit Job
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.open(`/description/${job._id}`, '_blank')}
                    className="text-gray-300 hover:bg-white/5 focus:bg-white/5 rounded-sm cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-[#8B5CF6]" />
                    View Listing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 rounded-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Job
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <p className="text-[10px] text-gray-600 font-mono">
          Showing {filterJobs.length} of {allAdminJobs?.length || 0} jobs
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-white/10 text-gray-500 rounded-sm text-xs h-7"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-white/10 text-gray-500 rounded-sm text-xs h-7"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminJobsTable;
