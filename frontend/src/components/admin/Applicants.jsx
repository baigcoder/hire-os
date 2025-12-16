import React, { useState, useEffect } from 'react';
import Navbar from '../shared/Navbar';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { JOB_API_END_POINT, APPLICATION_API_END_POINT } from '@/utils/constant';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    MoreVertical, CheckCircle, XCircle, AlertTriangle,
    ShieldAlert, Search, FileText, UserCheck, Eye, Download
} from 'lucide-react';
import {
    Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const FraudDetectionPanel = ({ application }) => {
    const isHighRisk = application?.isFlagged;
    const riskReason = application?.flagReason || "Manual Risk Flag";

    if (!isHighRisk) {
        return (
            <div className="mt-4 p-4 rounded-xl border bg-emerald-900/10 border-emerald-500/30">
                <div className="flex items-center gap-2">
                    <UserCheck className="text-emerald-500" />
                    <h4 className="font-bold text-emerald-400">Verified Candidate</h4>
                </div>
                <p className="text-xs text-gray-400 mt-2">No risk flags detected on this application.</p>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 rounded-xl border bg-red-900/10 border-red-500/30">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-red-500" />
                    <h4 className="font-bold text-red-400">Risk Flag Detection</h4>
                </div>
                <Badge variant="outline" className="text-red-400 border-red-500/50">
                    Flagged
                </Badge>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Risk Reason</span>
                    <span className="text-red-400 font-semibold">{riskReason}</span>
                </div>
            </div>
        </div>
    )
}

const Applicants = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedApplicant, setSelectedApplicant] = useState(null);

    useEffect(() => {
        const fetchApplicants = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${APPLICATION_API_END_POINT}/${id}/applicants`, { withCredentials: true });
                if (res.data.success) {
                    setJob(res.data.job);
                }
            } catch (error) {
                console.error(error);
                toast.error(error.response?.data?.message || 'Failed to fetch applicants');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchApplicants();
    }, [id]);

    const handleStatusUpdate = async (status, applicationId) => {
        try {
            axios.defaults.withCredentials = true;
            const res = await axios.post(`${APPLICATION_API_END_POINT}/status/${applicationId}/update`, { status });
            if (res.data.success) {
                toast.success(res.data.message);
                setJob(prev => ({
                    ...prev,
                    applications: prev.applications.map(app => app._id === applicationId ? { ...app, status: status.toLowerCase() } : app)
                }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Error updating status");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-['Outfit',sans-serif]">
            <Navbar />

            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Candidate Evaluation
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Reviewing applicants for <span className="text-yellow-500 font-bold">{job?.title || 'Job'}</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-sm font-bold">{job?.applications?.length || 0} Total</span>
                        </div>
                        <Button
                            className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
                            onClick={() => navigate(`/admin/jobs/${id}/report`)}
                        >
                            <FileText size={16} className="mr-2" /> Generate Report
                        </Button>
                    </div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/5 hover:bg-white/5">
                                <TableHead className="text-gray-400 font-bold w-[300px]">Candidate</TableHead>
                                <TableHead className="text-gray-400 font-bold">Applied Date</TableHead>
                                <TableHead className="text-gray-400 font-bold">AI Match</TableHead>
                                <TableHead className="text-gray-400 font-bold text-center">Status</TableHead>
                                <TableHead className="text-gray-400 font-bold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-gray-500">Analyzing portfolio...</TableCell>
                                </TableRow>
                            ) : !job?.applications?.length ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-gray-500">No applicants found.</TableCell>
                                </TableRow>
                            ) : (
                                job.applications.map((app) => (
                                    <TableRow key={app._id} className="border-white/5 hover:bg-white/5 ml-0 transition-colors group">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-white/10">
                                                    <AvatarImage src={app?.applicant?.profile?.profilePhoto} />
                                                    <AvatarFallback>CN</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-bold text-gray-200">{app?.applicant?.fullname}</div>
                                                    <div className="text-xs text-gray-500">{app?.applicant?.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-400 text-sm">
                                            {app?.createdAt?.split("T")[0]}
                                        </TableCell>
                                        <TableCell>
                                            {/* Mock AI Score */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${(!app.resumeScore || app.resumeScore < 50) ? 'bg-red-500' : (app.resumeScore < 70) ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                        style={{ width: `${app.resumeScore || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`text-xs font-bold ${(!app.resumeScore || app.resumeScore < 50) ? 'text-red-500' : (app.resumeScore < 70) ? 'text-yellow-500' : 'text-green-500'}`}>
                                                    {app.resumeScore || 0}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`
                                                ${app.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    app.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}
                                            `}>
                                                {app.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="hover:bg-white/10 hover:text-white" onClick={() => setSelectedApplicant(app)}>
                                                            <Eye size={18} />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="bg-[#111] border-white/10 text-white max-w-2xl">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                                                                Applicant Details
                                                                <div className="flex gap-2">
                                                                    {app.status !== 'accepted' && (
                                                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusUpdate("Accepted", app._id)}>Accept</Button>
                                                                    )}
                                                                    {app.status !== 'rejected' && (
                                                                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate("Rejected", app._id)}>Reject</Button>
                                                                    )}
                                                                </div>
                                                            </DialogTitle>
                                                            <DialogDescription className="text-gray-400">
                                                                Reviewing profile for {app?.applicant?.fullname}
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                                            <div className="space-y-4">
                                                                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                                                                    <h4 className="font-bold text-gray-300 mb-2">Contact Info</h4>
                                                                    <p className="text-sm text-gray-500">Email: {app?.applicant?.email}</p>
                                                                    <p className="text-sm text-gray-500">Phone: {app?.applicant?.phoneNumber}</p>
                                                                </div>
                                                                <Button variant="outline" className="w-full border-dashed border-gray-700 hover:border-white/20 hover:text-white">
                                                                    <Download className="mr-2 h-4 w-4" /> Download Resume
                                                                </Button>
                                                            </div>

                                                            <div>
                                                                <FraudDetectionPanel application={app} />
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default Applicants;