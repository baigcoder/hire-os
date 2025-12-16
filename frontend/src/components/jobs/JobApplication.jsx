import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { APPLICATION_API_END_POINT } from "@/utils/constant";
import ResumeUpload from "./ResumeUpload";
import { Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "../ui/button";

const JobApplication = ({ jobId, onApplicationSubmit, onCancel }) => {
  const { token } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResumeUploadComplete = (analysis) => {
    setResumeAnalysis(analysis);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeAnalysis) {
      setError("Please upload and analyze your resume first");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await axios.post(
        `${APPLICATION_API_END_POINT}/apply/${jobId}`,
        {
          coverLetter,
          resumeAnalysisId: resumeAnalysis._id
        },
        {
          headers: {
            "x-auth-token": token
          }
        }
      );

      setSuccess(true);
      setTimeout(() => {
        if (onApplicationSubmit) {
          onApplicationSubmit(response.data.application);
        }
      }, 2000);
    } catch (error) {
      console.error("Application submission error:", error);
      setError(
        error.response?.data?.message ||
        "Failed to submit application. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Apply for Job</h2>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {!success ? (
        <div>
          {!resumeAnalysis ? (
            <ResumeUpload
              jobId={jobId}
              onUploadComplete={handleResumeUploadComplete}
            />
          ) : (
            <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3" />
                <div>
                  <h4 className="font-bold text-green-400">Resume Analysis Complete</h4>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-2 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Overall Score</p>
                      <p className="text-xl font-bold text-white">{resumeAnalysis.analysisScore}%</p>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Match Rating</p>
                      <p className="text-xl font-bold text-white capitalize">{resumeAnalysis.overallFit}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="mb-6">
              <label
                htmlFor="coverLetter"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Cover Letter (Optional)
              </label>
              <textarea
                id="coverLetter"
                rows="6"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all resize-none"
                placeholder="Tell the employer why you're a good fit for this position..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              ></textarea>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!resumeAnalysis || submitting}
              className={`w-full py-6 text-lg font-bold rounded-xl transition-all ${!resumeAnalysis
                  ? "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
                  : "bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Submitting Application...
                </span>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Application Submitted!
          </h3>
          <p className="text-gray-400 mb-8 max-w-xs mx-auto">
            Your application has been successfully sent. You can track its status in your dashboard.
          </p>
          <Button
            onClick={onCancel || onApplicationSubmit}
            className="px-8 py-3 bg-white/10 text-white hover:bg-white/20 rounded-xl font-bold border border-white/10"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobApplication;