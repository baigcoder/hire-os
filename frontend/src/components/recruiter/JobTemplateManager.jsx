import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
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
  X,
  FolderOpen,
  Sparkles,
  TrendingUp,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
    const [, setBenefitInput] = useState("");

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
            toast.error("Add a name and a job title");
            return;
        }

        try {
            if (editingTemplate) {
                await axios.put(
                    `${API_URL}/api/v1/job-templates/${editingTemplate._id}`,
                    formData,
                    { withCredentials: true }
                );
                toast.success("Template saved");
            } else {
                await axios.post(`${API_URL}/api/v1/job-templates`, formData, {
                    withCredentials: true,
                });
                toast.success("Template created");
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
                await axios.post(
                    `${API_URL}/api/v1/job-templates/${template._id}/use`,
                    {},
                    { withCredentials: true }
                );
                toast.success("Job posted");
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

            <div className="relative">
                <div className="app-title-row">
                    <h1 className="app-h1">Job templates</h1>
                    <button type="button" className="app-btn app-btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
                        New template
                    </button>
                </div>

                
{/* Workspace Controls */}
                <div className="bg-card/80 border border-white/10 rounded-sm p-4 mb-10">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <TabsList className="bg-black/40 border border-white/5 p-1 rounded-sm h-12 w-full md:w-auto">
                                <TabsTrigger
                                    value="company"
                                    className="flex-1 md:flex-none rounded-sm data-[state=active]:bg-[#f2f2f2] data-[state=active]:text-black text-xs font-bold py-2.5 px-8"
                                >
                                    <FolderOpen className="w-3.5 h-3.5 mr-2" />
                                    Yours
                                </TabsTrigger>
                                <TabsTrigger
                                    value="library"
                                    className="flex-1 md:flex-none rounded-sm data-[state=active]:bg-[#f2f2f2] data-[state=active]:text-black text-xs font-bold py-2.5 px-8"
                                >
                                    <Globe className="w-3.5 h-3.5 mr-2" />
                                    Shared
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-96">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search templates"
                                        className="pl-10 bg-black/40 border-white/10 text-white text-xs rounded-sm focus:border-[#f2f2f2]/50 h-12"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-56 bg-black/40 border-white/10 text-xs rounded-sm h-12">
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-3.5 h-3.5 text-[#f2f2f2]" />
                                            <SelectValue placeholder="Category" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-white/10 text-white">
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value} className="text-xs">
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
                                        <div className="w-12 h-12 border-2 border-[#f2f2f2]/20 border-t-[#f2f2f2] rounded-full animate-spin mb-6" />
                                        <p className="text-gray-500 text-xs animate-pulse">
                                            Loading…
                                        </p>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div
                                       
                                       
                                        className="flex flex-col items-start py-6"
                                    >
                                        <h3 className="text-white text-base font-medium mb-1">
                                            No templates yet
                                        </h3>
<p className="app-meta" style={{ margin: "0 0 16px" }}>Save a job you post often and post it again in one step.</p>
                                        <p className="text-gray-600 text-xs max-w-sm text-center mb-8">
                                            
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="border-white/10 text-gray-500 hover:text-[#f2f2f2] hover:border-[#f2f2f2]/30 rounded-sm text-xs h-11 px-10"
                                            onClick={() => {
                                                resetForm();
                                                setShowCreateModal(true);
                                            }}
                                        >
                                            New template
                                        </Button>
                                    </div>
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
                                        <div className="w-12 h-12 border-2 border-[#f2f2f2]/20 border-t-[#f2f2f2] rounded-full animate-spin mb-6" />
                                        <p className="text-gray-500 text-xs animate-pulse">
                                            Loading…
                                        </p>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="flex flex-col items-start py-6">
                                        <Globe className="h-14 w-14 text-gray-800 mb-6" />
                                        <p className="text-gray-500 text-sm">
                                            Nothing matches
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
                        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-card border-white/10 text-white p-0 rounded-sm custom-scrollbar overflow-x-hidden">
                            <div className="sticky top-0 z-20 bg-card/90 border-b border-white/10 p-6 flex flex-col gap-1">
                                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                    <Box className="w-6 h-6 text-[#f2f2f2]" />
                                    {editingTemplate ? "Edit template" : "New template"}
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 text-xs">
                                    {editingTemplate ? "" : ""}
                                </DialogDescription>
                            </div>

                            <div className="p-8 space-y-12">
                                {/* Section 1: Meta Config */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full border border-[#f2f2f2]/20 flex items-center justify-center text-xs font-bold text-[#f2f2f2]">01</div>
                                        <h3 className="font-bold text-xs text-gray-400">Metadata Identification</h3>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2 bg-white/[0.02] border border-white/5 p-6 rounded-sm relative">
                                        <div className="space-y-2 flex flex-col">
                                            <Label className="text-xs text-gray-500">Template name</Label>
                                            <Input
                                                placeholder="Senior engineer"
                                                className="bg-black/40 border-white/10 font-bold text-sm h-12 focus:border-[#f2f2f2]/50 rounded-sm"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="space-y-2 flex flex-col">
                                            <Label className="text-xs text-gray-500">Industry Domain</Label>
                                            <Select
                                                value={formData.category}
                                                onValueChange={(v) => setFormData({ ...formData, category: v })}
                                            >
                                                <SelectTrigger className="bg-black/40 border-white/10 text-xs h-12 rounded-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card border-white/10 text-white">
                                                    {CATEGORIES.slice(1).map((cat) => (
                                                        <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                                            {cat.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2 flex flex-col">
                                            <Label className="text-xs text-gray-500">When to use it</Label>
                                            <Textarea
                                                placeholder=""
                                                className="bg-black/40 border-white/10 text-xs focus:border-[#f2f2f2]/50 rounded-sm resize-none"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={2}
                                            />
                                        </div>

                                        <div className="md:col-span-2 flex items-center gap-3 pt-4 border-t border-white/5">
                                            <Switch
                                                checked={formData.isPublic}
                                                onCheckedChange={(v) => setFormData({ ...formData, isPublic: v })}
                                                className="data-[state=checked]:bg-[#f2f2f2]"
                                            />
                                            <div className="flex flex-col">
                                                <Label className="text-xs font-bold">Public Access Authorization</Label>
                                                <span className="text-xs text-gray-600"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Core Payload */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full border border-[#f2f2f2]/20 flex items-center justify-center text-xs font-bold text-[#f2f2f2]">02</div>
                                        <h3 className="font-bold text-xs text-gray-400">The job</h3>
                                    </div>

                                    <div className="space-y-8 bg-white/[0.02] border border-white/5 p-8 rounded-sm">
                                        <div className="space-y-2 flex flex-col">
                                            <Label className="text-xs text-gray-500">Operational Job Title *</Label>
                                            <Input
                                                placeholder="Job title"
                                                className="bg-black/40 border-white/10 font-bold text-base h-12 focus:border-[#f2f2f2]/50 rounded-sm"
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
                                            <Label className="text-xs text-gray-500">Job Narrative & Mission Statement *</Label>
                                            <Textarea
                                                placeholder=""
                                                className="bg-black/40 border-white/10 text-xs focus:border-[#f2f2f2]/50 rounded-sm min-h-[160px] leading-relaxed"
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
                                                <Label className="text-xs text-[#f2f2f2]">Requirements</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Add a requirement"
                                                        className="bg-black/40 border-white/10 h-10 text-xs rounded-sm"
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
                                                        className="bg-[#f2f2f2] text-black hover:bg-[#f2f2f2]/90 h-10 px-4 rounded-sm"
                                                        onClick={() => addListItem("requirements", requirementInput, setRequirementInput)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-black/20 rounded-sm border border-white/5">
                                                    <AnimatePresence>
                                                        {formData.template.requirements.map((req, i) => (
                                                            <div
                                                                key={i}
                                                               
                                                               
                                                               
                                                            >
                                                                <Badge className="bg-white/5 border border-white/10 text-gray-400 text-xs py-1 px-3 flex items-center gap-2 rounded-sm italic">
                                                                    {req}
                                                                    <X
                                                                        className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
                                                                        onClick={() => removeListItem("requirements", i)}
                                                                    />
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* Skills */}
                                            <div className="space-y-4">
                                                <Label className="text-xs text-primary">Skill Indexes</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Add a skill"
                                                        className="bg-black/40 border-white/10 h-10 text-xs rounded-sm"
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
                                                        className="bg-primary text-black hover:bg-primary/90 h-10 px-4 rounded-sm"
                                                        onClick={() => addListItem("skills", skillInput, setSkillInput)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-black/20 rounded-sm border border-white/5">
                                                    <AnimatePresence>
                                                        {formData.template.skills.map((skill, i) => (
                                                            <div
                                                                key={i}
                                                               
                                                               
                                                               
                                                            >
                                                                <Badge className="bg-primary/5 border border-primary/10 text-primary/80 text-xs py-1 px-3 flex items-center gap-2 rounded-sm">
                                                                    {skill}
                                                                    <X
                                                                        className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
                                                                        onClick={() => removeListItem("skills", i)}
                                                                    />
                                                                </Badge>
                                                            </div>
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
                                        <div className="w-8 h-8 rounded-full border border-[#f2f2f2]/20 flex items-center justify-center text-xs font-bold text-[#f2f2f2]">03</div>
                                        <h3 className="font-bold text-xs text-gray-400">Parametric Configuration</h3>
                                    </div>

                                    <div className="grid gap-10 md:grid-cols-2 bg-white/[0.02] border border-white/5 p-8 rounded-sm">
                                        <div className="grid gap-6">
                                            <div className="space-y-2 flex flex-col">
                                                <Label className="text-xs text-gray-500">Job type</Label>
                                                <Select
                                                    value={formData.template.jobType}
                                                    onValueChange={(v) =>
                                                        setFormData({
                                                            ...formData,
                                                            template: { ...formData.template, jobType: v },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger className="bg-black/40 border-white/10 h-11 text-xs font-bold rounded-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card border-white/10 text-white">
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
                                                <Label className="text-xs text-gray-500 flex justify-between items-center">
                                                    Seniority
                                                    <span className="text-[#f2f2f2] font-bold">{formData.template.experienceLevel} YRS</span>
                                                </Label>
                                                <Input
                                                    type="number"
                                                    className="bg-black/40 border-white/10 h-11 font-bold text-sm focus:border-[#f2f2f2]/50 rounded-sm"
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
                                                    className="data-[state=checked]:bg-[#f2f2f2]"
                                                />
                                                <div className="flex flex-col">
                                                    <Label className="text-xs font-bold">Remote Node Access</Label>
                                                    <span className="text-xs text-gray-600"></span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 bg-primary/5 h-16 border border-primary/10 px-6 rounded-sm">
                                                <TrendingUp className="w-5 h-5 text-primary/50" />
                                                <div className="flex flex-col">
                                                    <Label className="text-xs font-bold text-primary/80">Salary Range Calibration</Label>
                                                    <span className="text-xs text-gray-600"></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 z-30 bg-card/95 border-t border-white/10 p-6 flex justify-end gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    className="border-white/10 text-gray-500 text-xs h-12 px-10 rounded-sm hover:text-white transition-colors"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    className="bg-[#f2f2f2] text-black hover:bg-[#f2f2f2]/90 font-bold px-12 h-12 rounded-sm"
                                >
                                    {editingTemplate ? "Save" : "Create template"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>

            <style>{`
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
    <div
       
       
       
        className="group relative"
    >
        <Card className="bg-card/80 border border-white/10 group-hover:border-[#f2f2f2]/30 transition-all rounded-sm overflow-hidden h-full flex flex-col">
            {/* Corner Accent */}

            <CardHeader className="pb-3 px-5">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors truncate">
                            {template.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="bg-[#f2f2f2]/5 border-[#f2f2f2]/20 text-[#f2f2f2] text-xs rounded-sm h-4">
                                {template.category.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                {template.isPublic ? (
                                    <Globe className="h-3 w-3 text-cyan-500" />
                                ) : (
                                    <Lock className="h-3 w-3 text-gray-600" />
                                )}
                                {template.isPublic ? "Shared" : "Private"}
                            </div>
                        </div>
                    </div>
                    {template.isOfficial ? (
                        <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-sm flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center group-hover:bg-[#f2f2f2]/10 transition-colors">
                            <LayoutTemplate className="w-5 h-5 text-gray-400 group-hover:text-[#f2f2f2]" />
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-5 flex-1 flex flex-col">
                <div className="mb-4">
                    <p className="text-xs font-bold text-[#f2f2f2]/70 mb-1">Target Role:</p>
                    <p className="font-medium text-gray-200 line-clamp-1">{template.template?.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-2 leading-relaxed">
                        {template.template?.description}
                    </p>
                </div>

                {template.template?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                        {template.template.skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs h-4 border-white/5 text-gray-400">
                                {skill}
                            </Badge>
                        ))}
                        {template.template.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs h-4 border-white/5 text-gray-500">
                                +{template.template.skills.length - 3} MORE
                            </Badge>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <TrendingUp className="h-3 w-3" />
                            <span>{template.usageCount || 0} DEPLOYMENTS</span>
                        </div>

                        <div className="flex gap-1">
                            {showActions && (
                                <>
                                    <Button size="sm" variant="outline" className="border-white/10 hover:border-[#f2f2f2]/30 h-8 w-8 p-0" onClick={onEdit}>
                                        <Edit className="h-3.5 w-3.5 text-gray-400" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-white/10 hover:border-red-500/30 h-8 w-8 p-0" onClick={onDelete}>
                                        <Trash2 className="h-3.5 w-3.5 text-red-500/70" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <Button size="sm" onClick={onUse} className="w-full bg-[#f2f2f2] text-black hover:bg-[#f2f2f2]/90 rounded-sm font-bold text-xs gap-2 h-9">
                        <Copy className="h-3.5 w-3.5" />
                        Post a job from this
                    </Button>
                </div>

                {showCompany && template.company && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-white/5 rounded-sm flex items-center justify-center border border-white/10 text-xs font-bold text-gray-500">
                            {template.company.name.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-600 truncate">
                            AUTHOR: {template.company.name}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
);

export default JobTemplateManager;
