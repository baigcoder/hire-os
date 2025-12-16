import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./shared/Navbar";
import { useSelector } from "react-redux";
import { JOB_API_END_POINT } from "../utils/constant";
import JobApplication from "./jobs/JobApplication";
import { Button } from "./ui/button";
import { Briefcase, MapPin, DollarSign, Calendar, Building, Building2, Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const JobDescription = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showApplication, setShowApplication] = useState(false);
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await axios.get(`${JOB_API_END_POINT}/get/${id}`, {
          headers: {
            "x-auth-token": token
          }
        });
        setJob(response.data.job);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("Failed to load job details");
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, token]);

  const handleApplyClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setShowApplication(true);
  };

  const handleApplicationSubmit = () => {
    // Refresh job data or simply close to show success state in parent if needed
    // For now we might toggle back or keep it open (JobApplication handles its own success UI)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-4xl mx-auto py-20 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-white/5 rounded-2xl border border-white/10"></div>
            <div className="h-60 bg-white/5 rounded-2xl border border-white/10"></div>
            <div className="h-20 bg-white/5 rounded-2xl border border-white/10"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-4xl mx-auto py-20 px-4 text-center">
          <div className="bg-red-900/10 border border-red-500/20 p-8 rounded-2xl">
            <p className="text-red-400 text-lg font-medium">{error || "Job not found"}</p>
            <Button
              onClick={() => navigate('/browse')}
              className="mt-6 bg-white/5 hover:bg-white/10 text-white"
            >
              Back to Jobs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-300 selection:bg-yellow-500/30 selection:text-yellow-200">
      <Navbar />

      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-yellow-900/10 to-transparent pointer-events-none"></div>

      <div className="max-w-5xl mx-auto py-12 px-4 relative z-10 pt-32">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-8 text-gray-500 hover:text-white pl-0 hover:bg-transparent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>

        <div className="grid gap-8">
          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Building2 size={120} className="text-white" />
            </div>

            <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
              <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {job.company?.logo ? (
                  <img src={job.company.logo} alt={job.company.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={40} className="text-yellow-500" />
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">{job.title}</h1>
                <p className="text-xl text-yellow-500 font-medium mb-6">{job.company?.name}</p>

                <div className="flex flex-wrap gap-4 text-sm font-medium">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                    <MapPin size={16} className="text-yellow-500/70" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                    <Briefcase size={16} className="text-yellow-500/70" />
                    {job.jobType}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white">
                    <DollarSign size={16} className="text-yellow-500" />
                    {typeof job.salary === 'number' ? job.salary.toLocaleString() : job.salary} LPA
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                    <Calendar size={16} className="text-yellow-500/70" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>


            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  Job Description
                  <div className="h-px flex-1 bg-white/10 ml-4"></div>
                </h2>
                <div className="prose prose-invert max-w-none text-gray-400 leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>
              </motion.div>

              {/* Requirements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  Requirements
                  <div className="h-px flex-1 bg-white/10 ml-4"></div>
                </h2>
                <ul className="space-y-4">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-400">
                      <div className="mt-1.5 min-w-[6px] h-1.5 rounded-full bg-yellow-500"></div>
                      <span className="leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Sidebar / Application */}
            <div className="md:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="sticky top-24"
              >
                {user && user.role === 'student' ? (
                  !showApplication ? (
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl">
                      <h3 className="text-xl font-bold text-white mb-4">Ready to Apply?</h3>
                      <p className="text-sm text-gray-500 mb-6">
                        Use our AI-powered application process to increase your chances of getting hired.
                      </p>
                      <Button
                        onClick={handleApplyClick}
                        className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-bold py-6 rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.2)]"
                      >
                        Apply Now
                      </Button>
                      <p className="text-xs text-center text-gray-600 mt-4 px-4">
                        You'll be able to review your resume analysis before submitting.
                      </p>
                    </div>
                  ) : (
                    <JobApplication
                      jobId={job._id}
                      onApplicationSubmit={handleApplicationSubmit}
                      onCancel={() => setShowApplication(false)}
                    />
                  )
                ) : (
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 text-center">
                    <p className="text-gray-400 mb-4">Login as a student to apply for this position.</p>
                    <Button
                      onClick={() => navigate('/login')}
                      className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/10"
                    >
                      Login to Apply
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescription;