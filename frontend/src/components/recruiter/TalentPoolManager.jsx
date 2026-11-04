import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import Navbar from "../shared/Navbar";
import {
  Users,
  Search,
  FolderPlus,
  Mail,
  Star,
  MoreVertical,
  Eye,
  Trash2,
  MessageSquare,
  Filter,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const [newPool, setNewPool] = useState({ name: "", description: "", color: "#f2f2f2" });
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
        if (!newPool.name) { toast.error("Name the pool"); return; }
        try {
            await axios.post(`${API_URL}/api/v1/talent-pools`, newPool, { withCredentials: true });
            toast.success("Pool created");
            setShowCreateModal(false);
            setNewPool({ name: "", description: "", color: "#f2f2f2" });
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
        if (!noteContent.trim()) { toast.error("Write the note first"); return; }
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
        <div className="min-h-screen bg-background text-white">
            <Navbar />

            <div
                className="fixed inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                    backgroundSize: "50px 50px",
                }}
            />
            <div className="fixed inset-0 pointer-events-none">
            </div>

            <div className="relative flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
                <div className="app-title-row">
                    <h1 className="app-h1">Talent pool</h1>
                    <button type="button" className="app-btn app-btn-primary" onClick={() => setShowCreateModal(true)}>
                        New pool
                    </button>
                </div>

                
{/* Main Content Area */}
                {pools.length === 0 && !loading ? (
                    <div className="app-panel" style={{ maxWidth: 560 }}>
                        <p className="app-row-title">No pools yet</p>
                        <p className="app-meta" style={{ margin: "6px 0 16px" }}>
                            Group strong candidates you can&apos;t hire now, ready for the next opening.
                        </p>
                        <button type="button" className="app-btn app-btn-primary" onClick={() => setShowCreateModal(true)}>
                            New pool
                        </button>
                    </div>
                ) : (
                <div className="flex-1 flex gap-6 overflow-hidden mb-4">
                    {/* Left Sidebar - Pools List */}
                    <div
                       
                       
                       
                        className="w-72 flex-shrink-0 flex flex-col"
                    >
                        <div className="bg-card/80 border border-white/10 rounded-sm flex-1 flex flex-col p-4">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <span className="text-xs text-gray-500">
                                    Pools
                                </span>
                                <Badge
                                    variant="outline"
                                    className="border-[#f2f2f2]/30 text-[#f2f2f2] text-xs"
                                >
                                    {pools.length}
                                </Badge>
                            </div>

                            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {pools.map((pool) => (
                                    <button
                                        key={pool._id}
                                        onClick={() => setActivePool(pool)}
                                        className={`w-full text-left p-3 rounded-sm flex items-center gap-3 transition-all group relative ${activePool?._id === pool._id ? "bg-[#f2f2f2]/10 border-l-2 border-[#f2f2f2]" : "hover:bg-white/5 border-l-2 border-transparent" }`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: pool.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`text-sm font-bold truncate ${activePool?._id === pool._id ? "text-[#f2f2f2]" : "text-gray-300" }`}
                                            >
                                                {pool.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {pool.candidateCount || 0} CANDIDATES
                                            </p>
                                        </div>
                                        {activePool?._id === pool._id && (
                                            <ChevronRight className="w-3 h-3 text-[#f2f2f2]" />
                                        )}
                                    </button>
                                ))}

                                {pools.length === 0 && !loading && (
                                    <div className="text-center py-12">
                                        <FolderPlus className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">
                                            No pools found
                                        </p>
                                    </div>
                                )}
                                {loading && (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-[#f2f2f2]/20 border-t-[#f2f2f2] rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Main Area - Candidates */}
                    <div
                       
                       
                       
                        className="flex-1 flex flex-col min-w-0"
                    >
                        <div className="bg-card/80 border border-white/10 rounded-sm flex-1 flex flex-col relative overflow-hidden">
                            {/* Corner Accents */}

                            {!activePool ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                                        <Users className="h-10 w-10 text-[#f2f2f2]/40" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        Pick a pool
                                    </h3>
                                    <p className="text-gray-500 text-sm max-w-sm mb-6">
                                                                                
                                    </p>
                                    <Button
                                        onClick={() => setShowCreateModal(true)}
                                        variant="outline"
                                        className="border-white/10 hover:border-[#f2f2f2]/30 text-gray-400 hover:text-[#f2f2f2] rounded-sm text-xs"
                                    >
                                        New pool
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Candidates Header */}
                                    <div className="p-4 border-b border-white/10 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                                        <div>
                                            <h2 className="text-lg font-bold flex items-center gap-2">
                                                <span
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: activePool.color }}
                                                />
                                                {activePool.name}
                                            </h2>
                                            <p className="text-xs text-gray-500">
                                                {activePool.description || ""}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                                <Input
                                                    placeholder="Search candidates"
                                                    className="pl-9 w-64 bg-black/40 border-white/10 text-white text-xs rounded-sm focus:border-[#f2f2f2]/50"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="w-40 bg-black/40 border-white/10 text-xs rounded-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Filter className="w-3 h-3 text-[#f2f2f2]" />
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-card border-white/10 text-white">
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
                                                <div
                                                   
                                                   
                                                   
                                                    className="h-full flex flex-col items-center justify-center py-20"
                                                >
                                                    <Users className="h-16 w-16 text-gray-800 mb-4 stroke-1" />
                                                    <p className="text-gray-500 text-sm">
                                                        {searchQuery ? "No matches found" : "No candidates in this pool"}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid gap-3">
                                                    {filteredCandidates.map((candidate, idx) => (
                                                        <div
                                                            key={candidate.user?._id}
                                                           
                                                           
                                                           
                                                            className="group relative flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 hover:border-[#f2f2f2]/30 hover:bg-white/[0.04] rounded-sm transition-all"
                                                        >

                                                            <Avatar className="h-12 w-12 border border-white/10 rounded-sm">
                                                                <AvatarImage src={candidate.user?.profile?.profilePhoto} />
                                                                <AvatarFallback className="bg-card text-[#f2f2f2] font-bold rounded-sm">
                                                                    {candidate.user?.fullname?.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-gray-100 truncate group-hover:text-white transition-colors">
                                                                        {candidate.user?.fullname}
                                                                    </h4>
                                                                    <Badge className="bg-[#f2f2f2]/10 text-[#f2f2f2] border-[#f2f2f2]/20 rounded-sm text-xs h-5">
                                                                        {candidate.status.replace("_", " ")}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-gray-500 truncate mb-2">
                                                                    {candidate.user?.email || ""}
                                                                </p>

                                                                <div className="flex flex-wrap items-center gap-3">
                                                                    {candidate.rating && (
                                                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/5 border border-primary/20 rounded-sm">
                                                                            <Star className="h-3 w-3 fill-primary text-primary" />
                                                                            <span className="text-xs font-bold text-primary">{candidate.rating}</span>
                                                                        </div>
                                                                    )}
                                                                    {candidate.user?.profile?.skills?.slice(0, 3).map((skill) => (
                                                                        <Badge key={skill} variant="outline" className="text-xs border-white/10 text-gray-400 h-5">
                                                                            {skill.toUpperCase()}
                                                                        </Badge>
                                                                    ))}
                                                                    {candidate.user?.profile?.skills?.length > 3 && (
                                                                        <span className="text-xs text-gray-600">
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
                                                                    <SelectTrigger className="w-32 h-8 bg-black/40 border-white/10 text-xs rounded-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-card border-white/10 text-white">
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
                                                                        className="h-8 w-8 p-0 hover:bg-white/5 hover:text-[#f2f2f2]"
                                                                        onClick={() => { setSelectedCandidate(candidate); setShowNoteModal(true); }}
                                                                        title="Add a note"
                                                                    >
                                                                        <MessageSquare className="h-4 w-4" />
                                                                    </Button>

                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5">
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="bg-card border-white/10 text-white">
                                                                            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#f2f2f2]/10 focus:text-[#f2f2f2]">
                                                                                <Eye className="h-4 w-4" /> View profile
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-[#f2f2f2]/10 focus:text-[#f2f2f2]">
                                                                                <Mail className="h-4 w-4" /> Send email
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                className="gap-2 cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
                                                                                onClick={() => removeCandidate(candidate.user?._id)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" /> Remove
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {/* Create Pool Modal */}
                {showCreateModal && (
                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogContent className="bg-card border-white/10 text-white sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-[#f2f2f2]" />
                                    New pool
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 text-xs">
                                    
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Pool Identity *</Label>
                                    <Input
                                        placeholder="Senior backend engineers"
                                        value={newPool.name}
                                        onChange={(e) => setNewPool({ ...newPool, name: e.target.value.toUpperCase() })}
                                        className="bg-black/40 border-white/10 font-bold text-sm h-11 focus:border-[#f2f2f2]/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Operational Scope</Label>
                                    <Textarea
                                        placeholder=""
                                        value={newPool.description}
                                        onChange={(e) => setNewPool({ ...newPool, description: e.target.value })}
                                        className="bg-black/40 border-white/10 text-xs rows-3 focus:border-[#f2f2f2]/50 min-h-[100px]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-500">Color Index</Label>
                                        <div className="flex gap-3 items-center bg-black/40 p-2 rounded-sm border border-white/10">
                                            <Input
                                                type="color"
                                                value={newPool.color}
                                                onChange={(e) => setNewPool({ ...newPool, color: e.target.value })}
                                                className="w-10 h-10 p-0 cursor-pointer border-none bg-transparent"
                                            />
                                            <span className="text-xs text-gray-400">{newPool.color.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-white/10 text-gray-400 text-xs">
                                    Cancel
                                </Button>
                                <Button onClick={createPool} className="bg-[#f2f2f2] text-black hover:bg-[#f2f2f2]/90 font-bold px-8">
                                    Create pool
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Add Note Modal */}
                {showNoteModal && (
                    <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
                        <DialogContent className="bg-card border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#f2f2f2]" />
                                    Add a note
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 text-xs">
                                    {selectedCandidate?.user?.fullname}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Interaction Type</Label>
                                    <Select value={noteType} onValueChange={setNoteType}>
                                        <SelectTrigger className="bg-black/40 border-white/10 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-white/10 text-white">
                                            <SelectItem value="note">Note</SelectItem>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="call">Call</SelectItem>
                                            <SelectItem value="interview">Interview</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-500">Debrief Details *</Label>
                                    <Textarea
                                        placeholder=""
                                        rows={5}
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        className="bg-black/40 border-white/10 text-xs focus:border-[#f2f2f2]/50"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setShowNoteModal(false)} className="border-white/10 text-gray-400 text-xs">
                                    Cancel
                                </Button>
                                <Button onClick={addNote} className="bg-[#f2f2f2] text-black hover:bg-[#f2f2f2]/90 font-bold px-8">
                                    Save note
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>

            <style>{`
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
