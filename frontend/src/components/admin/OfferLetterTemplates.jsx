import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
    FileText,
    Plus,
    Trash2,
    Edit,
    CheckCircle,
    Loader2,
    Copy,
    Info,
    ChevronLeft
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../ui/dialog";
import { useNavigate } from "react-router-dom";
import Navbar from "../shared/Navbar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const OfferLetterTemplates = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        subject: "",
        content: "",
        isDefault: false,
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/company/offer-templates`, {
                withCredentials: true,
            });
            if (res.data.success) {
                setTemplates(res.data.templates || []);
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.subject || !formData.content) {
            toast.error("Please fill in all fields");
            return;
        }

        setProcessing(true);
        try {
            const res = await axios.post(
                `${API_BASE}/company/offer-templates`,
                formData,
                { withCredentials: true }
            );

            if (res.data.success) {
                toast.success("Template created successfully");
                setTemplates(res.data.templates); // Update list
                setShowAddModal(false);
                setFormData({ name: "", subject: "", content: "", isDefault: false });
            }
        } catch (error) {
            console.error("Create template error:", error);
            toast.error(error.response?.data?.message || "Failed to create template");
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            const res = await axios.delete(
                `${API_BASE}/company/offer-templates/${id}`,
                { withCredentials: true }
            );

            if (res.data.success) {
                toast.success("Template deleted");
                setTemplates(res.data.templates);
            }
        } catch (error) {
            console.error("Delete template error:", error);
            toast.error("Failed to delete template");
        }
    };

    const insertVariable = (variable) => {
        setFormData((prev) => ({
            ...prev,
            content: prev.content + ` ${variable} `,
        }));
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FFD700] selection:text-black">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        className="text-gray-400 hover:text-white pl-0"
                        onClick={() => navigate(-1)}
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold uppercase tracking-tighter flex items-center gap-3">
                            <FileText className="w-8 h-8 text-[#FFD700]" />
                            Offer Templates
                        </h1>
                        <p className="text-gray-500 font-mono text-sm mt-1">
                            Manage standardized offer letter templates for your organization
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-bold"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Template
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-20 bg-[#111] border border-white/10 rounded-lg">
                        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-400">No Templates Found</h2>
                        <p className="text-gray-600 mt-2 max-w-md mx-auto">
                            Create your first offer letter template to standardize your hiring process.
                        </p>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            variant="outline"
                            className="mt-6 border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/10"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create First Template
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <div
                                key={template._id}
                                className="bg-[#111] border border-white/10 rounded-lg p-6 group hover:border-[#FFD700]/50 transition-colors relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-[#FFD700] transition-colors">
                                            {template.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono mt-1">
                                            Subject: {template.subject}
                                        </p>
                                    </div>
                                    {template.isDefault && (
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20 text-[10px]">
                                            DEFAULT
                                        </Badge>
                                    )}
                                </div>

                                <div className="bg-white/5 rounded p-3 mb-4 h-32 overflow-hidden text-xs text-gray-400 relative">
                                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#111] to-transparent pointer-events-none" />
                                    <pre className="whitespace-pre-wrap font-sans">
                                        {template.content.replace(/<[^>]*>?/gm, '')}
                                    </pre>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-white/10 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => handleDelete(template._id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-white/10"
                                    // Add edit functionality if needed
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-4xl bg-[#0a0a0a] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#FFD700]" />
                            Create Offer Template
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Design a professional offer letter template. Use variables to dynamically populate candidate details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                        <div className="lg:col-span-2 space-y-4">
                            <div>
                                <label className="text-xs font-mono text-gray-500 mb-1 block">TEMPLATE NAME</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Standard Full-time Offer"
                                    className="bg-white/5 border-white/10"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-mono text-gray-500 mb-1 block">EMAIL SUBJECT</label>
                                <Input
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="e.g. Job Offer | {{company_name}} "
                                    className="bg-white/5 border-white/10"
                                />
                            </div>

                            <div className="flex-1">
                                <label className="text-xs font-mono text-gray-500 mb-1 block">CONTENT (HTML Supported)</label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Type your offer letter content here..."
                                    className="bg-white/5 border-white/10 min-h-[300px] font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-[#111] border border-white/10 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-[#FFD700]" />
                                    Variables
                                </h4>
                                <div className="space-y-2">
                                    {[
                                        "{{candidate_name}}",
                                        "{{job_title}}",
                                        "{{company_name}}",
                                        "{{salary}}",
                                        "{{start_date}}",
                                        "{{offer_expiry_date}}",
                                        "{{recruiter_name}}"
                                    ].map((variance) => (
                                        <button
                                            key={variance}
                                            onClick={() => insertVariable(variance)}
                                            className="w-full text-left text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 p-2 rounded transition-colors flex justify-between group"
                                        >
                                            {variance}
                                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-4 bg-[#111] border border-white/10 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="accent-[#FFD700] w-4 h-4"
                                />
                                <label htmlFor="isDefault" className="text-sm text-gray-300 cursor-pointer select-none">
                                    Set as default template
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-white/10">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={processing}
                            className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-bold"
                        >
                            {processing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Save Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OfferLetterTemplates;
