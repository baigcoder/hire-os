import React, { useState, useEffect, useRef } from "react";
import api from "@/utils/api";
import { toast } from "sonner";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const TOPICS = [
    { id: "resume", label: "Resume Tips", icon: "📄" },
    { id: "interview", label: "Interview Prep", icon: "🎯" },
    { id: "career_path", label: "Career Path", icon: "🚀" },
    { id: "salary", label: "Salary Negotiation", icon: "💰" },
    { id: "skills", label: "Skills Development", icon: "📚" },
    { id: "job_search", label: "Job Search", icon: "🔍" },
];

const AICareerCoach = () => {
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
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

    const sendMessage = async () => {
        if (!input.trim() || !activeSession) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setSending(true);

        try {
            const res = await api.post("/career-coach/message", {
                sessionId: activeSession._id,
                message: userMessage
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

    return (
        <div className="flex flex-col lg:flex-row gap-4 min-h-[500px] lg:h-[calc(100vh-200px)]">
            {/* Sidebar - Collapsible on mobile */}
            <Card className="w-full lg:w-72 lg:flex-shrink-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bot className="h-5 w-5 text-primary" />
                        AI Career Coach
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* New Session Options */}
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            Start New Session
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {TOPICS.map((topic) => (
                                <Button
                                    key={topic.id}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs justify-start"
                                    onClick={() => startNewSession(topic.id)}
                                >
                                    <span className="mr-1">{topic.icon}</span>
                                    {topic.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Previous Sessions */}
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            Recent Sessions
                        </p>
                        <ScrollArea className="h-48">
                            {sessions.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    No previous sessions
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {sessions.map((session) => (
                                        <button
                                            key={session._id}
                                            onClick={() => loadSession(session._id)}
                                            className={`w-full text-left p-2 rounded-md text-xs hover:bg-muted transition-colors ${activeSession?._id === session._id ? "bg-muted" : ""
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <MessageCircle className="h-3 w-3 text-muted-foreground" />
                                                <span className="truncate">
                                                    {session.title || session.topic}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {new Date(session.updatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
                {!activeSession ? (
                    <CardContent className="flex-1 flex flex-col items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">Your AI Career Coach</h3>
                            <p className="text-muted-foreground max-w-md">
                                Get personalized career advice, interview tips, resume feedback,
                                and guidance on your professional journey.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {TOPICS.slice(0, 3).map((topic) => (
                                    <Button
                                        key={topic.id}
                                        variant="outline"
                                        onClick={() => startNewSession(topic.id)}
                                    >
                                        <span className="mr-2">{topic.icon}</span>
                                        {topic.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                ) : (
                    <>
                        {/* Header */}
                        <CardHeader className="pb-2 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    {activeSession.title || activeSession.topic}
                                </CardTitle>
                                <Badge variant="secondary">{activeSession.topic}</Badge>
                            </div>
                        </CardHeader>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-3 rounded-lg ${msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {sending && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted p-3 rounded-lg">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-4 border-t">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ask anything about your career..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={sending}
                                    className="flex-1"
                                />
                                <Button onClick={sendMessage} disabled={!input.trim() || sending}>
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
    );
};

export default AICareerCoach;
