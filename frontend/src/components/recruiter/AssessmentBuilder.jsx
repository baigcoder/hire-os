import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../shared/Navbar";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Send,
  Globe,
  Lock,
  Code,
  CheckCircle,
  Timer,
  Award,
  Activity,
  Box,
  FolderPlus,
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
import { Progress } from "@/components/ui/progress";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORIES = [
    { value: "all", label: "All" },
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "react", label: "React" },
    { value: "nodejs", label: "Node.js" },
    { value: "sql", label: "SQL" },
    { value: "data_structures", label: "Data Structures" },
    { value: "algorithms", label: "Algorithms" },
    { value: "system_design", label: "System Design" },
    { value: "aptitude", label: "Aptitude" },
    { value: "general", label: "General" },
];

const AssessmentBuilder = () => {
    const [assessments, setAssessments] = useState([]);
    const [publicAssessments, setPublicAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState("company");
    const [editingAssessment, setEditingAssessment] = useState(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "mixed",
        category: "general",
        duration: 60,
        passingScore: 60,
        isPublic: false,
        questions: [],
        proctoring: { enabled: false, webcamRequired: false, tabSwitchLimit: 3 },
    });

    const [currentQuestion, setCurrentQuestion] = useState({
        type: "mcq",
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 10,
        difficulty: "medium",
    });

    useEffect(() => {
        fetchAssessments();
    }, [categoryFilter, activeTab]);

    const fetchAssessments = async () => {
        try {
            setLoading(true);
            const params = categoryFilter !== "all" ? { category: categoryFilter } : {};

            if (activeTab === "company") {
                const res = await axios.get(`${API_URL}/api/v1/assessments`, {
                    params,
                    withCredentials: true,
                });
                setAssessments(res.data.assessments || []);
            } else {
                const res = await axios.get(`${API_URL}/api/v1/assessments/library`, {
                    params,
                    withCredentials: true,
                });
                setPublicAssessments(res.data.assessments || []);
            }
        } catch (error) {
            console.error("Error fetching assessments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.title || formData.questions.length === 0) {
            toast.error("Add a title and at least one question");
            return;
        }

        try {
            if (editingAssessment) {
                await axios.put(
                    `${API_URL}/api/v1/assessments/${editingAssessment._id}`,
                    formData,
                    { withCredentials: true }
                );
                toast.success("Assessment updated");
            } else {
                await axios.post(`${API_URL}/api/v1/assessments`, formData, {
                    withCredentials: true,
                });
                toast.success("Assessment created");
            }
            setShowCreateModal(false);
            resetForm();
            fetchAssessments();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this assessment?")) return;
        try {
            await axios.delete(`${API_URL}/api/v1/assessments/${id}`, {
                withCredentials: true,
            });
            toast.success("Assessment deleted");
            fetchAssessments();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const addQuestion = () => {
        if (!currentQuestion.question) {
            toast.error("Enter question text");
            return;
        }
        setFormData({
            ...formData,
            questions: [...formData.questions, { ...currentQuestion }],
        });
        setCurrentQuestion({
            type: "mcq",
            question: "",
            options: ["", "", "", ""],
            correctAnswer: 0,
            points: 10,
            difficulty: "medium",
        });
        toast.success("Question added");
    };

    const removeQuestion = (index) => {
        setFormData({
            ...formData,
            questions: formData.questions.filter((_, i) => i !== index),
        });
    };

    const resetForm = () => {
        setEditingAssessment(null);
        setFormData({
            title: "",
            description: "",
            type: "mixed",
            category: "general",
            duration: 60,
            passingScore: 60,
            isPublic: false,
            questions: [],
            proctoring: { enabled: false, webcamRequired: false, tabSwitchLimit: 3 },
        });
    };

    const startEdit = (assessment) => {
        setEditingAssessment(assessment);
        setFormData({
            title: assessment.title,
            description: assessment.description || "",
            type: assessment.type,
            category: assessment.category,
            duration: assessment.duration,
            passingScore: assessment.passingScore,
            isPublic: assessment.isPublic,
            questions: assessment.questions || [],
            proctoring: assessment.proctoring || {},
        });
        setShowCreateModal(true);
    };

    const displayAssessments = activeTab === "company" ? assessments : publicAssessments;
    const filtered = displayAssessments.filter((a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPoints = formData.questions.reduce((s, q) => s + (q.points || 0), 0);

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
                    <h1 className="app-h1">Assessments</h1>
                    <button type="button" className="app-btn app-btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
                        New assessment
                    </button>
                </div>

                
{/* Filters & Tabs Section */}
                <div className="bg-card/80 border border-white/10 rounded-sm p-4 mb-8">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <TabsList className="bg-black/40 border border-white/5 p-1 rounded-sm h-11">
                                <TabsTrigger
                                    value="company"
                                    className="rounded-sm data-[state=active]:bg-[#f2f2f2] data-[state=active]:text-black text-xs font-bold py-2 px-6"
                                >
                                    Yours
                                </TabsTrigger>
                                <TabsTrigger
                                    value="library"
                                    className="rounded-sm data-[state=active]:bg-[#f2f2f2] data-[state=active]:text-black text-xs font-bold py-2 px-6"
                                >
                                    Shared
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search assessments"
                                        className="pl-10 bg-black/40 border-white/10 text-white text-xs rounded-sm focus:border-[#f2f2f2]/50 h-11"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-48 bg-black/40 border-white/10 text-xs rounded-sm h-11">
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-3 h-3 text-[#f2f2f2]" />
                                            <SelectValue placeholder="Category" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-white/10 text-white">
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c.value} value={c.value} className="text-xs">
                                                {c.label.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <TabsContent value="company" className="mt-8 border-none p-0 outline-none">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <div className="w-10 h-10 border-2 border-[#f2f2f2]/20 border-t-[#f2f2f2] rounded-full animate-spin mb-4" />
                                        <p className="text-gray-500 text-xs">
                                            Loading…
                                        </p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div
                                       
                                       
                                        className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-white/5 border-dashed rounded-sm"
                                    >
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                            <FolderPlus className="h-8 w-8 text-gray-700" />
                                        </div>
                                        <h3 className="text-gray-300 font-bold mb-2">
                                            No assessments yet
                                        </h3>
                                        <p className="text-gray-600 text-xs max-w-xs text-center mb-6">
                                            
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="border-white/10 text-gray-500 hover:text-[#f2f2f2] hover:border-[#f2f2f2]/30 rounded-sm text-xs"
                                            onClick={() => {
                                                resetForm();
                                                setShowCreateModal(true);
                                            }}
                                        >
                                            New assessment
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filtered.map((a, idx) => (
                                            <AssessmentCard
                                                key={a._id}
                                                assessment={a}
                                                onEdit={() => startEdit(a)}
                                                onDelete={() => handleDelete(a._id)}
                                                showActions
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="library" className="mt-8 border-none p-0 outline-none">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <div className="w-10 h-10 border-2 border-[#f2f2f2]/20 border-t-[#f2f2f2] rounded-full animate-spin mb-4" />
                                        <p className="text-gray-500 text-xs">
                                            Loading…
                                        </p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-white/5 border-dashed rounded-sm">
                                        <Globe className="h-12 w-12 text-gray-800 mb-4" />
                                        <p className="text-gray-500 text-sm">
                                            Nothing matches
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filtered.map((a) => (
                                            <AssessmentCard key={a._id} assessment={a} showCompany />
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
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-white/10 text-white custom-scrollbar">

                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                    <Activity className="w-6 h-6 text-[#f2f2f2]" />
                                    {editingAssessment ? "Edit assessment" : "New assessment"}
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 text-xs">
                                    {editingAssessment ? "" : ""}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-8 py-6">
                                {/* Basic Config */}
                                <div className="grid gap-6 md:grid-cols-2 bg-white/[0.02] border border-white/5 p-6 rounded-sm">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-500">Assessment Title *</Label>
                                        <Input
                                            placeholder="Backend fundamentals"
                                            className="bg-black/40 border-white/10 font-bold text-sm h-11 focus:border-[#f2f2f2]/50"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-500">Category Index</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(v) => setFormData({ ...formData, category: v })}
                                        >
                                            <SelectTrigger className="bg-black/40 border-white/10 text-xs h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-white/10 text-white">
                                                {CATEGORIES.slice(1).map((c) => (
                                                    <SelectItem key={c.value} value={c.value} className="text-xs">
                                                        {c.label.toUpperCase()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs text-gray-500">Strategic Description</Label>
                                        <Textarea
                                            placeholder=""
                                            className="bg-black/40 border-white/10 text-xs focus:border-[#f2f2f2]/50"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                {/* Performance Parameters */}
                                <div className="grid gap-6 md:grid-cols-3 bg-white/[0.02] border border-white/5 p-6 rounded-sm">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                                            <Timer className="w-3 h-3" /> Duration (Min)
                                        </Label>
                                        <Input
                                            type="number"
                                            className="bg-black/40 border-white/10 font-bold h-11 focus:border-[#f2f2f2]/50"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                                            <Award className="w-3 h-3" /> Passing Threshold (%)
                                        </Label>
                                        <Input
                                            type="number"
                                            className="bg-black/40 border-white/10 font-bold h-11 focus:border-primary/50 text-primary"
                                            value={formData.passingScore}
                                            onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 60 })}
                                        />
                                    </div>
                                    <div className="flex flex-col justify-center gap-2">
                                        <Label className="text-xs text-gray-500">Share with other companies</Label>
                                        <div className="flex items-center gap-3 bg-black/40 h-11 border border-white/10 px-4 rounded-sm">
                                            <Switch
                                                checked={formData.isPublic}
                                                onCheckedChange={(v) => setFormData({ ...formData, isPublic: v })}
                                                className="data-[state=checked]:bg-[#f2f2f2]"
                                            />
                                            <span className="text-xs text-gray-400">
                                                {formData.isPublic ? "On" : "Off"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Questions Workspace */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                        <h3 className="font-bold text-sm flex items-center gap-2">
                                            <Code className="w-4 h-4 text-[#f2f2f2]" />
                                            Questions
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs">
                                            <span className="text-gray-500">COUNT: <span className="text-white">{formData.questions.length}</span></span>
                                            <span className="text-gray-500">Total <span className="text-[#f2f2f2]">{totalPoints} points</span></span>
                                        </div>
                                    </div>

                                    {/* List of Questions */}
                                    <div className="space-y-3">
                                        {formData.questions.map((q, i) => (
                                            <div
                                                key={i}
                                               
                                               
                                               
                                                className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-sm group hover:border-white/20 transition-all"
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-white/5 rounded-sm text-xs font-bold text-gray-400">
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-200 truncate">{q.question}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-xs h-4 border-white/10 text-gray-500">{q.type}</Badge>
                                                            <Badge variant="outline" className="text-xs h-4 border-[#f2f2f2]/20 text-[#f2f2f2]">{q.difficulty}</Badge>
                                                            <span className="text-xs text-gray-600">{q.points} PTS</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                                                    onClick={() => removeQuestion(i)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add New Question Form */}
                                    <div className="bg-black/40 border border-white/10 p-6 rounded-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#f2f2f2]/30" />
                                        <h4 className="text-xs text-gray-500 mb-4">Add a question</h4>

                                        <div className="grid gap-4 md:grid-cols-2 mb-4">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-gray-600">Type</Label>
                                                        <Select
                                                            value={currentQuestion.type}
                                                            onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, type: v })}
                                                        >
                                                            <SelectTrigger className="bg-card border-white/5 h-9 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-white/10 text-white">
                                                                <SelectItem value="mcq">Multiple choice</SelectItem>
                                                                <SelectItem value="code">Code</SelectItem>
                                                                <SelectItem value="text">Written</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-gray-600">Difficulty</Label>
                                                        <Select
                                                            value={currentQuestion.difficulty}
                                                            onValueChange={(v) => setCurrentQuestion({ ...currentQuestion, difficulty: v })}
                                                        >
                                                            <SelectTrigger className="bg-card border-white/5 h-9 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-white/10 text-white">
                                                                <SelectItem value="easy">Easy</SelectItem>
                                                                <SelectItem value="medium">Medium</SelectItem>
                                                                <SelectItem value="hard">Hard</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-gray-600 text-center">Weighting (Points)</Label>
                                                    <Input
                                                        type="number"
                                                        className="bg-card border-white/5 h-9 text-xs font-bold focus:border-[#f2f2f2]/30"
                                                        value={currentQuestion.points}
                                                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 10 })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-gray-600">Question Prompt</Label>
                                                    <Textarea
                                                        placeholder="Question"
                                                        className="bg-card border-white/5 text-xs focus:border-[#f2f2f2]/30 h-[100px]"
                                                        value={currentQuestion.question}
                                                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {currentQuestion.type === "mcq" && (
                                            <div className="mt-6 space-y-3 pt-6 border-t border-white/5">
                                                <Label className="text-xs text-primary/70 block mb-4">Options</Label>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {currentQuestion.options.map((opt, i) => (
                                                        <div key={i} className="flex gap-3 items-center group">
                                                            <div className="relative">
                                                                <input
                                                                    type="radio"
                                                                    name="correctAnswer"
                                                                    className="peer absolute opacity-0 w-6 h-6 cursor-pointer"
                                                                    checked={currentQuestion.correctAnswer === i}
                                                                    onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: i })}
                                                                />
                                                                <div className="w-5 h-5 rounded-sm border border-white/10 peer-checked:bg-[#f2f2f2] peer-checked:border-[#f2f2f2] transition-all flex items-center justify-center">
                                                                    {currentQuestion.correctAnswer === i && <CheckCircle className="w-3 h-3 text-black" />}
                                                                </div>
                                                            </div>
                                                            <Input
                                                                placeholder={`Option ${i + 1}`}
                                                                className="bg-card border-white/5 h-9 text-xs focus:border-[#f2f2f2]/30 flex-1"
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newOpts = [...currentQuestion.options];
                                                                    newOpts[i] = e.target.value;
                                                                    setCurrentQuestion({ ...currentQuestion, options: newOpts });
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            onClick={addQuestion}
                                            className="w-full mt-8 bg-white/5 hover:bg-[#f2f2f2]/10 border border-white/5 hover:border-[#f2f2f2]/30 text-gray-400 hover:text-[#f2f2f2] rounded-sm font-bold text-xs h-11 transition-all"
                                        >
                                            <Plus className="h-4 w-4 mr-2" /> Add question
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8 gap-3 pt-6 border-t border-white/5">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    className="border-white/10 text-gray-500 text-xs h-11 px-8 rounded-sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    className="bg-[#f2f2f2] text-black hover:bg-[#f2f2f2]/90 font-bold px-12 h-11 rounded-sm"
                                >
                                    {editingAssessment ? "Save" : "Create assessment"}
                                </Button>
                            </DialogFooter>
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

const AssessmentCard = ({ assessment, onEdit, onDelete, showActions, showCompany }) => (
    <div
       
       
       
        className="group relative"
    >
        <Card className="bg-card/80 border border-white/10 group-hover:border-[#f2f2f2]/30 transition-all rounded-sm overflow-hidden h-full flex flex-col">
            {/* Corner Accent */}

            <CardHeader className="pb-3 px-5">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors truncate">
                            {assessment.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="bg-[#f2f2f2]/5 border-[#f2f2f2]/20 text-[#f2f2f2] text-xs rounded-sm h-4">
                                {assessment.category.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                {assessment.isPublic ? (
                                    <Globe className="h-3 w-3 text-cyan-500" />
                                ) : (
                                    <Lock className="h-3 w-3 text-gray-600" />
                                )}
                                {assessment.isPublic ? "Shared" : "Private"}
                            </div>
                        </div>
                    </div>
                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center group-hover:bg-[#f2f2f2]/10 transition-colors">
                        <Code className="w-5 h-5 text-gray-400 group-hover:text-[#f2f2f2]" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-5 flex-1 flex flex-col">
                <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-white/5 mb-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                            <Timer className="w-3 h-3" /> Time
                        </p>
                        <p className="font-bold text-sm text-gray-200">{assessment.duration}m</p>
                    </div>
                    <div className="text-center border-l border-r border-white/5">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                            <Box className="w-3 h-3" /> Count
                        </p>
                        <p className="font-bold text-sm text-gray-200">
                            {assessment.questionCount || assessment.questions?.length || 0}Q
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                            <Award className="w-3 h-3" /> Pass
                        </p>
                        <p className="font-bold text-sm text-primary">{assessment.passingScore}%</p>
                    </div>
                </div>

                <div className="mt-auto pt-2">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Utilization: <span className="text-gray-300 ml-1">{assessment.usageCount || 0} SELECTIONS</span>
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-[#f2f2f2] text-black hover:bg-[#f2f2f2]/90 rounded-sm font-bold text-xs gap-2">
                            <Send className="h-3 w-3" /> ASSIGN
                        </Button>

                        {showActions && (
                            <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="border-white/10 hover:border-[#f2f2f2]/30 h-8 w-8 p-0" onClick={onEdit}>
                                    <Edit className="h-3.5 w-3.5 text-gray-400" />
                                </Button>
                                <Button size="sm" variant="outline" className="border-white/10 hover:border-red-500/30 h-8 w-8 p-0" onClick={onDelete}>
                                    <Trash2 className="h-3.5 w-3.5 text-red-500/70" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {showCompany && assessment.company && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-white/5 rounded-sm flex items-center justify-center border border-white/10">
                            <span className="text-xs font-bold text-gray-500">{assessment.company.name.charAt(0)}</span>
                        </div>
                        <span className="text-xs text-gray-600 truncate">
                            DEPLOYED BY: {assessment.company.name}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
);

export default AssessmentBuilder;
