import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
    FileText,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ChevronRight,
    User,
    Briefcase,
    Brain,
    Target,
    Clock,
    Send,
    Loader2,
    Shield,
    Star,
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import { Progress } from "../ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const InterviewReports = () => {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [decisionNote, setDecisionNote] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/interview/ceo/pending-reports`, {
                withCredentials: true,
            });
            if (res.data.success) {
                setReports(res.data.reports || []);
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            toast.error("Failed to load interview reports");
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (decision) => {
        if (!selectedReport) return;
        setProcessing(true);
        try {
            const res = await axios.post(
                `${API_BASE}/interview/${selectedReport.interviewId}/ceo/decision`,
                {
                    decision,
                    comments: decisionNote,
                },
                { withCredentials: true }
            );

            if (res.data.success) {
                toast.success(
                    `Candidate ${decision === "approved" ? "Approved" : "Rejected"} successfully`
                );
                setSelectedReport(null);
                setDecisionNote("");
                fetchReports(); // Refresh list
            }
        } catch (error) {
            console.error("Decision error:", error);
            toast.error(error.response?.data?.message || "Failed to submit decision");
        } finally {
            setProcessing(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return "text-emerald-400";
        if (score >= 60) return "text-amber-400";
        return "text-red-400";
    };

    const getRiskColor = (risk) => {
        if (risk === "HIGH") return "text-red-400 bg-red-500/10 border-red-500/30";
        if (risk === "MEDIUM")
            return "text-amber-400 bg-amber-500/10 border-amber-500/30";
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <CheckCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>No reports pending approval</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                    <motion.div
                        key={report.interviewId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#111111] border border-white/10 rounded-sm p-4 hover:border-[#FFD700]/30 transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => setSelectedReport(report)}
                    >
                        {/* Status Line */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FFD700] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-white/10">
                                    <AvatarImage src={report.candidate.photo} />
                                    <AvatarFallback className="bg-zinc-800 text-gray-400">
                                        {report.candidate.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-white font-medium text-sm">
                                        {report.candidate.name}
                                    </h3>
                                    <p className="text-gray-500 text-xs font-mono">
                                        {report.job}
                                    </p>
                                </div>
                            </div>
                            <Badge
                                className={`text-[10px] font-mono ${getRiskColor(
                                    report.report.hiringRisk
                                )}`}
                            >
                                {report.report.hiringRisk} RISK
                            </Badge>
                        </div>

                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-white/5 p-2 rounded-sm text-center">
                                <div className={`text-lg font-bold ${getScoreColor(report.report.overallScore)}`}>
                                    {report.report.overallScore}%
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase">Overall</div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-sm text-center">
                                <div className="text-lg font-bold text-white">
                                    {report.scores.technical}%
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase">Tech</div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-sm text-center">
                                <div className="text-lg font-bold text-white">
                                    {report.scores.mcq || 0}%
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase">MCQ</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                            <span className="flex items-center gap-1">
                                <Brain className="w-3 h-3" />
                                {report.report.recommendation?.replace(/_/g, " ")}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(report.report.generatedAt).toLocaleDateString()}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0f0f0f] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#FFD700]" />
                                Technical Interview Report
                            </span>
                            {selectedReport && (
                                <Badge variant="outline" className="text-xs font-mono border-white/20">
                                    ID: {selectedReport.interviewId.slice(-6).toUpperCase()}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Review AI analysis and make your hiring decision.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
                            {/* Candidate Bio */}
                            <div className="flex flex-col md:flex-row gap-6 p-4 bg-white/5 rounded-lg border border-white/10">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 border-2 border-[#FFD700]">
                                        <AvatarImage src={selectedReport.candidate.photo} />
                                        <AvatarFallback className="text-xl bg-zinc-800">
                                            {selectedReport.candidate.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {selectedReport.candidate.name}
                                        </h2>
                                        <p className="text-gray-400 flex items-center gap-1.5 text-sm mt-1">
                                            <Briefcase className="w-3.5 h-3.5" />
                                            {selectedReport.job}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                                    <div className="p-2 border-r border-white/10 last:border-0">
                                        <div className={`text-2xl font-bold ${getScoreColor(selectedReport.report.overallScore)}`}>
                                            {selectedReport.report.overallScore}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Score</div>
                                    </div>
                                    <div className="p-2 border-r border-white/10 last:border-0">
                                        <div className="text-2xl font-bold text-white">
                                            {selectedReport.scores.technical}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tech</div>
                                    </div>
                                    <div className="p-2 border-r border-white/10 last:border-0">
                                        <div className="text-2xl font-bold text-white">
                                            {selectedReport.scores.communication}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Comm</div>
                                    </div>
                                    <div className="p-2">
                                        <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                                            {selectedReport.scores.mcq || "-"}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">MCQ</div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Summary */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-purple-400" /> Executive Summary
                                </h3>
                                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-gray-300 leading-relaxed italic">
                                    "{selectedReport.report.summary}"
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Strengths */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                        <ThumbsUp className="w-4 h-4 text-emerald-400" /> Key Strengths
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedReport.report.strengths?.map((point, i) => (
                                            <div key={i} className="flex gap-2 text-sm text-gray-400 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                {point}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Weaknesses */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Areas of Concern
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedReport.report.concerns?.map((point, i) => (
                                            <div key={i} className="flex gap-2 text-sm text-gray-400 bg-amber-500/5 p-2 rounded border border-amber-500/10">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                {point}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Decision Section */}
                            <div className="pt-6 border-t border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                        Administrative Decision
                                    </h3>
                                    <div className="text-xs text-gray-500">
                                        Recruiter: {selectedReport.recruiter}
                                    </div>
                                </div>

                                <Textarea
                                    placeholder="Add comments for your decision (optional)..."
                                    value={decisionNote}
                                    onChange={(e) => setDecisionNote(e.target.value)}
                                    className="bg-black/20 border-white/10 text-sm"
                                />

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleDecision("rejected")}
                                        variant="outline"
                                        disabled={processing}
                                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                    >
                                        {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                                        Reject Candidate
                                    </Button>
                                    <Button
                                        onClick={() => handleDecision("approved")}
                                        disabled={processing}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                        {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Approve & Proceed to Offer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default InterviewReports;
