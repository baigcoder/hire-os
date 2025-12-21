import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  FileText,
  User,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Brain,
  Video,
  Shield,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  Download,
  ArrowLeft,
  Star,
  TrendingUp,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Progress } from "../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { INTERVIEW_API_END_POINT } from "@/utils/constant";
import Navbar from "../shared/Navbar";

const InterviewReport = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ceoNotes, setCeoNotes] = useState("");
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null);

  const isCompanyAdmin = user?.role === "company_admin";

  useEffect(() => {
    fetchReport();
  }, [interviewId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(
        `${INTERVIEW_API_END_POINT}/${interviewId}/report`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setReport(response.data.report);
        setCeoNotes(response.data.report.adminComments || "");
      }
    } catch (error) {
      console.error("Fetch report error:", error);
      toast.error("Failed to load interview report");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision) => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${INTERVIEW_API_END_POINT}/${interviewId}/report/decision`,
        {
          decision,
          comments: ceoNotes,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        toast.success(
          `Candidate ${decision === "approved" ? "approved" : "rejected"} successfully!`,
        );
        fetchReport();
        setDecisionDialogOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskBadge = (riskLevel) => {
    const colors = {
      low: "bg-green-500/20 text-green-400 border-green-500/30",
      medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      critical: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[riskLevel] || colors.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <FileText className="mx-auto text-gray-500 mb-4" size={48} />
          <p>Report not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif]">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-400"
          >
            <ArrowLeft className="mr-2" size={18} /> Back
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="text-purple-400" />
                Interview Report
              </h1>
              <p className="text-gray-400 mt-1">
                {report.candidateName} • {report.jobTitle}
              </p>
            </div>

            {/* Status Badge */}
            <Badge
              className={`text-sm px-4 py-2 ${
                report.status === "approved"
                  ? "bg-green-500/20 text-green-400"
                  : report.status === "rejected"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {report.status === "approved"
                ? "✓ Approved"
                : report.status === "rejected"
                  ? "✗ Rejected"
                  : "⏳ Pending Review"}
            </Badge>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Scores */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Overall Score Card */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-gray-400 text-sm">Overall Score</p>
                    <p className="text-5xl font-bold text-white">
                      {report.overallScore || 0}%
                    </p>
                  </div>
                  <div className="w-24 h-24 rounded-full border-4 border-purple-500 flex items-center justify-center">
                    <Star
                      className={`w-10 h-10 ${report.overallScore >= 70 ? "text-yellow-400" : "text-gray-500"}`}
                    />
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="text-purple-400" size={18} />
                      <span className="text-gray-400 text-sm">MCQ Score</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {report.mcqScore || 0}%
                    </p>
                    <Progress
                      value={report.mcqScore || 0}
                      className="mt-2 h-1"
                    />
                  </div>
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="text-blue-400" size={18} />
                      <span className="text-gray-400 text-sm">
                        Interview Score
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {report.interviewScore || 0}%
                    </p>
                    <Progress
                      value={report.interviewScore || 0}
                      className="mt-2 h-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fraud Detection Card */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="text-yellow-400" size={20} />
                  Fraud Detection Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Risk Level</p>
                    <Badge
                      className={`mt-1 ${getRiskBadge(report.fraudRisk?.level || "low")}`}
                    >
                      {(report.fraudRisk?.level || "Low").toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Risk Score</p>
                    <p className="text-2xl font-bold text-white">
                      {report.fraudRisk?.score || 0}/100
                    </p>
                  </div>
                </div>

                {/* Alerts */}
                {report.fraudRisk?.alerts?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-400 mb-2">
                      Detected Alerts:
                    </p>
                    {report.fraudRisk.alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 p-3 rounded-lg ${
                          alert.severity === "critical"
                            ? "bg-red-500/10 border border-red-500/30"
                            : alert.severity === "high"
                              ? "bg-orange-500/10 border border-orange-500/30"
                              : "bg-yellow-500/10 border border-yellow-500/30"
                        }`}
                      >
                        <AlertTriangle
                          size={16}
                          className={
                            alert.severity === "critical"
                              ? "text-red-400"
                              : alert.severity === "high"
                                ? "text-orange-400"
                                : "text-yellow-400"
                          }
                        />
                        <div>
                          <p className="text-white text-sm font-medium">
                            {alert.message}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {alert.details}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!report.fraudRisk?.alerts ||
                  report.fraudRisk.alerts.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle
                      className="mx-auto mb-2 text-green-400"
                      size={32}
                    />
                    <p>No suspicious activity detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Summary */}
            {report.aiSummary && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="text-green-400" size={20} />
                    AI Assessment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 leading-relaxed">
                    {report.aiSummary}
                  </p>

                  {report.strengths?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-green-400 text-sm font-medium mb-2">
                        Strengths:
                      </p>
                      <ul className="space-y-1">
                        {report.strengths.map((s, i) => (
                          <li
                            key={i}
                            className="text-gray-400 text-sm flex items-center gap-2"
                          >
                            <CheckCircle size={14} className="text-green-400" />{" "}
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.weaknesses?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-yellow-400 text-sm font-medium mb-2">
                        Areas for Improvement:
                      </p>
                      <ul className="space-y-1">
                        {report.weaknesses.map((w, i) => (
                          <li
                            key={i}
                            className="text-gray-400 text-sm flex items-center gap-2"
                          >
                            <AlertTriangle
                              size={14}
                              className="text-yellow-400"
                            />{" "}
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Right Column - Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Candidate Info */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl font-bold text-white">
                    {report.candidateName?.charAt(0) || "C"}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {report.candidateName}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {report.candidateEmail}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Position</span>
                    <span className="text-white">{report.jobTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interview Date</span>
                    <span className="text-white">
                      {new Date(report.interviewDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Recruiter</span>
                    <span className="text-white">{report.recruiterName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CEO Decision Section */}
            {isCompanyAdmin && report.status === "submitted" && (
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-white">Final Decision</CardTitle>
                  <CardDescription>
                    Review and approve/reject this candidate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add your notes or comments..."
                    value={ceoNotes}
                    onChange={(e) => setCeoNotes(e.target.value)}
                    className="bg-black/30 border-zinc-700 text-white"
                    rows={4}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setPendingDecision("approved");
                        setDecisionDialogOpen(true);
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-400 text-white"
                    >
                      <ThumbsUp className="mr-2" size={16} /> Approve
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingDecision("rejected");
                        setDecisionDialogOpen(true);
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-400 text-white"
                    >
                      <ThumbsDown className="mr-2" size={16} /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decision Made */}
            {report.adminDecision && (
              <Card
                className={`border ${
                  report.adminDecision.decision === "approved"
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="text-center">
                    {report.adminDecision.decision === "approved" ? (
                      <CheckCircle
                        className="mx-auto text-green-400 mb-2"
                        size={32}
                      />
                    ) : (
                      <XCircle
                        className="mx-auto text-red-400 mb-2"
                        size={32}
                      />
                    )}
                    <p className="text-white font-semibold">
                      {report.adminDecision.decision === "approved"
                        ? "Approved"
                        : "Rejected"}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      by {report.adminDecision.decidedBy?.fullname || "CEO"}
                    </p>
                    {report.adminDecision.comments && (
                      <p className="text-gray-400 mt-3 text-sm italic">
                        "{report.adminDecision.comments}"
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-zinc-700 text-gray-300"
              >
                <Download className="mr-2" size={16} /> Download PDF
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={decisionDialogOpen} onOpenChange={setDecisionDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirm{" "}
              {pendingDecision === "approved" ? "Approval" : "Rejection"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {pendingDecision === "approved" ? "approve" : "reject"}{" "}
              {report.candidateName}?
              {pendingDecision === "approved" &&
                " An offer letter process will be initiated."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDecisionDialogOpen(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDecision(pendingDecision)}
              disabled={submitting}
              className={
                pendingDecision === "approved" ? "bg-green-500" : "bg-red-500"
              }
            >
              {submitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewReport;
