import React, { useState, useEffect, useRef } from "react";
import api from "@/utils/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot,
    Send,
    Loader2,
    MessageCircle,
    Target,
    Sparkles,
    ChevronRight,
    Plus,
    Clock,
    Star,
    X,
    Zap,
    Brain,
    TrendingUp,
    Briefcase,
    FileText,
    Users,
    Search,
    GraduationCap,
    Trash2,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const TOPICS = [
    { id: "resume", label: "Resume Tips", icon: FileText, color: "from-blue-500 to-cyan-600", bgColor: "bg-blue-500" },
    { id: "interview", label: "Interview Prep", icon: Target, color: "from-purple-500 to-pink-600", bgColor: "bg-purple-500" },
    { id: "career_path", label: "Career Path", icon: TrendingUp, color: "from-green-500 to-emerald-600", bgColor: "bg-green-500" },
    { id: "salary", label: "Salary Negotiation", icon: Briefcase, color: "from-amber-500 to-orange-600", bgColor: "bg-amber-500" },
    { id: "skills", label: "Skills Development", icon: GraduationCap, color: "from-rose-500 to-red-600", bgColor: "bg-rose-500" },
    { id: "job_search", label: "Job Search", icon: Search, color: "from-indigo-500 to-violet-600", bgColor: "bg-indigo-500" },
];

const QUICK_PROMPTS = [
    "How can I improve my resume?",
    "What are common interview questions?",
    "How do I negotiate a higher salary?",
    "What skills should I learn in 2026?",
];

const AICareerCoach = () => {
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [deletingSession, setDeletingSession] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await api.get("/career-coach/sessions");
            setSessions(res.data.sessions || []);
        } catch (error) {
            console.error("Fetch sessions error:", error);
        } finally {
            setLoading(false);
        }
    };

    const startNewSession = async (topic) => {
        try {
            setLoading(true);
            const res = await api.post("/career-coach/start", { topic });
            setActiveSession(res.data.session);
            setMessages(res.data.session.messages || []);
            fetchSessions();
        } catch (error) {
            toast.error("Failed to start session");
        } finally {
            setLoading(false);
        }
    };

    const loadSession = async (sessionId) => {
        try {
            setLoading(true);
            const res = await api.get(`/career-coach/sessions/${sessionId}`);
            setActiveSession(res.data.session);
            setMessages(res.data.session.messages || []);
        } catch (error) {
            toast.error("Failed to load session");
        } finally {
            setLoading(false);
        }
    };

    const deleteSession = async (sessionId, e) => {
        e.stopPropagation();
        if (!confirm("Delete this session?")) return;

        try {
            setDeletingSession(sessionId);
            await api.delete(`/career-coach/sessions/${sessionId}`);
            setSessions(prev => prev.filter(s => s._id !== sessionId));
            if (activeSession?._id === sessionId) {
                setActiveSession(null);
                setMessages([]);
            }
            toast.success("Session deleted");
        } catch (error) {
            toast.error("Failed to delete session");
        } finally {
            setDeletingSession(null);
        }
    };

    const sendMessage = async (customMessage = null) => {
        const messageToSend = customMessage || input.trim();
        if (!messageToSend || !activeSession) return;

        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: messageToSend }]);
        setSending(true);

        try {
            const res = await api.post("/career-coach/message", {
                sessionId: activeSession._id,
                message: messageToSend
            });
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: res.data.message },
            ]);
        } catch (error) {
            toast.error("Failed to send message");
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getTopicInfo = (topicId) => {
        return TOPICS.find(t => t.id === topicId) || TOPICS[0];
    };

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 h-[calc(100vh-80px)] flex flex-col">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        AI Career Coach
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Get personalized career advice powered by AI
                    </p>
                </div>
                {activeSession && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setActiveSession(null); setMessages([]); }}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        New
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
                {/* Sidebar - Hidden on mobile when session active */}
                <div className={`lg:col-span-1 flex flex-col gap-3 overflow-hidden ${activeSession ? 'hidden lg:flex' : 'flex'}`}>
                    {/* Quick Start Topics */}
                    <Card className="flex-shrink-0">
                        <CardHeader className="pb-2 pt-3 px-3">
                            <CardTitle className="text-xs font-medium flex items-center gap-2">
                                <Zap className="h-3 w-3 text-primary" />
                                Quick Start
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                            {TOPICS.map((topic) => {
                                const Icon = topic.icon;
                                return (
                                    <Button
                                        key={topic.id}
                                        variant="outline"
                                        size="sm"
                                        className="h-auto py-2 px-2 flex flex-col items-center gap-1 hover:border-primary/50 transition-all"
                                        onClick={() => startNewSession(topic.id)}
                                    >
                                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${topic.color} flex items-center justify-center`}>
                                            <Icon className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-[10px] text-center leading-tight">{topic.label}</span>
                                    </Button>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Recent Sessions */}
                    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
                            <CardTitle className="text-xs font-medium flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                Recent
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden px-3 pb-3">
                            <ScrollArea className="h-full">
                                {sessions.length === 0 ? (
                                    <div className="text-center py-4">
                                        <MessageCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">No sessions yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {sessions.map((session) => {
                                            const topicInfo = getTopicInfo(session.topic);
                                            const Icon = topicInfo.icon;
                                            return (
                                                <button
                                                    key={session._id}
                                                    onClick={() => loadSession(session._id)}
                                                    className={`w-full group text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${activeSession?._id === session._id
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${topicInfo.color} flex items-center justify-center flex-shrink-0`}>
                                                        <Icon className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {session.title || session.topic.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {new Date(session.updatedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => deleteSession(session._id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                                                    >
                                                        {deletingSession === session._id ? (
                                                            <Loader2 className="w-3 h-3 text-destructive animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3 h-3 text-destructive" />
                                                        )}
                                                    </button>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Chat Area - Full width on mobile when session active */}
                <Card className={`flex flex-col min-h-0 overflow-hidden ${activeSession ? 'col-span-1 lg:col-span-3' : 'lg:col-span-3'}`}>
                    {!activeSession ? (
                        // Welcome Screen
                        <CardContent className="flex-1 flex flex-col items-center justify-center py-12">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center max-w-lg"
                            >
                                {/* AI Avatar */}
                                <div className="relative w-20 h-20 mx-auto mb-6">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
                                    <div className="absolute inset-1 rounded-xl bg-background flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-primary" />
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold mb-2">
                                    Your AI Career Coach
                                </h2>
                                <p className="text-muted-foreground mb-8">
                                    Get personalized career advice, interview preparation, resume feedback, and salary negotiation tips.
                                </p>

                                {/* Feature Cards */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
                                    {TOPICS.slice(0, 3).map((topic) => {
                                        const Icon = topic.icon;
                                        return (
                                            <Button
                                                key={topic.id}
                                                variant="outline"
                                                className="h-auto py-3 sm:py-4 flex flex-col gap-1 sm:gap-2 hover:border-primary/50 group"
                                                onClick={() => startNewSession(topic.id)}
                                            >
                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${topic.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                                </div>
                                                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{topic.label}</span>
                                            </Button>
                                        );
                                    })}
                                </div>

                                {/* Quick Prompts */}
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Or try asking...</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {QUICK_PROMPTS.map((prompt, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-primary/10 transition-all text-xs py-1.5 px-3"
                                            onClick={() => {
                                                startNewSession("career_path").then(() => {
                                                    setTimeout(() => sendMessage(prompt), 500);
                                                });
                                            }}
                                        >
                                            {prompt}
                                        </Badge>
                                    ))}
                                </div>
                            </motion.div>
                        </CardContent>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <CardHeader className="border-b pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getTopicInfo(activeSession.topic).color} flex items-center justify-center`}>
                                            {React.createElement(getTopicInfo(activeSession.topic).icon, { className: "w-5 h-5 text-white" })}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">
                                                {activeSession.title || activeSession.topic.replace(/_/g, ' ')}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                {activeSession.topic} • {messages.length} messages
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">{activeSession.topic}</Badge>
                                </div>
                            </CardHeader>

                            {/* Messages */}
                            <ScrollArea className="flex-1 px-3 sm:px-6 py-4">
                                <div className="space-y-4 max-w-3xl mx-auto">
                                    <AnimatePresence>
                                        {messages.map((msg, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                            >
                                                {msg.role === "assistant" && (
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 flex-shrink-0 mt-1 shadow-md">
                                                        <Brain className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-sm ${msg.role === "user"
                                                        ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-md shadow-violet-500/20"
                                                        : "bg-card border border-border rounded-bl-md"
                                                        }`}
                                                >
                                                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "text-white" : "text-foreground"}`}>{msg.content}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Typing Indicator */}
                                    {sending && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-start gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                                <Brain className="w-4 h-4 text-white animate-pulse" />
                                            </div>
                                            <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="p-4 border-t">
                                {/* Quick Prompt Chips */}
                                {messages.length <= 1 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {QUICK_PROMPTS.slice(0, 2).map((prompt, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary/10 transition-all text-xs py-1 px-2.5"
                                                onClick={() => sendMessage(prompt)}
                                            >
                                                {prompt}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Input
                                        placeholder="Ask anything about your career..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={sending}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={() => sendMessage()}
                                        disabled={!input.trim() || sending}
                                    >
                                        {sending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AICareerCoach;
