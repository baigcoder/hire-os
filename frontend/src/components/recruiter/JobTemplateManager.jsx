import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../shared/Navbar";
import {
    LayoutTemplate,
    Plus,
    Search,
    Filter,
    Copy,
    Edit,
    Trash2,
    Globe,
    Lock,
    ChevronRight,
    Briefcase,
    X,
    Check,
    FolderOpen,
    Sparkles,
    TrendingUp,
    Clock,
    Terminal,
    ExternalLink,
    Shield,
    Activity,
    Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORIES = [
    { value: "all", label: "All Categories" },
    { value: "engineering", label: "Engineering" },
    { value: "product", label: "Product" },
    { value: "design", label: "Design" },
    { value: "marketing", label: "Marketing" },
    { value: "sales", label: "Sales" },
    { value: "operations", label: "Operations" },
    { value: "finance", label: "Finance" },
    { value: "hr", label: "HR" },
    { value: "customer_support", label: "Customer Support" },
    { value: "data", label: "Data" },
    { value: "legal", label: "Legal" },
    { value: "other", label: "Other" },
];

const JobTemplateManager = ({ onSelectTemplate, mode = "manage" }) => {
    const [templates, setTemplates] = useState([]);
    const [publicTemplates, setPublicTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [activeTab, setActiveTab] = useState("company");

    const [formData, setFormData] = useState({
        name: "",
        category: "other",
        description: "",
        isPublic: false,
        template: {
            title: "",
            description: "",
            requirements: [],
            skills: [],
            benefits: [],
            salaryRange: { min: 0, max: 0, type: "monthly", currency: "PKR" },
            jobType: "Full-time",
            experienceLevel: 0,
            educationRequired: "Any",
            isRemote: false,
        },
    });

    const [requirementInput, setRequirementInput] = useState("");
    const [skillInput, setSkillInput] = useState("");
    const [benefitInput, setBenefitInput] = useState("");

    useEffect(() => {
        fetchTemplates();
    }, [categoryFilter, activeTab]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const params = categoryFilter !== "all" ? { category: categoryFilter } : {};

            if (activeTab === "company") {
                const res = await axios.get(`${API_URL}/api/v1/job-templates`, {
                    params,
                    withCredentials: true,
                });
                setTemplates(res.data.templates || []);
            } else {
                const res = await axios.get(`${API_URL}/api/v1/job-templates/library`, {
                    params: { ...params, sortBy: "popular" },
                    withCredentials: true,
                });
                setPublicTemplates(res.data.templates || []);
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.template.title || !formData.template.description) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            if (editingTemplate) {
                await axios.put(
                    `${API_URL}/api/v1/job-templates/${editingTemplate._id}`,
                    formData,
                    { withCredentials: true }
                );
                toast.success("Template updated successfully");
            } else {
                await axios.post(`${API_URL}/api/v1/job-templates`, formData, {
                    withCredentials: true,
                });
                toast.success("Template created successfully");
            }

            setShowCreateModal(false);
            resetForm();
            fetchTemplates();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save template");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            await axios.delete(`${API_URL}/api/v1/job-templates/${id}`, {
                withCredentials: true,
            });
            toast.success("Template deleted");
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const handleUseTemplate = async (template) => {
        if (onSelectTemplate) {
            onSelectTemplate(template);
        } else {
            try {
                const res = await axios.post(
                    `${API_URL}/api/v1/job-templates/${template._id}/use`,
                    {},
                    { withCredentials: true }
                );
                toast.success("Job created from template!");
            } catch (error) {
                toast.error("Failed to create job from template");
            }
        }
    };

    const startEdit = (template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            category: template.category,
            description: template.description || "",
            isPublic: template.isPublic,
            template: template.template,
        });
        setShowCreateModal(true);
    };

    const resetForm = () => {
        setEditingTemplate(null);
        setFormData({
            name: "",
            category: "other",
            description: "",
            isPublic: false,
            template: {
                title: "",
                description: "",
                requirements: [],
                skills: [],
                benefits: [],
                salaryRange: { min: 0, max: 0, type: "monthly", currency: "PKR" },
                jobType: "Full-time",
                experienceLevel: 0,
                educationRequired: "Any",
                isRemote: false,
            },
        });
        setRequirementInput("");
        setSkillInput("");
        setBenefitInput("");
    };

    const addListItem = (type, value, setter) => {
        if (!value.trim()) return;
        setFormData((prev) => ({
            ...prev,
            template: {
                ...prev.template,
                [type]: [...prev.template[type], value.trim()],
            },
        }));
        setter("");
    };

    const removeListItem = (type, index) => {
        setFormData((prev) => ({
            ...prev,
            template: {
                ...prev.template,
                [type]: prev.template[type].filter((_, i) => i !== index),
            },
        }));
    };

    const displayTemplates = activeTab === "company" ? templates : publicTemplates;
    const filteredTemplates = displayTemplates.filter(
        (t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.template?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F97316]/5 rounded-full blur-[130px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#F97316]/3 rounded-full blur-[160px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10 min-h-screen pb-20">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#F97316] rounded-sm flex items-center justify-center shadow-[0_0_25px_rgba(0,191,255,0.4)]">
                            <LayoutTemplate className="w-7 h-7 text-black" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-tight">
                                Job Templates
                            </h1>
                            <p className="text-gray-500 text-xs font-mono flex items-center gap-2 tracking-widest">
                                <Terminal className="w-3 h-3 text-[#F97316]" />
                                REUSABLE DEPLOYMENT BLUEPRINTS
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-6 px-6 py-2.5 bg-white/5 border border-white/10 rounded-sm">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                    Total Library
                                </span>
                                <span className="text-xl font-bold text-[#F97316] leading-none">
                                    {templates.length + publicTemplates.length}
                                </span>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                    Active Local
                                </span>
                                <span className="text-xl font-bold text-white leading-none">
                                    {templates.length}
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={() => {
                                resetForm();
                                setShowCreateModal(true);
                            }}
                            className="bg-[#F97316] text-black hover:bg-[#F97316]/90 rounded-sm font-bold flex items-center gap-2 px-8 h-12 shadow-[0_0_20px_rgba(0,191,255,0.2)]"
                        >
                            <Plus className="w-5 h-5" />
                            CREATE BLUEPRINT
                        </Button>
                    </div>
                </motion.div>

                {/* Workspace Controls */}
                <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-sm p-4 mb-10">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <TabsList className="bg-black/40 border border-white/5 p-1 rounded-sm h-12 w-full md:w-auto">
                                <TabsTrigger
                                    value="company"
                                    className="flex-1 md:flex-none rounded-sm data-[state=active]:bg-[#F97316] data-[state=active]:text-black text-[11px] font-bold uppercase py-2.5 px-8"
                                >
                                    <FolderOpen className="w-3.5 h-3.5 mr-2" />
                                    Local Archive
                                </TabsTrigger>
                                <TabsTrigger
                                    value="library"
                                    className="flex-1 md:flex-none rounded-sm data-[state=active]:bg-[#F97316] data-[state=active]:text-black text-[11px] font-bold uppercase py-2.5 px-8"
                                >
                                    <Globe className="w-3.5 h-3.5 mr-2" />
                                    Global Repository
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-96">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="SEARCH BLUEPRINTS..."
                                        className="pl-10 bg-black/40 border-white/10 text-white font-mono text-xs rounded-sm focus:border-[#F97316]/50 h-12 uppercase tracking-tight"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-56 bg-black/40 border-white/10 text-xs font-mono rounded-sm h-12 uppercase">
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-3.5 h-3.5 text-[#F97316]" />
                                            <SelectValue placeholder="DOMAIN" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#111111] border-white/10 text-white font-mono">
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value} className="text-xs uppercase">
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <TabsContent value="company" className="mt-10 border-none p-0 outline-none">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-32">
                                        <div className="w-12 h-12 border-2 border-[#F97316]/20 border-t-[#F97316] rounded-full animate-spin mb-6" />
                                        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                                            Parsing Local Repositories...
                                        </p>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-white/5 border-dashed rounded-sm"
                                    >
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8">
                                            <LayoutTemplate className="h-10 w-10 text-gray-700" />
                                        </div>
                                        <h3 className="text-gray-300 font-bold uppercase tracking-widest text-lg mb-2">
                                            Zero Blueprints Detected
                                        </h3>
                                        <p className="text-gray-600 font-mono text-xs uppercase max-w-sm text-center mb-8">
                                            LOCAL STORAGE IS EMPTY. INITIALIZE A NEW BLUEPRINT TO START SCALING YOUR DEPLOYMENTS.
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="border-white/10 text-gray-500 hover:text-[#F97316] hover:border-[#F97316]/30 rounded-sm font-mono text-xs h-11 px-10"
                                            onClick={() => {
                                                resetForm();
                                                setShowCreateModal(true);
                                            }}
                                        >
                                            + INITIALIZE LOCAL ARCHIVE
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {filteredTemplates.map((template) => (
                                            <TemplateCard
                                                key={template._id}
                                                template={template}
                                                onEdit={() => startEdit(template)}
                                                onDelete={() => handleDelete(template._id)}
                                                onUse={() => handleUseTemplate(template)}
                                                showActions
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="library" className="mt-10 border-none p-0 outline-none">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-32">
                                        <div className="w-12 h-12 border-2 border-[#F97316]/20 border-t-[#F97316] rounded-full animate-spin mb-6" />
                                        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                                            Connecting to Global Repository...
                                        </p>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-white/5 border-dashed rounded-sm">
                                        <Globe className="h-14 w-14 text-gray-800 mb-6" />
                                        <p className="text-gray-500 font-mono uppercase text-sm tracking-widest">
                                            Global Repository Filter: Null Results
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {filteredTemplates.map((template) => (
                                            <TemplateCard
                                                key={template._id}
                                                template={template}
                                                onUse={() => handleUseTemplate(template)}
                                                showCompany
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </AnimatePresence>
                    </Tabs>
                </div>
            </div>

            {/* CREATE / EDIT MODAL */}
            <AnimatePresence>
                {showCreateModal && (
                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-[#111111] border-white/10 text-white font-['Space_Grotesk',sans-serif] p-0 rounded-sm custom-scrollbar overflow-x-hidden">
                            <div className="sticky top-0 z-20 bg-[#111111]/90 backdrop-blur-md border-b border-white/10 p-6 flex flex-col gap-1">
                                <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-[#F97316]/20 pointer-events-none" />
                                <DialogTitle className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-3">
                                    <Box className="w-6 h-6 text-[#F97316]" />
                                    {editingTemplate ? "Modify Blueprint" : "Initialize New Blueprint"}
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                                    {editingTemplate ? "UPDATING SYSTEM BLUEPRINT SPECIFICATIONS" : "DESIGNING NEW DEPLOYMENT BLUEPRINT ARCHITECTURE"}
                                </DialogDescription>
                            </div>

                            <div className="p-8 space-y-12">
                                {/* Section 1: Meta Config */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full border border-[#F97316]/20 flex items-center justify-center text-[10px] font-bold text-[#F97316] font-mono">01</div>
                                        <h3 className="font-bold uppercase tracking-widest text-xs text-gray-400">Metadata Identification</h3>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2 bg-white/[0.02] border border-white/5 p-6 rounded-sm relative">
                                        <div className="space-y-2 flex flex-col">
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Blueprint Instance Name *</Label>
                                            <Input
                                                placeholder="e.g., SENIOR CORE ENGINEER TEMPLATE"
                                                className="bg-black/40 border-white/10 uppercase font-bold text-sm h-12 focus:border-[#F97316]/50 rounded-sm"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="space-y-2 flex flex-col">
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Industry Domain</Label>
                                            <Select
                                                value={formData.category}
                                                onValueChange={(v) => setFormData({ ...formData, category: v })}
                                            >
                                                <SelectTrigger className="bg-black/40 border-white/10 text-xs font-mono h-12 rounded-sm uppercase">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#111111] border-white/10 text-white font-mono uppercase">
                                                    {CATEGORIES.slice(1).map((cat) => (
                                                        <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                                            {cat.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2 flex flex-col">
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Deployment Context</Label>
                                            <Textarea
                                                placeholder="SPECIFY WHEN TO DEPLOY THIS BLUEPRINT..."
                                                className="bg-black/40 border-white/10 font-mono text-[11px] focus:border-[#F97316]/50 rounded-sm resize-none uppercase"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={2}
                                            />
                                        </div>

                                        <div className="md:col-span-2 flex items-center gap-3 pt-4 border-t border-white/5">
                                            <Switch
                                                checked={formData.isPublic}
                                                onCheckedChange={(v) => setFormData({ ...formData, isPublic: v })}
                                                className="data-[state=checked]:bg-[#F97316]"
                                            />
                                            <div className="flex flex-col">
                                                <Label className="text-[10px] font-bold uppercase tracking-wide">Public Access Authorization</Label>
                                                <span className="text-[9px] text-gray-600 font-mono uppercase">ENABLE SHARING WITH EXTERNAL RECRUITMENT NETWORKS</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Core Payload */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full border border-[#F97316]/20 flex items-center justify-center text-[10px] font-bold text-[#F97316] font-mono">02</div>
                                        <h3 className="font-bold uppercase tracking-widest text-xs text-gray-400">Core Job Payload</h3>
                                    </div>

                                    <div className="space-y-8 bg-white/[0.02] border border-white/5 p-8 rounded-sm">
                                        <div className="space-y-2 flex flex-col">
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Operational Job Title *</Label>
                                            <Input
                                                placeholder="e.g., LEAD SYSTEMS ARCHITECT"
                                                className="bg-black/40 border-white/10 font-bold text-base h-12 focus:border-[#F97316]/50 rounded-sm uppercase tracking-tight"
                                                value={formData.template.title}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        template: { ...formData.template, title: e.target.value.toUpperCase() },
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2 flex flex-col">
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Job Narrative & Mission Statement *</Label>
                                            <Textarea
                                                placeholder="DEFINE THE ROLE MISSION, GOALS, AND OPERATIONAL SCOPE..."
                                                className="bg-black/40 border-white/10 font-mono text-xs focus:border-[#F97316]/50 rounded-sm min-h-[160px] uppercase leading-relaxed"
                                                value={formData.template.description}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        template: { ...formData.template, description: e.target.value },
                                                    })
                                                }
                                            />
                                        </div>

                                        {/* Tags Section */}
                                        <div className="grid md:grid-cols-2 gap-10">
                                            {/* Requirements */}
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-mono text-[#F97316] uppercase tracking-widest">Requirement Vectors</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="ADD VECTOR..."
                                                        className="bg-black/40 border-white/10 h-10 text-xs font-mono rounded-sm uppercase"
                                                        value={requirementInput}
                                                        onChange={(e) => setRequirementInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                addListItem("requirements", requirementInput, setRequirementInput);
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        className="bg-[#F97316] text-black hover:bg-[#F97316]/90 h-10 px-4 rounded-sm"
                                                        onClick={() => addListItem("requirements", requirementInput, setRequirementInput)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-black/20 rounded-sm border border-white/5">
                                                    <AnimatePresence>
                                                        {formData.template.requirements.map((req, i) => (
                                                            <motion.div
                                                                key={i}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                            >
                                                                <Badge className="bg-white/5 border border-white/10 text-gray-400 font-mono text-[9px] py-1 px-3 flex items-center gap-2 rounded-sm uppercase italic">
                                                                    {req}
                                                                    <X
                                                                        className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
                                                                        onClick={() => removeListItem("requirements", i)}
                                                                    />
                                                                </Badge>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* Skills */}
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-mono text-[#FFD700] uppercase tracking-widest">Skill Indexes</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="ADD SKILL..."
                                                        className="bg-black/40 border-white/10 h-10 text-xs font-mono rounded-sm uppercase"
                                                        value={skillInput}
                                                        onChange={(e) => setSkillInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                addListItem("skills", skillInput, setSkillInput);
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 h-10 px-4 rounded-sm"
                                                        onClick={() => addListItem("skills", skillInput, setSkillInput)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-black/20 rounded-sm border border-white/5">
                                                    <AnimatePresence>
                                                        {formData.template.skills.map((skill, i) => (
                                                            <motion.div
                                                                key={i}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                            >
                                                                <Badge className="bg-[#FFD700]/5 border border-[#FFD700]/10 text-[#FFD700]/80 font-mono text-[9px] py-1 px-3 flex items-center gap-2 rounded-sm uppercase">
                                                                    {skill}
                                                                    <X
                                                                        className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
                                                                        onClick={() => removeListItem("skills", i)}
                                                                    />
                                                                </Badge>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Parametric Config */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full border border-[#F97316]/20 flex items-center justify-center text-[10px] font-bold text-[#F97316] font-mono">03</div>
                                        <h3 className="font-bold uppercase tracking-widest text-xs text-gray-400">Parametric Configuration</h3>
                                    </div>

                                    <div className="grid gap-10 md:grid-cols-2 bg-white/[0.02] border border-white/5 p-8 rounded-sm">
                                        <div className="grid gap-6">
                                            <div className="space-y-2 flex flex-col">
                                                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Deployment Type</Label>
                                                <Select
                                                    value={formData.template.jobType}
                                                    onValueChange={(v) =>
                                                        setFormData({
                                                            ...formData,
                                                            template: { ...formData.template, jobType: v },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger className="bg-black/40 border-white/10 h-11 text-xs font-bold font-mono rounded-sm uppercase">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#111111] border-white/10 text-white font-mono uppercase">
                                                        {["Full-time", "Part-time", "Contract", "Internship", "Freelance", "Remote"].map(
                                                            (type) => (
                                                                <SelectItem key={type} value={type} className="text-xs">
                                                                    {type}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2 flex flex-col">
                                                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex justify-between items-center">
                                                    Seniority Level Index
                                                    <span className="text-[#F97316] font-bold">{formData.template.experienceLevel} YRS</span>
                                                </Label>
                                                <Input
                                                    type="number"
                                                    className="bg-black/40 border-white/10 h-11 font-bold text-sm focus:border-[#F97316]/50 rounded-sm"
                                                    value={formData.template.experienceLevel}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            template: {
                                                                ...formData.template,
                                                                experienceLevel: parseInt(e.target.value) || 0,
                                                            },
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center gap-6">
                                            <div className="flex items-center gap-4 bg-black/40 h-16 border border-white/5 px-6 rounded-sm">
                                                <Switch
                                                    checked={formData.template.isRemote}
                                                    onCheckedChange={(v) =>
                                                        setFormData({
                                                            ...formData,
                                                            template: { ...formData.template, isRemote: v },
                                                        })
                                                    }
                                                    className="data-[state=checked]:bg-[#F97316]"
                                                />
                                                <div className="flex flex-col">
                                                    <Label className="text-[11px] font-bold uppercase tracking-widest">Remote Node Access</Label>
                                                    <span className="text-[9px] text-gray-600 font-mono uppercase">ENABLE DISTRIBUTED DEPLOYMENT ARCHITECTURE</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 bg-[#FFD700]/5 h-16 border border-[#FFD700]/10 px-6 rounded-sm">
                                                <TrendingUp className="w-5 h-5 text-[#FFD700]/50" />
                                                <div className="flex flex-col">
                                                    <Label className="text-[11px] font-bold uppercase tracking-widest text-[#FFD700]/80">Salary Range Calibration</Label>
                                                    <span className="text-[9px] text-gray-600 font-mono uppercase">CONFIGURED IN FINAL JOB DEPLOYMENT STAGE</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 z-30 bg-[#111111]/95 backdrop-blur-lg border-t border-white/10 p-6 flex justify-end gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    className="border-white/10 text-gray-500 font-mono text-xs h-12 px-10 rounded-sm hover:text-white transition-colors"
                                >
                                    ABORT SEQUENCE
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    className="bg-[#F97316] text-black hover:bg-[#F97316]/90 font-bold px-12 h-12 rounded-sm shadow-[0_0_20px_rgba(0,191,255,0.2)]"
                                >
                                    {editingTemplate ? "COMMIT BLUEPRINT UPDATES" : "FINALIZE & DEPLOY BLUEPRINT"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 191, 255, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 191, 255, 0.3);
        }
      `}</style>
        </div>
    );
};

// Template Card Component
const TemplateCard = ({ template, onEdit, onDelete, onUse, showActions = false, showCompany = false }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        className="group relative"
    >
        <Card className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 group-hover:border-[#F97316]/30 transition-all rounded-sm overflow-hidden h-full flex flex-col">
            {/* Corner Accent */}
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#F97316]/30 transition-all" />

            <CardHeader className="pb-3 px-5">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors truncate uppercase tracking-tight">
                            {template.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="bg-[#F97316]/5 border-[#F97316]/20 text-[#F97316] text-[9px] font-mono rounded-sm h-4">
                                {template.category.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                                {template.isPublic ? (
                                    <Globe className="h-3 w-3 text-cyan-500" />
                                ) : (
                                    <Lock className="h-3 w-3 text-gray-600" />
                                )}
                                {template.isPublic ? "PUBLIC ARCHIVE" : "PRIVATE LOCAL"}
                            </div>
                        </div>
                    </div>
                    {template.isOfficial ? (
                        <div className="w-10 h-10 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.1)]">
                            <Sparkles className="w-5 h-5 text-[#FFD700]" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center group-hover:bg-[#F97316]/10 transition-colors">
                            <LayoutTemplate className="w-5 h-5 text-gray-400 group-hover:text-[#F97316]" />
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-5 flex-1 flex flex-col">
                <div className="mb-4">
                    <p className="text-xs font-bold text-[#F97316]/70 font-mono uppercase mb-1">Target Role:</p>
                    <p className="font-medium text-gray-200 line-clamp-1">{template.template?.title}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-2 leading-relaxed">
                        {template.template?.description}
                    </p>
                </div>

                {template.template?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                        {template.template.skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-[8px] h-4 border-white/5 text-gray-400 uppercase font-mono">
                                {skill}
                            </Badge>
                        ))}
                        {template.template.skills.length > 3 && (
                            <Badge variant="outline" className="text-[8px] h-4 border-white/5 text-gray-500 font-mono">
                                +{template.template.skills.length - 3} MORE
                            </Badge>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase">
                            <TrendingUp className="h-3 w-3" />
                            <span>{template.usageCount || 0} DEPLOYMENTS</span>
                        </div>

                        <div className="flex gap-1">
                            {showActions && (
                                <>
                                    <Button size="sm" variant="outline" className="border-white/10 hover:border-[#F97316]/30 h-8 w-8 p-0" onClick={onEdit}>
                                        <Edit className="h-3.5 w-3.5 text-gray-400" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-white/10 hover:border-red-500/30 h-8 w-8 p-0" onClick={onDelete}>
                                        <Trash2 className="h-3.5 w-3.5 text-red-500/70" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <Button size="sm" onClick={onUse} className="w-full bg-[#F97316] text-black hover:bg-[#F97316]/90 rounded-sm font-bold text-xs gap-2 h-9 shadow-[0_0_15px_rgba(0,191,255,0.1)]">
                        <Copy className="h-3.5 w-3.5" />
                        DEPLOY TEMPLATE
                    </Button>
                </div>

                {showCompany && template.company && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-white/5 rounded-sm flex items-center justify-center border border-white/10 text-[10px] font-bold text-gray-500">
                            {template.company.name.charAt(0)}
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono uppercase truncate tracking-wider">
                            AUTHOR: {template.company.name}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    </motion.div>
);

export default JobTemplateManager;
