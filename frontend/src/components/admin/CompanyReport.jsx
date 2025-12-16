import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Download, Share2, Building, Users, TrendingUp,
    Clock, ArrowLeft, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { JOB_API_END_POINT, APPLICATION_API_END_POINT } from '@/utils/constant';

const CompanyReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch stats, job details, and top candidates concurrently
                // Note: getJobReportStats is now available at /:id/report/stats
                const [statsRes, jobRes, applicantsRes] = await Promise.all([
                    axios.get(`${JOB_API_END_POINT}/${id}/report/stats`, { withCredentials: true }),
                    axios.get(`${JOB_API_END_POINT}/get/${id}`, { withCredentials: true }),
                    axios.get(`${APPLICATION_API_END_POINT}/${id}/applicants`, { withCredentials: true })
                ]);

                if (statsRes.data.success && jobRes.data.success && applicantsRes.data.success) {
                    const stats = statsRes.data.stats;
                    const job = jobRes.data.job;
                    // applicantsRes.data.job might contain the job with populated applications
                    const applications = applicantsRes.data.job?.applications || [];

                    // Sort candidates by resume score (descending) and take top 5
                    const topCandidates = applications
                        .sort((a, b) => (b.resumeScore || 0) - (a.resumeScore || 0))
                        .slice(0, 5)
                        .map(app => ({
                            name: app.applicant?.fullname || 'Unknown',
                            score: app.resumeScore || 0,
                            status: app.status,
                            role: app.applicant?.profile?.skills?.[0] || 'N/A' // Fallback to first skill or N/A
                        }));

                    setReportData({
                        jobTitle: job.title,
                        department: job.location, // Using location as proxy for department/team data if department not available
                        period: new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' - Present',
                        stats: {
                            totalApplied: stats.totalApplications,
                            interviewed: stats.interviewed,
                            shortlisted: stats.offers + stats.interviewed, // Approximation
                            offered: stats.offers,
                            hired: stats.hired,
                            avgScore: stats.avgScore
                        },
                        topCandidates: topCandidates,
                        funnelData: [
                            { stage: 'Applied', count: stats.totalApplications },
                            { stage: 'Interviewed', count: stats.interviewed },
                            { stage: 'Offered', count: stats.offers },
                            { stage: 'Hired', count: stats.hired }
                        ]
                    });
                }
            } catch (error) {
                console.error("Report fetch error:", error);
                toast.error("Failed to generate report");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin h-10 w-10 text-yellow-500" />
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="min-h-screen bg-black text-white p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Report Unavailable</h2>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif] p-8">
            <div className="max-w-[1200px] mx-auto space-y-8 print:p-0 print:bg-white print:text-black">

                {/* Header Actions */}
                <div className="flex justify-between items-center print:hidden">
                    <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </Button>
                    <div className="flex gap-3">
                        <Button variant="outline" className="border-white/10 hover:bg-white/10 text-white">
                            <Share2 size={16} className="mr-2" /> Share
                        </Button>
                        <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold" onClick={() => window.print()}>
                            <Download size={16} className="mr-2" /> Export PDF
                        </Button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="space-y-8 print:space-y-4">

                    {/* Header */}
                    <div className="text-center space-y-2 border-b border-white/10 pb-8">
                        <div className="flex justify-center mb-4">
                            <div className="bg-white/10 p-4 rounded-2xl">
                                <Building size={40} className="text-yellow-500" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            Hiring Performance Report
                        </h1>
                        <p className="text-gray-400 text-lg">
                            {reportData.jobTitle} • {reportData.department}
                        </p>
                        <Badge variant="outline" className="mt-2 border-white/10 text-gray-500">
                            {reportData.period}
                        </Badge>
                    </div>

                    {/* Executive Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Applications", value: reportData.stats.totalApplied, icon: Users, color: "text-blue-400" },
                            { label: "Interviewed", value: reportData.stats.interviewed, icon: Users, color: "text-purple-400" },
                            { label: "Hired", value: reportData.stats.hired, icon: Clock, color: "text-yellow-400" },
                            { label: "Avg Profile Score", value: `${reportData.stats.avgScore}%`, icon: TrendingUp, color: "text-emerald-400" },
                        ].map((stat, i) => (
                            <Card key={i} className="bg-[#0a0a0a] border-white/10 print:border-gray-200">
                                <CardContent className="p-6 text-center">
                                    <stat.icon className={`mx-auto mb-2 ${stat.color} print:text-black`} size={24} />
                                    <div className="text-3xl font-bold text-white print:text-black">{stat.value}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{stat.label}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Deep Dive & Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Funnel Chart */}
                        <Card className="bg-[#0a0a0a] border-white/10 print:border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-white print:text-black">Conversion Funnel</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={reportData.funnelData}
                                        layout="vertical"
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="stage" type="category" width={80} tick={{ fill: '#888' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" fill="#EAB308" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Top Candidates Table */}
                        <Card className="bg-[#0a0a0a] border-white/10 print:border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-white print:text-black text-lg">Top Selected Talent</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {reportData.topCandidates.length === 0 ? (
                                        <div className="text-gray-500 text-center py-4">No candidates evaluated yet</div>
                                    ) : (
                                        reportData.topCandidates.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 print:border-gray-300 print:bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs">
                                                        {c.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-200 print:text-black">{c.name}</div>
                                                        <div className="text-xs text-gray-500">{c.role}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-yellow-500 font-bold">{c.score}% Match</div>
                                                    <Badge variant="secondary" className="text-[10px] bg-white/10 text-gray-400 print:bg-gray-200 print:text-black">{c.status}</Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* AI Insights Footer */}
                    <div className="bg-gradient-to-r from-yellow-900/20 to-black border border-yellow-500/20 rounded-2xl p-6 print:border-black">
                        <h3 className="font-bold text-yellow-500 mb-2 flex items-center gap-2">
                            <TrendingUp size={20} /> AI Strategic Insight
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed print:text-black">
                            The candidate pool shows an average profile match of <span className="text-white font-bold print:text-black">{reportData.stats.avgScore}%</span>.
                            {reportData.stats.avgScore > 75 ?
                                " This indicates a strong alignment with the job requirements. Proceed with top candidates quickly." :
                                " Consider reviewing job requirements or sourcing channels to improve candidate quality."}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CompanyReport;
