import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { RESUME_API_END_POINT, JOB_API_END_POINT } from "@/utils/constant";
import {
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Target,
  Zap,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const ResumeUpload = ({ jobId, onUploadComplete }) => {
  const token = localStorage.getItem("token");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [jobData, setJobData] = useState(null);

  // Loading step messages for animation (same as dashboard)
  const loadingSteps = [
    { icon: "📄", text: "Extracting resume content...", color: "text-blue-400" },
    { icon: "🔍", text: "Analyzing skills & experience...", color: "text-purple-400" },
    { icon: "🤖", text: "GPT-4o mini AI processing...", color: "text-cyan-400" },
    { icon: "📊", text: "Matching with job requirements...", color: "text-green-400" },
    { icon: "✨", text: "Finalizing results...", color: "text-yellow-400" },
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
    } else {
      setFile(null);
      setError("Please select a valid PDF file");
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#00FF94";
    if (score >= 65) return "#22C55E";
    if (score >= 50) return "#FFD700";
    if (score >= 35) return "#F59E0B";
    return "#EF4444";
  };

  const getFitBadge = (fit) => {
    const styles = {
      Excellent: "bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/30",
      Strong: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      Good: "bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30",
      Fair: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      "Needs Improvement": "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return styles[fit] || styles["Fair"];
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    if (!token) {
      setError("Authentication required. Please login.");
      return;
    }

    setUploading(true);
    setLoadingStep(0);
    setError("");

    // Animate through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      // First, get the job description for better matching
      let jobDescription = "";
      try {
        const jobRes = await axios.get(`${JOB_API_END_POINT}/get/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (jobRes.data.job) {
          setJobData(jobRes.data.job);
          jobDescription = `
            Job Title: ${jobRes.data.job.title}
            Company: ${jobRes.data.job.company?.name || ""}
            Description: ${jobRes.data.job.description || ""}
            Requirements: ${jobRes.data.job.requirements?.join(", ") || ""}
            Skills: ${jobRes.data.job.skills?.join(", ") || ""}
          `;
        }
      } catch (e) {
        console.log("Could not fetch job for matching");
      }

      // Use the same analyze-pdf endpoint as the dashboard
      const formData = new FormData();
      formData.append("resume", file);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription.trim());
      }

      const res = await axios.post(
        `${RESUME_API_END_POINT}/analyze-pdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setLoadingStep(loadingSteps.length - 1);
        setTimeout(() => {
          setAnalysis(res.data.analysis);
          toast.success("Resume analyzed successfully!");
        }, 500);
      }
    } catch (error) {
      console.error("Resume analysis error:", error);
      const errorMsg = error.response?.data?.message || "Analysis failed";
      if (error.response?.data?.code === "EMPTY_RESUME") {
        setError("Resume appears empty. Please upload a valid resume with content.");
      } else {
        setError(errorMsg);
      }
      setFile(null);
    } finally {
      clearInterval(stepInterval);
      setUploading(false);
    }
  };

  const handleProceed = () => {
    onUploadComplete(analysis);
  };

  return (
    <div className="bg-[#111111] rounded-md border border-white/10 p-6 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
      <h3 className="text-sm font-bold mb-4 text-white uppercase tracking-wider">
        Upload Resume
      </h3>

      <AnimatePresence mode="wait">
        {uploading ? (
          /* Animated Loading State - Same as Dashboard */
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-8 flex flex-col items-center justify-center"
          >
            {/* Animated Loader */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-[#FFD700]/20 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-14 h-14 rounded-full border-t-4 border-[#FFD700]"
                />
              </div>
              <motion.span
                key={loadingStep}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center text-2xl"
              >
                {loadingSteps[loadingStep]?.icon}
              </motion.span>
            </div>

            {/* Step Text */}
            <motion.p
              key={loadingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-medium ${loadingSteps[loadingStep]?.color} mb-4`}
            >
              {loadingSteps[loadingStep]?.text}
            </motion.p>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {loadingSteps.map((step, idx) => (
                <motion.div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx <= loadingStep ? "bg-[#FFD700]" : "bg-white/20"
                    }`}
                  animate={{ scale: idx === loadingStep ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.5, repeat: idx === loadingStep ? Infinity : 0 }}
                />
              ))}
            </div>

            {/* File info */}
            {file && (
              <p className="text-gray-500 text-xs mt-4 font-mono">
                Analyzing: {file.name}
              </p>
            )}
          </motion.div>
        ) : analysis ? (
          /* Analysis Results - Same Style as Dashboard */
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Score Display */}
            <div className="flex items-center gap-6 p-4 bg-[#0A0A0A] rounded-md border border-white/10">
              {/* Score Circle */}
              <div className="relative flex-shrink-0">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#1A1A1A" strokeWidth="6" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke={getScoreColor(analysis.score)}
                    strokeWidth="6"
                    strokeDasharray={`${(analysis.score / 100) * 251} 251`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white font-mono">{analysis.score}</span>
                  <span className="text-[10px] text-gray-500 uppercase">Score</span>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${getFitBadge(analysis.overallFit || analysis.recommendation || (analysis.score >= 70 ? 'Good' : 'Fair'))} border text-xs`}>
                    {analysis.overallFit || analysis.recommendation || (analysis.score >= 80 ? 'Excellent' : analysis.score >= 70 ? 'Good' : analysis.score >= 50 ? 'Fair' : 'Needs Improvement')} Match
                  </Badge>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                    🤖 AI Analyzed
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white/5 rounded">
                    <span className="text-gray-500 block">Skills Found</span>
                    <span className="text-white font-bold font-mono">
                      {analysis.skills?.matched?.length ||
                        analysis.skills?.technical?.length ||
                        analysis.keySkillsMatch?.length ||
                        analysis.totalSkillsFound ||
                        (analysis.skills?.all?.length) ||
                        '—'}
                    </span>
                  </div>
                  <div className="p-2 bg-white/5 rounded">
                    <span className="text-gray-500 block">Experience</span>
                    <span className="text-white font-bold font-mono">
                      {analysis.experience?.yearsEstimate
                        ? `${analysis.experience.yearsEstimate} yrs`
                        : analysis.experienceYears
                          ? `${analysis.experienceYears} yrs`
                          : analysis.candidate?.estimatedExperience
                            ? `${analysis.candidate.estimatedExperience} yrs`
                            : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Matched */}
            {(() => {
              const matchedSkills = analysis.skills?.matched ||
                analysis.skills?.technical ||
                analysis.keySkillsMatch ||
                analysis.skills?.all ||
                [];
              return matchedSkills.length > 0 && (
                <div className="p-3 bg-[#0A0A0A] rounded-md border border-[#00FF94]/20">
                  <h4 className="text-xs font-bold text-[#00FF94] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Skills Matched ({matchedSkills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {matchedSkills.slice(0, 10).map((skill, idx) => (
                      <Badge key={idx} className="bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30 text-[10px]">
                        {typeof skill === 'string' ? skill : skill?.name || skill?.skill || JSON.stringify(skill)}
                      </Badge>
                    ))}
                    {matchedSkills.length > 10 && (
                      <Badge className="bg-white/5 text-gray-400 border-white/10 text-[10px]">
                        +{matchedSkills.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Missing Skills / Suggestions */}
            {(() => {
              const missingSkills = analysis.skills?.missing ||
                analysis.missingSkills ||
                analysis.suggestions?.filter(s => typeof s === 'string' && s.length < 50) ||
                [];
              return missingSkills.length > 0 && (
                <div className="p-3 bg-[#0A0A0A] rounded-md border border-amber-500/20">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Consider Adding
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {missingSkills.slice(0, 6).map((skill, idx) => (
                      <Badge key={idx} className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                        + {typeof skill === 'string' ? skill : skill?.skill || skill?.name || 'Skill'}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Quick Summary */}
            {(analysis.candidate?.name || analysis.onePageSummary?.headline) && (
              <div className="p-3 bg-[#0A0A0A] rounded-md border border-white/10 text-xs text-gray-400">
                <span className="text-[#FFD700] font-medium">{analysis.candidate?.name || 'Profile'}:</span>{' '}
                {analysis.onePageSummary?.headline || analysis.candidate?.summary || 'Resume analyzed successfully'}
              </div>
            )}

            {/* Proceed Button */}
            <Button
              onClick={handleProceed}
              className="w-full h-10 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold rounded-sm text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Proceed with Application
            </Button>
          </motion.div>
        ) : (
          /* Upload Form */
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleUpload}
          >
            <div className="mb-6">
              <label
                htmlFor="resume"
                className="block text-[10px] font-medium text-gray-500 mb-3 uppercase tracking-wider"
              >
                Resume (PDF only)
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="resume"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-sm cursor-pointer transition-all bg-[#0A0A0A] border-white/10 hover:border-[#FFD700]/50 hover:bg-white/5 group"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="p-3 bg-white/5 rounded-sm mb-3 group-hover:bg-[#FFD700]/10 transition-colors border border-white/5 group-hover:border-[#FFD700]/30">
                      <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#FFD700] transition-colors" />
                    </div>
                    <p className="mb-2 text-xs text-gray-500">
                      <span className="font-bold text-gray-400 group-hover:text-[#FFD700] transition-colors">
                        Click to upload
                      </span>{" "}
                      or drag
                    </p>
                    <p className="text-[10px] text-gray-600 font-mono">
                      PDF (MAX. 5MB)
                    </p>
                  </div>
                  <input
                    id="resume"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              {file && (
                <div className="mt-4 p-3 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-sm flex items-center gap-3">
                  <FileText className="text-[#00FF94]" size={18} />
                  <p className="text-xs text-[#00FF94] font-mono truncate">
                    {file.name}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-sm flex items-center text-xs">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold rounded-sm border-none text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            >
              Upload & Analyze
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResumeUpload;
