import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
    CheckCircle, XCircle, Clock, AlertTriangle, FileText,
    User, Briefcase, TrendingUp, ChevronLeft, Loader2
} from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';

const CEOReportReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [decisionLoading, setDecisionLoading] = useState(false);
    const [ceoNotes, setCeoNotes] = useState('');
    const [decision, setDecision] = useState(null); // 'approved', 'rejected', 'on_hold'

    useEffect(() => {
        fetchReport();
    }, [id]);

    const fetchReport = async () => {
        try {
            // Re-using getInterview endpoint as it populates everything
            const res = await axios.get(`http://localhost:8000/api/v1/interview/${id}`, {
                withCredentials: true
            });
            if (res.data.success) {
                setReport(res.data.interview);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch interview report');
            navigate('/company/admin/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (status) => {
        setDecisionLoading(true);
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/interview/${id}/ceo/decision`, {
                decision: status,
                comments: ceoNotes
            }, {
                withCredentials: true
            });

            if (res.data.success) {
                toast.success(`Candidate ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'put on Hold'}`);
                setDecision(status);
                setTimeout(() => {
                    navigate('/company/admin/dashboard');
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit decision');
        } finally {
            setDecisionLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    if (!report || !report.finalReport) return <div className="p-8 text-center">Report not found or not generated yet.</div>;

    const finalReport = report.finalReport;

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-['Outfit',sans-serif]">
            {/* Offer Letter Modal */}
            <OfferLetterModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                interviewId={id}
                candidateName={report.studentId?.fullname}
                jobTitle={report.jobId?.title}
                onOfferSent={handleOfferSent}
            />

            <div className="max-w-5xl mx-auto">
                <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent" onClick={() => navigate(-1)}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel: Candidate & Job Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader className="text-center pb-2">
                                <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white shadow-lg">
                                    <AvatarImage src={report.studentId?.profile?.profilePhoto} />
                                    <AvatarFallback className="text-2xl">{report.studentId?.fullname?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <CardTitle>{report.studentId?.fullname}</CardTitle>
                                <CardDescription>{report.studentId?.email}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase font-bold">Applying for</span>
                                    <div className="flex items-center gap-2 font-medium">
                                        <Briefcase className="w-4 h-4 text-gray-500" />
                                        {report.jobId?.title}
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase font-bold">Interviewed By</span>
                                    <div className="flex items-center gap-2 font-medium">
                                        <User className="w-4 h-4 text-gray-500" />
                                        {report.recruiterId?.fullname}
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase font-bold">Overall Score</span>
                                    <div className={`text-4xl font-extrabold ${finalReport.overallScore >= 70 ? 'text-green-600' : finalReport.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {finalReport.overallScore}%
                                    </div>
                                    <Badge variant="outline" className={`mt-2 ${finalReport.aiRecommendation === 'STRONGLY_RECOMMEND' ? 'bg-green-100 text-green-800' :
                                        finalReport.aiRecommendation === 'RECOMMEND' ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        AI: {finalReport.aiRecommendation?.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Decision Panel */}
                        <Card className="border-t-4 border-t-primary">
                            <CardHeader>
                                <CardTitle>Final Decision</CardTitle>
                                <CardDescription>Review and take action</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Add notes for the recruiter (optional)..."
                                    value={ceoNotes}
                                    onChange={(e) => setCeoNotes(e.target.value)}
                                    className="min-h-[100px]"
                                />
                                <div className="grid grid-cols-1 gap-3">
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 h-10"
                                        onClick={() => handleDecision('approved')}
                                        disabled={decisionLoading || decision}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve Candidate
                                    </Button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                            onClick={() => handleDecision('on_hold')}
                                            disabled={decisionLoading || decision}
                                        >
                                            <Clock className="mr-2 h-4 w-4" /> Hold
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleDecision('rejected')}
                                            disabled={decisionLoading || decision}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel: Detailed Report */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    AI Interview Analysis
                                </CardTitle>
                                <CardDescription>Generated on {new Date(finalReport.generatedAt).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Scores Grid */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-gray-800">{finalReport.technicalScore}%</div>
                                        <div className="text-xs text-gray-500 uppercase font-medium mt-1">Technical</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-gray-800">{finalReport.communicationScore}%</div>
                                        <div className="text-xs text-gray-500 uppercase font-medium mt-1">Communication</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-gray-800">{finalReport.cultureFitScore}%</div>
                                        <div className="text-xs text-gray-500 uppercase font-medium mt-1">Culture Fit</div>
                                    </div>
                                </div>

                                {/* Executive Summary */}
                                <div>
                                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                                        <TrendingUp className="w-4 h-4 text-blue-500" /> Executive Summary
                                    </h4>
                                    <p className="text-gray-600 leading-relaxed text-sm bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                        {finalReport.aiSummary}
                                    </p>
                                </div>

                                {/* Strengths & Concerns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                                            <CheckCircle className="w-4 h-4 text-green-500" /> Key Strengths
                                        </h4>
                                        <ul className="space-y-2">
                                            {finalReport.strengths?.map((item, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <span className="mt-1.5 w-1.5 h-1.5 bg-green-400 rounded-full shrink-0"></span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Areas of Concern
                                        </h4>
                                        <ul className="space-y-2">
                                            {finalReport.weaknesses?.map((item, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0"></span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <Separator />

                                {/* Fraud & Risk Assessment */}
                                <div>
                                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                                        <div className={`w-2 h-2 rounded-full ${finalReport.hiringRisk === 'HIGH' ? 'bg-red-500' : finalReport.hiringRisk === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                        Risk Assessment
                                    </h4>
                                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase">Fraud Alerts</span>
                                            <div className="font-semibold">{report.totalFraudAlerts || 0} Events</div>
                                        </div>
                                        <div className="h-8 w-px bg-gray-200"></div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase">Risk Level</span>
                                            <div className={`font-semibold ${finalReport.hiringRisk === 'HIGH' ? 'text-red-600' : finalReport.hiringRisk === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}`}>
                                                {finalReport.hiringRisk}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recruiter Notes included */}
                                {finalReport.notes && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Recruiter Notes</h4>
                                        <p className="text-sm text-gray-600 italic">"{finalReport.notes}"</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CEOReportReview;
