import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const SimilarJobs = ({ jobId, limit = 4 }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (jobId) fetchSimilarJobs();
  }, [jobId]);

  const fetchSimilarJobs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/job/${jobId}/similar?limit=${limit}`,
      );
      if (res.data.success) {
        setJobs(res.data.similarJobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch similar jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-[#FFD700]/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
          <Sparkles className="w-4 h-4 text-[#FFD700]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            SIMILAR JOBS
          </h3>
          <p className="text-[10px] text-gray-500 font-mono tracking-wider">
            BASED ON YOUR INTERESTS
          </p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-2">
        {jobs.map((job, index) => (
          <motion.div
            key={job._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-sm hover:border-[#FFD700]/30 transition-all cursor-pointer group"
            onClick={() => navigate(`/description/${job._id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center border border-white/10">
                {job.company?.logo ? (
                  <img
                    src={job.company.logo}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                ) : (
                  <Building2 className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-white group-hover:text-[#FFD700] transition-colors">
                  {job.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                  <span>{job.company?.name}</span>
                  <span className="text-[#FFD700]">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.location || "Remote"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20 border text-[9px] font-mono">
                {job.matchReason || "SIMILAR"}
              </Badge>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#FFD700] transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* View All Button */}
      <Button
        onClick={() => navigate("/jobs")}
        className="w-full mt-4 bg-white/5 border border-white/10 text-gray-400 hover:bg-[#FFD700]/10 hover:text-[#FFD700] hover:border-[#FFD700]/30 font-mono text-xs"
      >
        BROWSE ALL JOBS
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};

export default SimilarJobs;
