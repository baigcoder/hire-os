import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Wand2,
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  Briefcase,
  Mail,
  Clock,
  Target,
  Shield,
} from "lucide-react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const ReportGenerationModal = ({
  isOpen,
  onClose,
  interviewId,
  onReportSubmitted,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [step, setStep] = useState("initial"); // initial, generating, review, submitting, success
  const [notes, setNotes] = useState("");
  const [interviewData, setInterviewData] = useState(null);
  const { user } = useSelector((store) => store.auth);

  // Fetch interview details when modal opens
  useEffect(() => {
    if (isOpen && interviewId) {
      fetchInterviewDetails();
    }
  }, [isOpen, interviewId]);

  const fetchInterviewDetails = async () => {
    try {
      const res = await axios.get(`${API_BASE}/interview/${interviewId}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setInterviewData(res.data.interview);
      }
    } catch (error) {
      console.error("Failed to fetch interview details:", error);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setStep("generating");
    try {
      const res = await axios.post(
        `${API_BASE}/interview/${interviewId}/report/generate`,
        {
          recruiterNotes: notes,
        },
        {
          withCredentials: true,
        },
      );
      if (res.data.success) {
        setReport(res.data.report);
        setStep("review");
        toast.success("AI Report generated successfully!");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to generate report");
      setStep("initial");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitToCEO = async () => {
    setIsLoading(true);
    setStep("submitting");
    try {
      const res = await axios.post(
        `${API_BASE}/interview/${interviewId}/report/send-to-ceo`,
        {
          finalNotes: report.notes,
        },
        {
          withCredentials: true,
        },
      );
      if (res.data.success) {
        setStep("success");
        toast.success("Report submitted to CEO successfully!");
        if (onReportSubmitted) onReportSubmitted();
        setTimeout(() => {
          onClose();
          setStep("initial");
          setReport(null);
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to submit report");
      setStep("review");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getMCQScore = () => {
    if (!interviewData?.mcqTest) return null;
    const { correctAnswers, totalQuestions, score } = interviewData.mcqTest;
    return {
      correct: correctAnswers || 0,
      total: totalQuestions || 0,
      percentage: score || 0,
    };
  };

  const getFraudCount = () => {
    const mcqFraud = interviewData?.mcqTest?.fraudAlerts?.length || 0;
    const videoFraud = interviewData?.videoInterview?.fraudAlerts?.length || 0;
    return mcqFraud + videoFraud;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="w-5 h-5 text-purple-600" />
            AI Interview Report Generator
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          {step === "initial" && (
            <div className="space-y-6 py-4">
              {/* Candidate Info Card */}
              {interviewData && (
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 border rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white shadow">
                      <AvatarImage
                        src={interviewData.studentId?.profile?.profilePhoto}
                      />
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-xl font-bold">
                        {interviewData.studentId?.fullname?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {interviewData.studentId?.fullname || "Candidate"}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {interviewData.studentId?.email || "No email"}
                      </p>
                      <p className="text-sm text-purple-600 flex items-center gap-1 mt-1">
                        <Briefcase className="w-3 h-3" />
                        {interviewData.jobId?.title || "Position"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {/* MCQ Score */}
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          MCQ Score
                        </span>
                      </div>
                      {getMCQScore() ? (
                        <div>
                          <p
                            className={`text-2xl font-bold ${getScoreColor(getMCQScore().percentage)}`}
                          >
                            {getMCQScore().percentage}%
                          </p>
                          <p className="text-xs text-gray-400">
                            {getMCQScore().correct}/{getMCQScore().total}{" "}
                            correct
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Not taken</p>
                      )}
                    </div>

                    {/* Interview Duration */}
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          Duration
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {interviewData.videoInterview?.duration
                          ? Math.round(
                              interviewData.videoInterview.duration / 60,
                            )
                          : 0}
                      </p>
                      <p className="text-xs text-gray-400">minutes</p>
                    </div>

                    {/* Fraud Alerts */}
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          Fraud Alerts
                        </span>
                      </div>
                      <p
                        className={`text-2xl font-bold ${getFraudCount() > 5 ? "text-red-600" : getFraudCount() > 2 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {getFraudCount()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getFraudCount() > 5
                          ? "High risk"
                          : getFraudCount() > 2
                            ? "Medium risk"
                            : "Low risk"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-100 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  Generate Comprehensive AI Report
                </h3>
                <p className="text-purple-700 max-w-md mx-auto mb-6">
                  Our AI will analyze MCQ results, video interaction, fraud
                  alerts, and your notes to create a detailed report for the
                  CEO.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Add Recruiter Notes (Optional)</Label>
                <Textarea
                  placeholder="Add your key observations here to help the AI..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-gray-500">
                  Your notes will be incorporated into the final analysis.
                </p>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Analyzing Interview Data...
                </h3>
                <p className="text-gray-500">
                  Processing scores, transcript, and behavioral signals
                </p>
              </div>
            </div>
          )}

          {step === "review" && report && (
            <div className="space-y-6 py-2">
              {/* Header Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">
                    Overall Score
                  </p>
                  <p
                    className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}
                  >
                    {report.overallScore}%
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">
                    Recommendation
                  </p>
                  <Badge
                    className={`mt-1 text-sm ${
                      report.aiRecommendation === "STRONGLY_RECOMMEND"
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : report.aiRecommendation === "RECOMMEND"
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    }`}
                  >
                    {report.aiRecommendation?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">
                    Technical
                  </p>
                  <p className="text-xl font-semibold text-gray-900">
                    {report.technicalScore}%
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border text-center">
                  <p className="text-xs text-gray-500 uppercase font-medium">
                    Risk Level
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {report.hiringRisk === "HIGH" && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={`font-semibold ${
                        report.hiringRisk === "HIGH"
                          ? "text-red-600"
                          : report.hiringRisk === "MEDIUM"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {report.hiringRisk}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Executive Summary
                </Label>
                <div className="bg-white border rounded-md p-4 text-gray-700 leading-relaxed text-sm">
                  {report.aiSummary}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-green-700 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Key Strengths
                  </Label>
                  <ul className="list-disc list-inside text-sm text-gray-600 bg-green-50/50 p-3 rounded-md border border-green-100">
                    {report.strengths?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-700 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Areas of Concern
                  </Label>
                  <ul className="list-disc list-inside text-sm text-gray-600 bg-amber-50/50 p-3 rounded-md border border-amber-100">
                    {report.weaknesses?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Edit Notes */}
              <div className="space-y-2">
                <Label>Edit Final Notes</Label>
                <Textarea
                  value={report.notes || ""}
                  onChange={(e) =>
                    setReport({ ...report, notes: e.target.value })
                  }
                  className="min-h-[100px]"
                />
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
                <div className="mt-1 bg-blue-100 p-1.5 rounded-full">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">
                    Suggested Next Step
                  </h4>
                  <p className="text-blue-700 text-sm mt-0.5">
                    {report.nextSteps}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sent to CEO!</h3>
              <p className="text-gray-500 max-w-sm">
                The report has been successfully submitted to the CEO dashboard
                for final review and approval.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          {step === "initial" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Generate AI Report
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("initial")}>
                Regenerate
              </Button>
              <Button
                onClick={handleSubmitToCEO}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit to CEO
              </Button>
            </>
          )}

          {step === "success" && (
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGenerationModal;
