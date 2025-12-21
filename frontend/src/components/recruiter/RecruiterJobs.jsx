import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import axios from "axios";
import { JOB_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Eye,
  Calendar,
  Building,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Input } from "../ui/input";

const RecruiterJobs = () => {
  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchCompanyJobs();
  }, [statusFilter]);

  const fetchCompanyJobs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await axios.get(`${JOB_API_END_POINT}/company-jobs`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setJobs(response.data.jobs);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch company jobs");
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (job) => {
    if (job.isActive) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          <CheckCircle size={12} className="mr-1" /> Active
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">
        <XCircle size={12} className="mr-1" /> Inactive
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2" size={18} /> Back to Dashboard
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Company Jobs</h1>
              <p className="text-gray-400 mt-1">
                Jobs posted by your CEO • View applications and manage
                candidates
              </p>
            </div>

            <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-400 px-4 py-2 rounded-xl border border-yellow-500/20">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">
                Only CEOs can post new jobs
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              placeholder="Search jobs by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="flex gap-2">
            {["all", "active", "inactive"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                onClick={() => setStatusFilter(status)}
                className={
                  statusFilter === status
                    ? "bg-white text-black"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                }
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Briefcase className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No Jobs Found
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? "Try adjusting your search"
                : "Your CEO hasn't posted any jobs yet"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="bg-[#0a0a0a] border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                  onClick={() =>
                    navigate(`/recruiter/job/${job._id}/applications`)
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Briefcase className="text-blue-400" size={20} />
                      </div>
                      {getStatusBadge(job)}
                    </div>
                    <CardTitle className="text-white text-lg group-hover:text-yellow-400 transition-colors">
                      {job.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-gray-500" />
                        {job.company?.name || "Company"}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-500" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-gray-500" />
                        PKR {job.salary?.toLocaleString() || "Competitive"}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">
                          {job.stats?.totalApplications || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          Applications
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-400">
                          {job.stats?.pending || 0}
                        </div>
                        <div className="text-xs text-gray-500">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-400">
                          {job.stats?.interview || 0}
                        </div>
                        <div className="text-xs text-gray-500">Interview</div>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recruiter/job/${job._id}/applications`);
                      }}
                    >
                      <Eye className="mr-2" size={16} /> View Applications
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterJobs;
