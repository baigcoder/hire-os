import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../shared/Navbar";
import {
    Users,
    Plus,
    Search,
    FolderPlus,
    Mail,
    Phone,
    Star,
    Tag,
    MoreVertical,
    Eye,
    Trash2,
    MessageSquare,
    Calendar,
    Filter,
    Terminal,
    ChevronRight,
    ExternalLink,
    UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "contacted", label: "Contacted" },
    { value: "in_process", label: "In Process" },
    { value: "hired", label: "Hired" },
    { value: "archived", label: "Archived" },
];

const TalentPoolManager = () => {
    const [pools, setPools] = useState([]);
    const [activePool, setActivePool] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [newPool, setNewPool] = useState({ name: "", description: "", color: "#6366f1" });
    const [noteContent, setNoteContent] = useState("");
    const [noteType, setNoteType] = useState("note");

    useEffect(() => {
        fetchPools();
    }, []);

    useEffect(() => {
        if (activePool) fetchCandidates();
    }, [activePool, statusFilter]);

    const fetchPools = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/v1/talent-pools`, { withCredentials: true });
            setPools(res.data.pools || []);
            if (res.data.pools?.length > 0 && !activePool) {
                setActivePool(res.data.pools[0]);
            }
        } catch (error) {
            console.error("Fetch pools error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCandidates = async () => {
        try {
            const params = statusFilter !== "all" ? { status: statusFilter } : {};
            const res = await axios.get(`${API_URL}/api/v1/talent-pools/${activePool._id}`, { params, withCredentials: true });
            setCandidates(res.data.candidates || []);
        } catch (error) {
            console.error("Fetch candidates error:", error);
        }
    };

    const createPool = async () => {
        if (!newPool.name) { toast.error("Pool name required"); return; }
        try {
            await axios.post(`${API_URL}/api/v1/talent-pools`, newPool, { withCredentials: true });
            toast.success("Pool created");
            setShowCreateModal(false);
            setNewPool({ name: "", description: "", color: "#6366f1" });
            fetchPools();
        } catch (error) {
            toast.error("Failed to create pool");
        }
    };

    const updateCandidateStatus = async (candidateId, status) => {
        try {
            await axios.put(`${API_URL}/api/v1/talent-pools/${activePool._id}/candidates/${candidateId}`, { status }, { withCredentials: true });
            fetchCandidates();
        } catch (error) {
            toast.error("Failed to update");
        }
    };

    const removeCandidate = async (candidateId) => {
        if (!confirm("Remove from pool?")) return;
        try {
            await axios.delete(`${API_URL}/api/v1/talent-pools/${activePool._id}/candidates/${candidateId}`, { withCredentials: true });
            fetchCandidates();
        } catch (error) {
            toast.error("Failed to remove");
        }
    };

    const addNote = async () => {
        if (!noteContent.trim()) { toast.error("Note content required"); return; }
        try {
            await axios.post(`${API_URL}/api/v1/talent-pools/${activePool._id}/candidates/${selectedCandidate.user._id}/notes`, { type: noteType, content: noteContent }, { withCredentials: true });
            toast.success("Note added");
            setShowNoteModal(false);
            setNoteContent("");
            fetchCandidates();
        } catch (error) {
            toast.error("Failed to add note");
        }
    };

    const filteredCandidates = candidates.filter((c) => c.user?.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) || c.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif] text-white">
            <Navbar />

            {/* Industrial Grid Background */}
            <div
                className="fixed inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                    backgroundSize: "50px 50px",
                }}
            />
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00BFFF]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00BFFF]/3 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10 h-screen flex flex-col">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#00BFFF] rounded-sm flex items-center justify-center shadow-[0_0_20px_rgba(0,191,255,0.3)]">
                            <Users className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-tight">
                                Talent Pool
                            </h1>
                            <p className="text-gray-500 text-sm font-mono flex items-center gap-2">
                                <Terminal className="w-3 h-3" />
                                CENTRALIZED CANDIDATE REPOSITORY
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-sm">
                            <span className="text-[10px] font-mono text-gray-400 uppercase">
                                Active Pools
                            </span>
                            <span className="text-sm font-bold text-[#00BFFF]">
                                {pools.length}
                            </span>
                        </div>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-[#00BFFF] text-black hover:bg-[#00BFFF]/90 rounded-sm font-bold flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            CREATE POOL
                        </Button>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div className="flex-1 flex gap-6 overflow-hidden mb-4">
                    {/* Left Sidebar - Pools List */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="w-72 flex-shrink-0 flex flex-col"
                    >
                        <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-sm flex-1 flex flex-col p-4">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                                    Select Category
                                </span>
                                <Badge
                                    variant="outline"
                                    className="border-[#00BFFF]/30 text-[#00BFFF] text-[10px]"
                                >
                                    {pools.length} TOTAL
                                </Badge>
                            </div>

                            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {pools.map((pool) => (
                                    <button
                                        key={pool._id}
                                        onClick={() => setActivePool(pool)}
                                        className={`w-full text-left p-3 rounded-sm flex items-center gap-3 transition-all group relative ${activePool?._id === pool._id
                                            ? "bg-[#00BFFF]/10 border-l-2 border-[#00BFFF]"
                                            : "hover:bg-white/5 border-l-2 border-transparent"
                                            }`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: pool.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`text-sm font-bold truncate ${activePool?._id === pool._id
                                                    ? "text-[#00BFFF]"
                                                    : "text-gray-300"
                                                    }`}
                                            >
                                                {pool.name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-mono">
                                                {pool.candidateCount || 0} CANDIDATES
                                            </p>
                                        </div>
                                        {activePool?._id === pool._id && (
                                            <ChevronRight className="w-3 h-3 text-[#00BFFF]" />
                                        )}
                                    </button>
                                ))}

                                {pools.length === 0 && !loading && (
                                    <div className="text-center py-12">
                                        <FolderPlus className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 font-mono uppercase">
                                            No pools found
                                        </p>
                                    </div>
                                )}
                                {loading && (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-[#00BFFF]/20 border-t-[#00BFFF] rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Main Area - Candidates */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex-1 flex flex-col min-w-0"
                    >
                        <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-sm flex-1 flex flex-col relative overflow-hidden">
                            {/* Corner Accents */}
                            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#00BFFF]/30" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#00BFFF]/30" />

                            {!activePool ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                                        <Users className="h-10 w-10 text-[#00BFFF]/40" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                                        Pool Not Selected
                                    </h3>
                                    <p className="text-gray-500 font-mono text-sm max-w-sm mb-6">
                                        SELECT A TALENT POOL FROM THE SIDEBAR OR CREATE A NEW ONE TO
                                        VIEW CANDIDATES
                                    </p>
                                    <Button
                                        onClick={() => setShowCreateModal(true)}
                                        variant="outline"
                                        className="border-white/10 hover:border-[#00BFFF]/30 text-gray-400 hover:text-[#00BFFF] rounded-sm font-mono text-xs"
                                    >
                                        + INITIALIZE NEW POOL
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Candidates Header */}
                                    <div className="p-4 border-b border-white/10 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                                        <div>
                                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                                                <span
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: activePool.color }}
                                                />
                                                {activePool.name}
                                            </h2>
                                            <p className="text-xs text-gray-500 font-mono uppercase">
                                                {activePool.description || "NO DESCRIPTION PROVIDED"}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                                <Input
                                                    placeholder="SEARCH CANDIDATES..."
                                                    className="pl-9 w-64 bg-black/40 border-white/10 text-white font-mono text-xs rounded-sm focus:border-[#00BFFF]/50"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="w-40 bg-black/40 border-white/10 text-xs font-mono rounded-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Filter className="w-3 h-3 text-[#00BFFF]" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#111111] border-white/10 text-white font-mono">
                                                    {STATUS_OPTIONS.map((s) => (
                                                        <SelectItem key={s.value} value={s.value}>
                                                            {s.label.toUpperCase()}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Candidates List */}
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        <AnimatePresence mode="popLayout">
                                            {filteredCandidates.length === 0 ? (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="h-full flex flex-col items-center justify-center py-20"
                                                >
                                                    <Users className="h-16 w-16 text-gray-800 mb-4 stroke-1" />
                                                    <p className="text-gray-500 font-mono uppercase text-sm">
                                                        {searchQuery ? "No matches found" : "No candidates in this pool"}
                                                    </p>
                                                </motion.div>
                                            ) : (
                                                <div className="grid gap-3">
                                                    {filteredCandidates.map((candidate, idx) => (
                                                        <motion.div
                                                            key={candidate.user?._id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="group relative flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 hover:border-[#00BFFF]/30 hover:bg-white/[0.04] rounded-sm transition-all"
                                                        >
                                                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10 group-hover:border-[#00BFFF]/30 opacity-0 group-hover:opacity-100 transition-all" />

                                                            <Avatar className="h-12 w-12 border border-white/10 rounded-sm">
                                                                <AvatarImage src={candidate.user?.profile?.profilePhoto} />
                                                                <AvatarFallback className="bg-[#111111] text-[#00BFFF] font-bold rounded-sm">
                                                                    {candidate.user?.fullname?.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-gray-100 truncate group-hover:text-white transition-colors">
                                                                        {candidate.user?.fullname}
                                                                    </h4>
                                                                    <Badge className="bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/20 rounded-sm text-[10px] uppercase h-5 font-mono">
                                                                        {candidate.status.replace("_", " ")}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-gray-500 font-mono truncate mb-2">
                                                                    {candidate.user?.email || "NO EMAIL PROVIDED"}
                                                                </p>

                                                                <div className="flex flex-wrap items-center gap-3">
                                                                    {candidate.rating && (
                                                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-sm">
                                                                            <Star className="h-3 w-3 fill-[#FFD700] text-[#FFD700]" />
                                                                            <span className="text-[10px] font-bold text-[#FFD700]">{candidate.rating}</span>
                                                                        </div>
                                                                    )}
                                                                    {candidate.user?.profile?.skills?.slice(0, 3).map((skill) => (
                                                                        <Badge key={skill} variant="outline" className="text-[9px] border-white/10 text-gray-400 h-5 font-mono">
                                                                            {skill.toUpperCase()}
                                                                        </Badge>
                                                                    ))}
                                                                    {candidate.user?.profile?.skills?.length > 3 && (
                                                                        <span className="text-[9px] text-gray-600 font-mono">
                                                                            +{candidate.user.profile.skills.length - 3} MORE
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Select
                                                                    value={candidate.status}
                                                                    onValueChange={(v) => updateCandidateStatus(candidate.user?._id, v)}
                                                                >
                                                                    <SelectTrigger className="w-32 h-8 bg-black/40 border-white/10 text-[10px] font-mono rounded-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-[#111111] border-white/10 text-white font-mono">
                                                                        {STATUS_OPTIONS.slice(1).map((s) => (
                                                                            <SelectItem key={s.value} value={s.value} className="text-xs">
                                                                                {s.label.toUpperCase()}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>

                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0 hover:bg-white/5 hover:text-[#00BFFF]"
                                                                        onClick={() => { setSelectedCandidate(candidate); setShowNoteModal(true); }}
                                                                        title="ADD NOTE"
                                                                    >
                                                                        <MessageSquare className="h-4 w-4" />
                                                                    </Button>

                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5">
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="bg-[#111111] border-white/10 text-white font-mono">
                                                                            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#00BFFF]/10 focus:text-[#00BFFF]">
                                                                                <Eye className="h-4 w-4" /> VIEW PROFILE
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#00BFFF]/10 focus:text-[#00BFFF]">
                                                                                <Mail className="h-4 w-4" /> SEND EMAIL
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                className="gap-2 cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
                                                                                onClick={() => removeCandidate(candidate.user?._id)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" /> REMOVE CANDIDATE
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {/* Create Pool Modal */}
                {showCreateModal && (
                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogContent className="bg-[#111111] border-white/10 text-white font-['Space_Grotesk',sans-serif] sm:max-w-[500px]">
                            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#00BFFF]/30" />
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-[#00BFFF]" />
                                    Initialize Talent Pool
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 font-mono text-xs uppercase">
                                    Create a new segmented repository for candidate management
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-mono text-gray-500 uppercase">Pool Identity *</Label>
                                    <Input
                                        placeholder="e.g., SENIOR BACKEND ENGINEERS"
                                        value={newPool.name}
                                        onChange={(e) => setNewPool({ ...newPool, name: e.target.value.toUpperCase() })}
                                        className="bg-black/40 border-white/10 uppercase font-bold text-sm h-11 focus:border-[#00BFFF]/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-mono text-gray-500 uppercase">Operational Scope</Label>
                                    <Textarea
                                        placeholder="DEFINE THE PURPOSE AND CRITERIA FOR THIS POOL..."
                                        value={newPool.description}
                                        onChange={(e) => setNewPool({ ...newPool, description: e.target.value })}
                                        className="bg-black/40 border-white/10 font-mono text-xs rows-3 focus:border-[#00BFFF]/50 min-h-[100px]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-mono text-gray-500 uppercase">Color Index</Label>
                                        <div className="flex gap-3 items-center bg-black/40 p-2 rounded-sm border border-white/10">
                                            <Input
                                                type="color"
                                                value={newPool.color}
                                                onChange={(e) => setNewPool({ ...newPool, color: e.target.value })}
                                                className="w-10 h-10 p-0 cursor-pointer border-none bg-transparent"
                                            />
                                            <span className="text-xs font-mono text-gray-400">{newPool.color.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-white/10 text-gray-400 font-mono text-xs">
                                    ABORT
                                </Button>
                                <Button onClick={createPool} className="bg-[#00BFFF] text-black hover:bg-[#00BFFF]/90 font-bold px-8">
                                    DEPICT POOL
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Add Note Modal */}
                {showNoteModal && (
                    <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
                        <DialogContent className="bg-[#111111] border-white/10 text-white font-['Space_Grotesk',sans-serif]">
                            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#00BFFF]/30" />
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#00BFFF]" />
                                    Log Candidate Interaction
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 font-mono text-xs uppercase">
                                    RECORDING ACTIVITY FOR: {selectedCandidate?.user?.fullname}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-mono text-gray-500 uppercase">Interaction Type</Label>
                                    <Select value={noteType} onValueChange={setNoteType}>
                                        <SelectTrigger className="bg-black/40 border-white/10 font-mono text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#111111] border-white/10 text-white font-mono">
                                            <SelectItem value="note">GENERAL OBSERVATION</SelectItem>
                                            <SelectItem value="email">COMMUNICATION: EMAIL</SelectItem>
                                            <SelectItem value="call">COMMUNICATION: VOICE</SelectItem>
                                            <SelectItem value="interview">STAGED INTERVIEW</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-mono text-gray-500 uppercase">Debrief Details *</Label>
                                    <Textarea
                                        placeholder="ENTER OPERATIONAL NOTES AND OBSERVATIONS..."
                                        rows={5}
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        className="bg-black/40 border-white/10 font-mono text-xs focus:border-[#00BFFF]/50"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-white/10 text-gray-400 font-mono text-xs">
                                    DISCARD
                                </Button>
                                <Button onClick={addNote} className="bg-[#00BFFF] text-black hover:bg-[#00BFFF]/90 font-bold px-8">
                                    COMMIT LOG
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 191, 255, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 191, 255, 0.4);
        }
      `}</style>
        </div>
    );
};

export default TalentPoolManager;
