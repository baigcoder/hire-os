import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { RESUME_API_END_POINT } from "@/utils/constant";
import {
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "../ui/button";

const ResumeUpload = ({ jobId, onUploadComplete }) => {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setAnalysisProgress(0);
    setError("");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      // Upload the resume
      const uploadResponse = await axios.post(
        `${RESUME_API_END_POINT}/upload/${jobId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "x-auth-token": token,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percentCompleted);
          },
        },
      );

      // Simulate analysis progress
      let progress = 0;
      const analysisInterval = setInterval(() => {
        progress += 5;
        setAnalysisProgress(progress);
        if (progress >= 100) {
          clearInterval(analysisInterval);
          setSuccess(true);
          onUploadComplete(uploadResponse.data.analysis);
        }
      }, 200);
    } catch (error) {
      console.error("Resume upload error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to upload resume. Please try again.",
      );
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#111111] rounded-md border border-white/10 p-6 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
      <h3 className="text-sm font-bold mb-4 text-white uppercase tracking-wider">
        Upload Resume
      </h3>

      {!uploading && !success ? (
        <form onSubmit={handleUpload}>
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
        </form>
      ) : success ? (
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-sm bg-[#00FF94]/10 flex items-center justify-center mx-auto mb-4 border border-[#00FF94]/30">
            <CheckCircle className="w-7 h-7 text-[#00FF94]" />
          </div>
          <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">
            Analysis Complete
          </h4>
          <p className="text-gray-500 text-xs font-mono">
            Resume processed by HIRE.OS AI
          </p>
        </div>
      ) : (
        <div className="py-6">
          <h4 className="text-sm font-bold text-white mb-6 text-center uppercase tracking-wider">
            {uploadProgress < 100 ? "Uploading..." : "AI Analyzing..."}
          </h4>

          <div className="mb-6 px-4">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                {uploadProgress < 100 ? "UPLOAD" : "ANALYSIS"}
              </span>
              <span className="text-[10px] font-bold text-[#FFD700] font-mono">
                {uploadProgress < 100
                  ? `${uploadProgress}%`
                  : `${analysisProgress}%`}
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-sm h-1.5 overflow-hidden">
              <div
                className="bg-[#FFD700] h-full rounded-sm transition-all duration-300 shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                style={{
                  width: `${
                    uploadProgress < 100 ? uploadProgress : analysisProgress
                  }%`,
                }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin h-4 w-4 text-[#FFD700]" />
            <span className="text-gray-500 text-xs font-mono">
              {uploadProgress < 100
                ? "Secure transfer..."
                : "Extracting data..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
