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
  X,
  Cpu,
  Terminal,
} from "lucide-react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

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
    if (score >= 80) return "text-[#00FF94]";
    if (score >= 60) return "text-[#FFD700]";
    return "text-red-500";
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
      <DialogContent className="max-w-4xl bg-[#0A0A0A] border border-white/10 text-white p-0 overflow-hidden font-sans selection:bg-[#FFD700] selection:text-black">
        <DialogHeader className="bg-[#111] border-b border-white/10 p-4">
          <DialogTitle className="flex items-center gap-3 text-lg font-bold tracking-tight uppercase">
            <div className="w-8 h-8 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-sm flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#FFD700]" />
            </div>
            <span>
              <span className="text-[#FFD700]">AI.REPORT</span> // GENERATOR
            </span>
            <Badge
              variant="outline"
              className="ml-auto border-white/20 text-xs font-mono text-gray-400 rounded-sm"
            >
              V2.0.4
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[70vh]">
          {step === "initial" && (
            <div className="p-6 space-y-6">
              {/* Candidate Info Card - Industrial */}
              {interviewData && (
                <div className="bg-[#111] border border-white/10 rounded-sm p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-50">
                    <div className="grid grid-cols-3 gap-1">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 h-1 bg-white/10 rounded-full"
                        ></div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative z-10">
                    <Avatar className="h-16 w-16 border border-white/10 rounded-sm">
                      <AvatarImage
                        src={interviewData.studentId?.profile?.profilePhoto}
                        className="rounded-sm object-cover"
                      />
                      <AvatarFallback className="bg-[#1A1A1A] text-[#FFD700] rounded-sm font-bold">
                        {interviewData.studentId?.fullname?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white uppercase tracking-wider">
                        {interviewData.studentId?.fullname || "Candidate"}
                      </h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {interviewData.studentId?.email || "No email"}
                        </p>
                        <p className="text-xs text-[#FFD700] font-mono flex items-center gap-2">
                          <Briefcase className="w-3 h-3" />
                          TARGET: {interviewData.jobId?.title || "Position"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    {/* MOQ Score */}
                    <div className="bg-[#050505] border border-white/10 p-3 rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                          MCQ_SCORE
                        </span>
                        <Target className="w-3 h-3 text-blue-400" />
                      </div>
                      {getMCQScore() ? (
                        <div>
                          <p
                            className={`text-2xl font-mono font-bold ${getScoreColor(
                              getMCQScore().percentage,
                            )}`}
                          >
                            {getMCQScore().percentage}%
                          </p>
                          <Progress
                            value={getMCQScore().percentage}
                            className="h-1 mt-2 bg-white/10"
                            indicatorClassName={getMCQScore().percentage >= 60 ? "bg-[#FFD700]" : "bg-red-500"}
                          />
                        </div>
                      ) : (
                        <p className="text-gray-600 font-mono text-sm">N/A</p>
                      )}
                    </div>

                    {/* Interview Duration */}
                    <div className="bg-[#050505] border border-white/10 p-3 rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                          DURATION
                        </span>
                        <Clock className="w-3 h-3 text-green-400" />
                      </div>
                      <p className="text-2xl font-mono font-bold text-white">
                        {interviewData.videoInterview?.duration
                          ? Math.round(
                            interviewData.videoInterview.duration / 60,
                          )
                          : 0}
                        <span className="text-xs text-gray-600 ml-1">MIN</span>
                      </p>
                      <div className="h-1 w-full bg-white/10 mt-2 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500/50 w-3/4"></div>
                      </div>
                    </div>

                    {/* Fraud Alerts */}
                    <div className="bg-[#050505] border border-white/10 p-3 rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                          FRAUD_INDEX
                        </span>
                        <Shield className="w-3 h-3 text-red-400" />
                      </div>
                      <p
                        className={`text-2xl font-mono font-bold ${getFraudCount() > 5
                          ? "text-red-500"
                          : getFraudCount() > 2
                            ? "text-orange-500"
                            : "text-[#00FF94]"
                          }`}
                      >
                        {getFraudCount()}
                      </p>
                      <div className="h-1 w-full bg-white/10 mt-2 rounded-full">
                        <div className={`h-full w-${Math.min(getFraudCount() * 10, 100)}% ${getFraudCount() > 0 ? "bg-red-500" : "bg-green-500"}`} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-sm p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD700]/50 to-transparent"></div>
                <div className="w-12 h-12 bg-[#FFD700]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#FFD700]/30 animate-pulse">
                  <Terminal className="w-6 h-6 text-[#FFD700]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                  Initialize Analysis Protocol
                </h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto font-mono">
                  Neural engine will process transcript, behavioral signals, and validation metrics to synthesize CEO-level executive summary.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Recruiter Observations (Optional)</Label>
                <Textarea
                  placeholder="Enter specific behavioral notes or key observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] bg-[#050505] border-white/10 text-white placeholder:text-gray-700 focus:border-[#FFD700]/50 font-mono text-sm resize-none"
                />
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-white/10 rounded-full border-t-[#FFD700] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-white/50" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider animate-pulse">
                  Processing Data...
                </h3>
                <div className="font-mono text-xs text-[#FFD700]">
                  <p>Analyzing speech patterns...</p>
                  <p className="opacity-70">Cross-referencing MCQ results...</p>
                  <p className="opacity-50">Drafting executive summary...</p>
                </div>
              </div>
            </div>
          )}

          {step === "review" && report && (
            <div className="space-y-6 p-6">
              {/* Report Header Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#111] p-4 rounded-sm border border-white/10 text-center group hover:border-[#FFD700]/30 transition-colors">
                  <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">
                    Overall Score
                  </p>
                  <p
                    className={`text-3xl font-bold font-mono ${getScoreColor(
                      report.overallScore,
                    )}`}
                  >
                    {report.overallScore}
                  </p>
                </div>
                <div className="bg-[#111] p-4 rounded-sm border border-white/10 text-center group hover:border-[#FFD700]/30 transition-colors">
                  <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">
                    Recommendation
                  </p>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-[10px] rounded-sm border ${report.aiRecommendation === "STRONGLY_RECOMMEND"
                      ? "border-green-500/50 text-[#00FF94] bg-green-500/10"
                      : report.aiRecommendation === "RECOMMEND"
                        ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                        : "border-yellow-500/50 text-[#FFD700] bg-yellow-500/10"
                      }`}
                  >
                    {report.aiRecommendation?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="bg-[#111] p-4 rounded-sm border border-white/10 text-center group hover:border-[#FFD700]/30 transition-colors">
                  <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">
                    Technical
                  </p>
                  <p className="text-xl font-bold text-white font-mono">
                    {report.technicalScore}%
                  </p>
                </div>
                <div className="bg-[#111] p-4 rounded-sm border border-white/10 text-center group hover:border-[#FFD700]/30 transition-colors">
                  <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">
                    Risk Level
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {report.hiringRisk === "HIGH" && (
                      <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                    )}
                    <span
                      className={`font-bold font-mono text-sm ${report.hiringRisk === "HIGH"
                        ? "text-red-500"
                        : report.hiringRisk === "MEDIUM"
                          ? "text-orange-500"
                          : "text-[#00FF94]"
                        }`}
                    >
                      {report.hiringRisk}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-[#FFD700] tracking-wider flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Executive Summary
                </Label>
                <div className="bg-[#111] border border-white/10 rounded-sm p-4 text-gray-300 leading-relaxed text-sm font-sans relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]"></div>
                  {report.aiSummary}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#00FF94] text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" /> Strengths
                  </Label>
                  <ul className="bg-[#050505] border border-white/10 rounded-sm p-3 space-y-2">
                    {report.strengths?.map((item, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <span className="text-[#00FF94] mt-0.5">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label className="text-red-400 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Concerns
                  </Label>
                  <ul className="bg-[#050505] border border-white/10 rounded-sm p-3 space-y-2">
                    {report.weaknesses?.map((item, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">!</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Edit Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-gray-500">Add Addendum Notes</Label>
                <Textarea
                  value={report.notes || ""}
                  onChange={(e) =>
                    setReport({ ...report, notes: e.target.value })
                  }
                  className="min-h-[80px] bg-[#050505] border-white/10 text-white font-mono text-sm focus:border-[#FFD700]/50"
                  placeholder="Additional context for CEO..."
                />
              </div>

              {/* Next Steps */}
              <div className="bg-[#111] border border-l-4 border-l-blue-500 border-white/10 rounded-sm p-4 flex gap-4 items-center">
                <div className="bg-blue-500/10 p-2 rounded-sm border border-blue-500/30">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wide">Suggested Protocol</h4>
                  <p className="text-blue-400/80 text-xs font-mono mt-1">
                    {report.nextSteps}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="w-20 h-20 bg-[#00FF94]/10 rounded-full flex items-center justify-center border border-[#00FF94]/30 relative">
                <div className="absolute inset-0 rounded-full animate-ping bg-[#00FF94]/5"></div>
                <CheckCircle className="w-10 h-10 text-[#00FF94]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Transmission Complete</h3>
                <p className="text-gray-500 max-w-sm font-mono text-sm mx-auto">
                  Report payload secured and transmitted to Executive Dashboard. Awaiting final decision.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-[#111] border-t border-white/10 p-4">
          {step === "initial" && (
            <div className="flex w-full justify-between gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/5 uppercase tracking-wider font-mono text-xs h-10"
              >
                Abort
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="flex-[2] bg-[#FFD700] text-black hover:bg-[#FFD700]/90 uppercase tracking-widest font-bold text-xs h-10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                EXECUTE AI ANALYSIS
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="flex w-full justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => setStep("initial")}
                className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/5 uppercase tracking-wider font-mono text-xs h-10"
              >
                Reinitalize
              </Button>
              <Button
                onClick={handleSubmitToCEO}
                disabled={isLoading}
                className="flex-[2] bg-[#00FF94] text-black hover:bg-[#00FF94]/90 uppercase tracking-widest font-bold text-xs h-10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                TRANSMIT TO CEO
              </Button>
            </div>
          )}

          {step === "success" && (
            <Button onClick={onClose} className="w-full bg-[#1A1A1A] text-white border border-white/10 hover:bg-[#222] uppercase tracking-widest text-xs h-10">
              Dismiss Protocol
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGenerationModal;
