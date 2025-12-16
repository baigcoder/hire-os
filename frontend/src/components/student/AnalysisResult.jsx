import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
    ResponsiveContainer, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import {
    CheckCircle, XCircle, AlertTriangle, FileText, Code,
    Download, Share2, ArrowRight, BrainCircuit, ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';

const AnalysisResult = () => {
    const navigate = useNavigate();
    // Mock Data simulating AI Response
    const [activeTab, setActiveTab] = useState("visual");

    const analysisData = {
        overallScore: 88,
        matchProbability: "High",
        skills: [
            { subject: 'React', A: 90, fullMark: 100 },
            { subject: 'Node.js', A: 85, fullMark: 100 },
            { subject: 'Design', A: 65, fullMark: 100 },
            { subject: 'Testing', A: 80, fullMark: 100 },
            { subject: 'DevOps', A: 60, fullMark: 100 },
            { subject: 'Soft Skills', A: 95, fullMark: 100 },
        ],
        checks: {
            formatting: { score: 92, status: 'pass', issues: [] },
            grammar: { score: 88, status: 'pass', issues: ['Passive voice usage in Exp. 2'] },
            ats_compatibility: { score: 100, status: 'pass', issues: [] },
            plagiarism: { score: 0, status: 'pass', label: 'Original Content' } // 0% plagiarism is good
        },
        missing_keywords: ["GraphQL", "Docker", "Figma"],
        full_json: {
            "candidate_id": "cand_123",
            "parsed_skills": ["React", "Node", "CSS", "JS"],
            "semantic_analysis": { "role_fit": 0.88, "culture_fit": 0.92 },
            "recommendation": "Strong Hire"
        }
    };

    const COLORS = ['#EAB308', '#222']; // Gold and Dark

    return (
        <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 text-yellow-500 mb-2">
                            <BrainCircuit size={20} /> <span className="text-sm font-bold tracking-widest uppercase">AI Resume Intelligence</span>
                        </div>
                        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                            Analysis Report
                        </h1>
                        <p className="text-gray-400 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="border-white/10 hover:bg-white/10"> <Share2 size={16} className="mr-2" /> Share</Button>
                        <Button className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold"> <Download size={16} className="mr-2" /> PDF Report</Button>
                    </div>
                </motion.div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Col: Scores & Key Metrics */}
                    <div className="space-y-6">
                        {/* Overall Score Card */}
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                            <Card className="bg-[#0a0a0a] border-white/10 relative overflow-hidden">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-gray-400 text-sm font-medium uppercase tracking-wider">Overall Match Score</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center p-6 relative z-10">
                                    <div className="w-48 h-48 relative flex items-center justify-center">
                                        {/* Custom SVG Circle or Recharts Pie */}
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[{ value: analysisData.overallScore }, { value: 100 - analysisData.overallScore }]}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    startAngle={180}
                                                    endAngle={0}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    <Cell fill="#EAB308" />
                                                    <Cell fill="#333" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center -mt-8">
                                            <span className="text-6xl font-black text-white">{analysisData.overallScore}</span>
                                            <span className="text-emerald-400 text-sm font-bold bg-emerald-500/10 px-2 py-1 rounded mt-2">Top 10%</span>
                                        </div>
                                    </div>
                                    <p className="text-center text-gray-400 mt-[-20px]">
                                        Your profile is a <span className="text-white font-bold">Strong Match</span> for this role.
                                    </p>
                                </CardContent>
                                {/* Decorative Glow */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/20 blur-[80px]"></div>
                            </Card>
                        </motion.div>

                        {/* Critical Alerts */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="bg-red-900/5 border-red-500/20">
                                <CardHeader>
                                    <CardTitle className="text-red-400 flex items-center gap-2 text-lg">
                                        <ShieldAlert size={20} /> Fraud & Integrity Check
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                                        <span className="text-gray-400 text-sm">Plagiarism Check</span>
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Passt (0%)</Badge>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                                        <span className="text-gray-400 text-sm">Metadata Verification</span>
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Verified</Badge>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                                        <span className="text-gray-400 text-sm">Hidden Keywords</span>
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">None Found</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Middle Col: Detailed Analysis */}
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs defaultValue="visual" className="w-full">
                            <TabsList className="bg-[#0a0a0a] border border-white/10 p-1 rounded-xl">
                                <TabsTrigger value="visual" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black rounded-lg transition-all" onClick={() => setActiveTab('visual')}>
                                    <FileText size={16} className="mr-2" /> Visual Report
                                </TabsTrigger>
                                <TabsTrigger value="json" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black rounded-lg transition-all" onClick={() => setActiveTab('json')}>
                                    <Code size={16} className="mr-2" /> JSON Output
                                </TabsTrigger>
                            </TabsList>

                            <div className="mt-6">
                                <TabsContent value="visual" className="space-y-6">
                                    {/* Skills Radar */}
                                    <Card className="bg-[#0a0a0a] border-white/10 p-6">
                                        <h3 className="text-lg font-bold text-white mb-4">Competency Map</h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysisData.skills}>
                                                    <PolarGrid stroke="#333" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                    <Radar name="Candidate" dataKey="A" stroke="#EAB308" strokeWidth={2} fill="#EAB308" fillOpacity={0.3} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} itemStyle={{ color: '#EAB308' }} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>

                                    {/* Missing Keywords */}
                                    <Card className="bg-yellow-500/5 border-yellow-500/20">
                                        <CardContent className="p-6">
                                            <h3 className="text-yellow-500 font-bold flex items-center gap-2 mb-4">
                                                <AlertTriangle size={18} /> Missing Critical Skills
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisData.missing_keywords.map((kw, i) => (
                                                    <Badge key={i} variant="outline" className="border-yellow-500/30 text-yellow-200 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors">
                                                        + {kw}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                                                Adding these keywords to your "Skills" or "Experience" section could increase your match probability by <span className="text-white font-bold">12%</span>.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="json">
                                    <Card className="bg-[#050505] border-white/10">
                                        <CardHeader className="bg-white/5 border-b border-white/5 py-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-mono text-gray-500">api_response_v3.json</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6"><Copy size={12} /></Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <ScrollArea className="h-[400px] w-full p-4">
                                                <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                                                    {JSON.stringify(analysisData.full_json, null, 2)}
                                                </pre>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </div>
                        </Tabs>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4 mt-8">
                            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate(-1)}>Back</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8">
                                Proceed to Application <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisResult;
