import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Award,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  FileSearch,
  GraduationCap,
  Briefcase,
  Code,
  ArrowRight,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { RESUME_API_END_POINT } from "@/utils/constant";

const ResumeAnalyzer = () => {
  const { user } = useSelector((state) => state.auth);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // For animated transitions
  const [showJobInput, setShowJobInput] = useState(false);
  const [existingAnalysis, setExistingAnalysis] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadMode, setUploadMode] = useState("pdf"); // 'pdf' or 'text'

  // Loading step messages for animation
  const loadingSteps = [
    {
      icon: "📄",
      text: "Extracting resume content...",
      color: "text-blue-400",
    },
    {
      icon: "🔍",
      text: "Analyzing skills & experience...",
      color: "text-purple-400",
    },
    {
      icon: "🤖",
      text: "GPT-4o mini AI processing...",
      color: "text-cyan-400",
    },
    { icon: "📊", text: "Generating insights...", color: "text-green-400" },
    { icon: "✨", text: "Finalizing results...", color: "text-yellow-400" },
  ];

  // Fetch existing analysis on mount
  useEffect(() => {
    fetchExistingAnalysis();
  }, []);

  const fetchExistingAnalysis = async () => {
    try {
      const res = await axios.get(`${RESUME_API_END_POINT}/my-analysis`, {
        withCredentials: true,
      });
      if (res.data.success && res.data.analysis) {
        setExistingAnalysis(res.data.analysis);
      }
    } catch (error) {
      console.log("No existing analysis");
    }
  };

  // Handle PDF file upload and analysis
  const handlePDFUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setPdfFile(file);
    setLoading(true);
    setLoadingStep(0);

    // Animate through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription.trim());
      }

      const res = await axios.post(
        `${RESUME_API_END_POINT}/analyze-pdf`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (res.data.success) {
        setLoadingStep(loadingSteps.length - 1);
        setTimeout(() => {
          setAnalysis(res.data.analysis);
          toast.success("Resume analyzed successfully!");
        }, 500);
      }
    } catch (error) {
      console.error("PDF analysis error:", error);
      const errorMsg = error.response?.data?.message || "PDF analysis failed";
      if (error.response?.data?.code === "EMPTY_RESUME") {
        toast.error(
          "Resume appears empty. Please upload a valid resume with content.",
        );
      } else {
        toast.error(errorMsg);
      }
      setPdfFile(null);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  // Handle text-based analysis (legacy)
  const handleAnalyze = async () => {
    if (!resumeText.trim() || resumeText.length < 100) {
      toast.error("Please paste at least 100 characters of resume text");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${RESUME_API_END_POINT}/enhanced-analyze`,
        {
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim() || null,
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        setAnalysis(res.data.analysis);
        toast.success("Resume analyzed successfully!");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error.response?.data?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      handlePDFUpload(e);
    } else if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setResumeText(e.target.result);
        setUploadMode("text");
        toast.success("Resume text loaded");
      };
      reader.readAsText(file);
    } else {
      toast.error("Please upload a PDF or TXT file");
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

  const getSuggestions = () => {
    if (!analysis) return [];
    if (
      Array.isArray(analysis.suggestions) &&
      analysis.suggestions.length > 0
    ) {
      return analysis.suggestions;
    }
    if (
      Array.isArray(analysis.improvements) &&
      analysis.improvements.length > 0
    ) {
      return analysis.improvements;
    }
    if (
      Array.isArray(analysis.onePageSummary?.improvementAreas) &&
      analysis.onePageSummary.improvementAreas.length > 0
    ) {
      return analysis.onePageSummary.improvementAreas;
    }
    if (
      Array.isArray(analysis.keyStrengths) &&
      analysis.keyStrengths.length > 0
    ) {
      return analysis.keyStrengths;
    }
    if (
      Array.isArray(analysis.skillAnalysis?.missing) &&
      analysis.skillAnalysis.missing.length > 0
    ) {
      return analysis.skillAnalysis.missing
        .map((item) => {
          if (typeof item === "string") return item;
          const parts = [];
          if (item.skill) parts.push(`Develop skill: ${item.skill}`);
          if (item.importance) parts.push(`(${item.importance})`);
          if (item.suggestion) parts.push(`- ${item.suggestion}`);
          return parts.join(" ").trim() || null;
        })
        .filter(Boolean);
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/30">
              <FileSearch className="w-5 h-5 text-[#FFD700]" />
            </div>
            Resume Analyzer
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {user?.fullname
              ? `AI-powered resume scoring and optimization for ${user?.fullname}`
              : "AI-powered resume scoring and optimization"}
          </p>
        </div>
        {analysis && (
          <Button
            onClick={() => {
              setAnalysis(null);
              setResumeText("");
            }}
            variant="outline"
            className="border-white/10 text-gray-400 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#111111] border border-white/10 rounded-md p-12 flex flex-col items-center justify-center min-h-[400px]"
          >
            {/* Animated Loader */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-[#FFD700]/20 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-t-4 border-[#FFD700]"
                />
              </div>
              <motion.span
                key={loadingStep}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center text-3xl"
              >
                {loadingSteps[loadingStep]?.icon}
              </motion.span>
            </div>

            {/* Step Text */}
            <motion.p
              key={loadingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-lg font-medium ${loadingSteps[loadingStep]?.color} mb-6`}
            >
              {loadingSteps[loadingStep]?.text}
            </motion.p>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {loadingSteps.map((step, idx) => (
                <motion.div
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${idx <= loadingStep ? "bg-[#FFD700]" : "bg-white/20"
                    }`}
                  animate={{
                    scale: idx === loadingStep ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: idx === loadingStep ? Infinity : 0,
                  }}
                />
              ))}
            </div>

            {/* File info */}
            {pdfFile && (
              <p className="text-gray-500 text-sm mt-6">
                Analyzing: {pdfFile.name}
              </p>
            )}
          </motion.div>
        ) : !analysis ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Existing Analysis Quick View */}
            {existingAnalysis && !resumeText && (
              <div className="bg-[#111111] border border-white/10 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-[#FFD700] font-mono">
                      {existingAnalysis.score}%
                    </div>
                    <div>
                      <Badge
                        className={`${getFitBadge(existingAnalysis.overallFit)} border`}
                      >
                        {existingAnalysis.overallFit}
                      </Badge>
                      <p className="text-gray-500 text-xs mt-1">
                        Last analyzed:{" "}
                        {new Date(
                          existingAnalysis.analyzedAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setAnalysis(existingAnalysis)}
                    variant="outline"
                    size="sm"
                    className="border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            )}

            {/* Resume Input */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-white/10" />

              {/* PDF Upload Section */}
              <div className="mb-6">
                <label className="text-xs text-[#FFD700] uppercase tracking-wider mb-3 block font-mono">
                  📄 Upload PDF Resume (Recommended)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#FFD700]/30 rounded-md cursor-pointer bg-[#0A0A0A] hover:bg-[#FFD700]/5 hover:border-[#FFD700]/50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {pdfFile ? (
                      <>
                        <FileText className="w-8 h-8 mb-2 text-[#FFD700]" />
                        <p className="text-sm text-[#FFD700] font-medium">
                          {pdfFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Click to replace
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 text-[#FFD700]/60" />
                        <p className="text-sm text-gray-400">
                          <span className="text-[#FFD700] font-medium">
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF only (max 5MB)
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500 uppercase">
                  or paste text
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Text Input */}
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-3 block font-mono">
                Paste Resume Text
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Alternatively, paste your resume content here..."
                rows={6}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white placeholder:text-gray-600 focus:border-[#FFD700]/50 focus:outline-none resize-none font-mono text-sm"
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 text-xs">
                    {resumeText.length} characters
                  </span>
                </div>

                <button
                  onClick={() => setShowJobInput(!showJobInput)}
                  className="text-[#FFD700] text-sm flex items-center gap-1 hover:underline"
                >
                  {showJobInput ? "Hide" : "Compare to Job"}
                  {showJobInput ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Optional Job Description */}
            <AnimatePresence>
              {showJobInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#111111] border border-[#FFD700]/20 rounded-md p-6"
                >
                  <label className="text-xs text-[#FFD700] uppercase tracking-wider mb-3 block font-mono">
                    Job Description (Optional)
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description to compare your resume against specific requirements..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white placeholder:text-gray-600 focus:border-[#FFD700]/50 focus:outline-none resize-none font-mono text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={loading || resumeText.length < 100}
              className="w-full py-6 bg-[#FFD700] text-black hover:bg-[#FFE44D] font-bold text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Analyze Resume
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-[#FFD700]/30" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-[#FFD700]/30" />

              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Score Circle */}
                <div className="relative">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#1A1A1A"
                      strokeWidth="8"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke={getScoreColor(analysis.score)}
                      strokeWidth="8"
                      strokeDasharray={`${(analysis.score / 100) * 440} 440`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white font-mono">
                      {analysis.score}
                    </span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      Score
                    </span>
                  </div>
                </div>

                {/* Score Details */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`${getFitBadge(analysis.overallFit)} border px-3 py-1 text-sm`}
                    >
                      {analysis.overallFit} Match
                    </Badge>
                    {analysis.source && (
                      <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                        {analysis.source?.includes("gpt")
                          ? "🚀 GPT-4o mini"
                          : analysis.source === "gemini-ai"
                            ? "✨ Gemini AI"
                            : analysis.analysisMethod === "unified-3-engine"
                              ? "🔥 3-Engine AI"
                              : "Quick Scan"}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase mb-1">
                        ATS Score
                      </div>
                      <div className="text-xl font-bold text-white font-mono">
                        {analysis.atsScore || "--"}%
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase mb-1">
                        Skills Found
                      </div>
                      <div className="text-xl font-bold text-white font-mono">
                        {analysis.totalSkillsFound ||
                          analysis.skills?.technical?.length ||
                          analysis.skills?.matched?.length ||
                          0}
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase mb-1">
                        Experience
                      </div>
                      <div className="text-xl font-bold text-white font-mono">
                        {analysis.experienceYears
                          ? `${analysis.experienceYears} yrs`
                          : analysis.experience?.totalYears
                            ? `${analysis.experience.totalYears} yrs`
                            : analysis.candidate?.estimatedExperience
                              ? `${analysis.candidate.estimatedExperience} yrs`
                              : "--"}
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase mb-1">
                        Education
                      </div>
                      <div className="text-xl font-bold text-white font-mono truncate">
                        {analysis.educationLevel ||
                          analysis.education?.level ||
                          "--"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown with Progress Bars */}
            {analysis.scoreBreakdown && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#111111] border border-white/10 rounded-md p-6"
              >
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#FFD700]" />
                  Score Breakdown
                </h3>
                <div className="space-y-4">
                  {[
                    { key: "skills", label: "Technical Skills", max: 30, color: "bg-cyan-500" },
                    { key: "experience", label: "Experience", max: 25, color: "bg-purple-500" },
                    { key: "projects", label: "Projects", max: 20, color: "bg-emerald-500" },
                    { key: "education", label: "Education", max: 15, color: "bg-blue-500" },
                    { key: "ats", label: "ATS Compatibility", max: 10, color: "bg-amber-500" },
                  ].map((item, idx) => {
                    const score = analysis.scoreBreakdown[item.key] || 0;
                    const percentage = (score / item.max) * 100;
                    return (
                      <div key={item.key} className="group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                            {item.label}
                          </span>
                          <span className="text-sm font-mono text-white">
                            {score}<span className="text-gray-600">/{item.max}</span>
                          </span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className={`h-full ${item.color} rounded-full`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}   {/* Skills Section */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Matched Skills */}
              <div className="bg-[#111111] border border-white/10 rounded-md p-5">
                <h3 className="text-sm font-bold text-[#00FF94] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Skills Matched (
                  {
                    (
                      analysis.keySkillsMatch ||
                      analysis.skills?.matched ||
                      analysis.skills?.technical ||
                      []
                    ).length
                  }
                  )
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    analysis.keySkillsMatch ||
                    analysis.skills?.matched ||
                    analysis.skills?.technical ||
                    []
                  )
                    .slice(0, 15)
                    .map((skill, idx) => (
                      <Badge
                        key={idx}
                        className="bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30 text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  {(
                    analysis.keySkillsMatch ||
                    analysis.skills?.matched ||
                    analysis.skills?.technical ||
                    []
                  ).length === 0 && (
                      <span className="text-gray-500 text-sm">
                        No matched skills found
                      </span>
                    )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="bg-[#111111] border border-white/10 rounded-md p-5">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Skills to Add (
                  {
                    (analysis.missingSkills || analysis.skills?.missing || [])
                      .length
                  }
                  )
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.missingSkills || analysis.skills?.missing || [])
                    .slice(0, 8)
                    .map((skill, idx) => (
                      <Badge
                        key={idx}
                        className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs"
                      >
                        + {skill}
                      </Badge>
                    ))}
                  {(analysis.missingSkills || analysis.skills?.missing || [])
                    .length === 0 && (
                      <span className="text-gray-500 text-sm">
                        Great coverage!
                      </span>
                    )}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {getSuggestions().length > 0 && (
              <div className="bg-[#111111] border border-[#FFD700]/20 rounded-md p-5">
                <h3 className="text-sm font-bold text-[#FFD700] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Improvement Suggestions
                </h3>
                <ul className="space-y-2">
                  {getSuggestions().map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-gray-300 text-sm"
                    >
                      <ArrowRight className="w-4 h-4 text-[#FFD700] mt-0.5 flex-shrink-0" />
                      {typeof suggestion === "string"
                        ? suggestion
                        : suggestion?.suggestion ||
                        suggestion?.title ||
                        JSON.stringify(suggestion)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Wins Section */}
            {analysis.quickWins && analysis.quickWins.length > 0 && (
              <div className="bg-[#111111] border border-[#00FF94]/20 rounded-md p-5">
                <h3 className="text-sm font-bold text-[#00FF94] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Quick Wins (30 min or less)
                </h3>
                <ul className="space-y-2">
                  {analysis.quickWins.map((win, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-gray-300 text-sm"
                    >
                      <CheckCircle className="w-4 h-4 text-[#00FF94] mt-0.5 flex-shrink-0" />
                      {typeof win === "string" ? win : win?.suggestion || win}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ATS Optimization Tips */}
            {analysis.atsOptimizationTips &&
              analysis.atsOptimizationTips.length > 0 && (
                <div className="bg-[#111111] border border-cyan-500/20 rounded-md p-5">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    ATS Optimization Tips
                  </h3>
                  <ul className="space-y-2">
                    {analysis.atsOptimizationTips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-gray-300 text-sm"
                      >
                        <ArrowRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        {typeof tip === "string" ? tip : tip?.suggestion || tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Learning Resources */}
            {analysis.learningResources &&
              analysis.learningResources.length > 0 && (
                <div className="bg-[#111111] border border-purple-500/20 rounded-md p-5">
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Recommended Learning Resources
                  </h3>
                  <div className="space-y-3">
                    {analysis.learningResources
                      .slice(0, 5)
                      .map((resource, idx) => (
                        <div key={idx} className="bg-white/5 rounded-sm p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium text-sm">
                              {resource.skill}
                            </span>
                            <Badge
                              className={`text-xs ${resource.priority === "Critical"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : resource.priority === "High"
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                }`}
                            >
                              {resource.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-xs">
                            {resource.resource} • {resource.platform}
                          </p>
                          {resource.estimatedTime && (
                            <p className="text-gray-500 text-xs mt-1">
                              ⏱️ {resource.estimatedTime}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Interview Preparation */}
            {analysis.interviewQuestions &&
              analysis.interviewQuestions.length > 0 && (
                <div className="bg-[#111111] border border-pink-500/20 rounded-md p-5">
                  <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Interview Preparation
                  </h3>
                  <div className="space-y-4">
                    {analysis.interviewQuestions.slice(0, 4).map((q, idx) => (
                      <div key={idx} className="bg-white/5 rounded-sm p-3">
                        <p className="text-white text-sm font-medium mb-2">
                          "{q.question}"
                        </p>
                        <p className="text-gray-500 text-xs mb-1">
                          <span className="text-pink-400">
                            Why this matters:
                          </span>{" "}
                          {q.reason}
                        </p>
                        {q.howToPrepare && (
                          <p className="text-gray-400 text-xs">
                            <span className="text-[#FFD700]">
                              How to prepare:
                            </span>{" "}
                            {q.howToPrepare}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Key Strengths */}
            {analysis.keyStrengths && analysis.keyStrengths.length > 0 && (
              <div className="bg-[#111111] border border-emerald-500/20 rounded-md p-5">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Your Key Strengths
                </h3>
                <ul className="space-y-2">
                  {analysis.keyStrengths.slice(0, 5).map((strength, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-gray-300 text-sm"
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {typeof strength === "string"
                        ? strength
                        : strength?.strength || strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Market Position */}
            {analysis.competitorComparison && (
              <div className="bg-[#111111] border border-white/10 rounded-md p-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Market Position
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-sm">
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Position
                    </div>
                    <div className="text-lg font-bold text-white">
                      {analysis.competitorComparison.marketPosition}
                    </div>
                  </div>
                  {analysis.competitorComparison.standoutFactor && (
                    <div className="p-3 bg-white/5 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase mb-1">
                        Standout Factor
                      </div>
                      <div className="text-sm text-gray-300">
                        {analysis.competitorComparison.standoutFactor}
                      </div>
                    </div>
                  )}
                </div>
                {analysis.competitorComparison.competitiveAdvantage && (
                  <div className="mt-3 p-3 bg-[#FFD700]/10 rounded-sm">
                    <div className="text-xs text-[#FFD700] uppercase mb-1">
                      Competitive Advantage
                    </div>
                    <div className="text-sm text-gray-300">
                      {analysis.competitorComparison.competitiveAdvantage}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResumeAnalyzer;
