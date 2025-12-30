import React from "react";
import { Button } from "./ui/button";
import {
  Bookmark,
  MapPin,
  Clock,
  DollarSign,
  Building2,
  ArrowRight,
  Users,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Job = ({ job, viewMode = "grid" }) => {
  const navigate = useNavigate();

  const getTimeAgo = (mongodbTime) => {
    if (!mongodbTime) return "New";
    const createdAt = new Date(mongodbTime);
    const currentTime = new Date();
    const timeDifference = currentTime - createdAt;
    const days = Math.floor(timeDifference / (1000 * 24 * 60 * 60));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const formatSalary = (salary) => {
    if (!salary) return "Competitive";
    return `${salary}LPA`;
  };

  // List view layout
  if (viewMode === "list") {
    return (
      <article
        className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] transition-all cursor-pointer group relative overflow-hidden"
        onClick={() => navigate(`/description/${job?._id}`)}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="flex items-start gap-6 relative z-10">
          {/* Company Logo */}
          <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:border-yellow-500/30 transition-colors">
            {job?.company?.logo ? (
              <img
                src={job.company.logo}
                alt={job.company.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2
                size={32}
                className="text-gray-500 group-hover:text-yellow-500 transition-colors"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-yellow-500 transition-colors tracking-tight">
                  {job?.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-medium text-gray-400">
                    {job?.company?.name}
                  </p>
                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                  <span className="text-xs text-gray-500">
                    {getTimeAgo(job?.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Save job functionality
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-500 transition-all text-gray-400"
              >
                <Bookmark size={20} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <MapPin size={14} className="text-yellow-500" />
                {job?.location || "Remote"}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Clock size={14} className="text-yellow-500" />
                {job?.jobType || "Full-time"}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-semibold text-white">
                <DollarSign size={14} className="text-yellow-500" />
                {formatSalary(job?.salary)}
              </span>
              {job?.position && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <Users size={14} className="text-yellow-500" />
                  {job.position} Openings
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/10">
              <div className="flex flex-wrap gap-2">
                {job?.skills?.slice(0, 4).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs font-medium bg-[#111] text-gray-400 border border-white/10 rounded-md group-hover:border-yellow-500/20 transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                View Details <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Grid view layout (default)
  return (
    <article
      className="group bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-yellow-500/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] transition-all duration-300 cursor-pointer relative overflow-hidden h-full flex flex-col"
      onClick={() => navigate(`/description/${job?._id}`)}
    >
      {/* Hover Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-yellow-500/30 transition-colors">
            {job?.company?.logo ? (
              <img
                src={job.company.logo}
                alt={job.company.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2
                size={24}
                className="text-gray-500 group-hover:text-yellow-500 transition-colors"
              />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
              {job?.company?.name}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={10} />
              {getTimeAgo(job?.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Save functionality
          }}
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all text-gray-500"
        >
          <Bookmark size={16} />
        </button>
      </div>

      {/* Title & Desc */}
      <div className="mb-4 flex-1 relative z-10">
        <h3 className="text-xl font-bold text-white group-hover:text-yellow-500 transition-colors mb-2 line-clamp-1 group-hover:line-clamp-none">
          {job?.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {job?.description}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6 relative z-10">
        <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-400 flex items-center gap-1.5">
          <MapPin size={12} className="text-yellow-500/70" /> {job?.location}
        </span>
        <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-400 flex items-center gap-1.5">
          <Briefcase size={12} className="text-yellow-500/70" /> {job?.jobType}
        </span>
        <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white font-medium flex items-center gap-1.5">
          <DollarSign size={12} className="text-yellow-500" />{" "}
          {formatSalary(job?.salary)}
        </span>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Users size={14} />
          <span>{job?.position || 1} Openings</span>
        </div>
        <Button
          size="sm"
          className="bg-white/10 text-white hover:bg-yellow-500 hover:text-black border border-white/10 hover:border-yellow-500 transition-all rounded-full px-4 font-bold"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/description/${job?._id}`);
          }}
        >
          Details
        </Button>
      </div>
    </article>
  );
};

export default Job;
