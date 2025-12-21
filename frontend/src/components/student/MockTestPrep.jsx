import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  ArrowRight,
  Trophy,
  RefreshCw,
  BookOpen,
  Target,
  Zap,
  Award,
  AlertCircle,
  ChevronRight,
  Timer,
  HelpCircle,
  Star,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const MockTestPrep = () => {
  const [mode, setMode] = useState("select"); // select, test, result
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("technical");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(10);

  const [test, setTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState(null);

  const timerRef = useRef(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Timer effect
  useEffect(() => {
    if (mode === "test" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [mode, timeLeft]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/practice/categories`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (error) {
      console.error("Fetch categories error:", error);
      // Fallback categories
      setCategories([
        {
          id: "technical",
          name: "Programming & Technical",
          topics: ["JavaScript", "React", "Python", "SQL"],
        },
        {
          id: "hr",
          name: "HR & Behavioral",
          topics: ["Behavioral", "Situational", "Leadership"],
        },
        {
          id: "aptitude",
          name: "Aptitude & Reasoning",
          topics: ["Logical", "Quantitative", "Verbal"],
        },
      ]);
    }
  };

  const generateTest = async () => {
    setLoading(true);
    setLoadingMessage("🤖 Connecting to AI...");

    // Simulate progress messages
    const messages = [
      "🧠 AI is generating interview questions...",
      "📝 Creating challenging scenarios...",
      "✨ Preparing real-world problems...",
      "🎯 Finalizing your personalized test...",
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
      const res = await axios.post(
        `${API_BASE}/practice/mcq/generate`,
        {
          category: selectedCategory,
          topic: selectedTopic,
          difficulty,
          questionCount,
          timeLimit: questionCount * 1.5, // 1.5 min per question
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        setTest(res.data.test);
        setTimeLeft(res.data.test.timeLimit * 60);
        setCurrentQuestion(0);
        setAnswers({});
        setMode("test");
        toast.success("🎉 AI-generated test ready! Good luck!");
      }
    } catch (error) {
      console.error("Generate test error:", error);
      toast.error(error.response?.data?.message || "Failed to generate test");
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/practice/mcq/submit`,
        {
          testId: test.testId,
          answers,
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        setResult(res.data.result);
        setMode("result");
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit test");
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    setMode("select");
    setTest(null);
    setResult(null);
    setAnswers({});
    setCurrentQuestion(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith("A")) return "text-[#00FF94]";
    if (grade === "B") return "text-[#FFD700]";
    if (grade === "C") return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            Mock Test Prep
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            AI-generated practice tests powered by Gemini
          </p>
        </div>
        {mode !== "select" && (
          <Button
            onClick={resetTest}
            variant="outline"
            className="border-white/10 text-gray-400 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Test
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Test Selection */}
        {mode === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Category Selection */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-6">
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block font-mono">
                Select Category
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedTopic(null);
                    }}
                    className={`p-4 rounded-sm border transition-all text-left ${
                      selectedCategory === cat.id
                        ? "bg-[#FFD700]/10 border-[#FFD700]/50 text-white"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <div className="font-medium text-sm">{cat.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cat.topics?.slice(0, 3).join(", ")}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selection */}
            {selectedCategory && (
              <div className="bg-[#111111] border border-white/10 rounded-md p-6">
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block font-mono">
                  Select Topic (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    onClick={() => setSelectedTopic(null)}
                    className={`cursor-pointer ${
                      !selectedTopic
                        ? "bg-[#FFD700] text-black"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Random
                  </Badge>
                  {categories
                    .find((c) => c.id === selectedCategory)
                    ?.topics?.map((topic) => (
                      <Badge
                        key={topic}
                        onClick={() => setSelectedTopic(topic)}
                        className={`cursor-pointer ${
                          selectedTopic === topic
                            ? "bg-[#FFD700] text-black"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        {topic}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Difficulty & Question Count */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#111111] border border-white/10 rounded-md p-6">
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block font-mono">
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {["easy", "medium", "hard"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-3 rounded-sm border text-sm font-medium capitalize transition-all ${
                        difficulty === d
                          ? d === "easy"
                            ? "bg-green-500/10 border-green-500/50 text-green-400"
                            : d === "medium"
                              ? "bg-[#FFD700]/10 border-[#FFD700]/50 text-[#FFD700]"
                              : "bg-red-500/10 border-red-500/50 text-red-400"
                          : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-md p-6">
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block font-mono">
                  Questions: {questionCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full accent-[#FFD700]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>5 (Quick)</span>
                  <span>20 (Full)</span>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={generateTest}
              disabled={loading}
              className="w-full py-6 bg-[#FFD700] text-black hover:bg-[#FFE44D] font-bold text-sm uppercase tracking-wider"
            >
              {loading ? (
                <motion.div
                  className="flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {loadingMessage || "Generating Questions..."}
                </motion.div>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Practice Test
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Test Mode */}
        {mode === "test" && test && (
          <motion.div
            key="test"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Timer & Progress */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                    {test.topic || test.category}
                  </Badge>
                  <span className="text-gray-500 text-sm">
                    Question {currentQuestion + 1} of {test.questions.length}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 font-mono text-lg ${
                    timeLeft < 60 ? "text-red-400" : "text-white"
                  }`}
                >
                  <Timer className="w-5 h-5" />
                  {formatTime(timeLeft)}
                </div>
              </div>
              <Progress
                value={
                  (Object.keys(answers).length / test.questions.length) * 100
                }
                className="h-2 bg-white/10"
              />
            </div>

            {/* Question Card */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-[#FFD700]/30" />

              <div className="mb-6">
                <span className="text-[#FFD700] text-xs uppercase tracking-wider font-mono">
                  Question {currentQuestion + 1}
                </span>
                <h3 className="text-xl text-white font-medium mt-2">
                  {test.questions[currentQuestion]?.question}
                </h3>
              </div>

              <div className="space-y-3">
                {test.questions[currentQuestion]?.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      handleAnswer(test.questions[currentQuestion].id, idx)
                    }
                    className={`w-full p-4 rounded-sm border text-left transition-all ${
                      answers[test.questions[currentQuestion].id] === idx
                        ? "bg-[#FFD700]/10 border-[#FFD700]/50 text-white"
                        : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-white/10 text-xs mr-3 font-mono">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                onClick={() =>
                  setCurrentQuestion((prev) => Math.max(0, prev - 1))
                }
                disabled={currentQuestion === 0}
                variant="outline"
                className="border-white/10 text-gray-400"
              >
                Previous
              </Button>

              <div className="flex gap-1">
                {test.questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-8 h-8 rounded-sm text-xs font-mono transition-all ${
                      currentQuestion === idx
                        ? "bg-[#FFD700] text-black"
                        : answers[test.questions[idx]?.id] !== undefined
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-white/5 text-gray-500 border border-white/10"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {currentQuestion < test.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion((prev) => prev + 1)}
                  className="bg-[#FFD700] text-black hover:bg-[#FFE44D]"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-green-500 text-white hover:bg-green-600"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Submit Test"
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Results Mode */}
        {mode === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-[#FFD700]/30" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-[#FFD700]/30" />

              <Trophy
                className={`w-16 h-16 mx-auto mb-4 ${
                  result.passed ? "text-[#FFD700]" : "text-gray-500"
                }`}
              />

              <div
                className={`text-6xl font-bold font-mono mb-2 ${getGradeColor(result.grade)}`}
              >
                {result.score}%
              </div>

              <Badge
                className={`text-lg px-4 py-1 ${
                  result.passed
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                Grade: {result.grade} |{" "}
                {result.passed ? "Passed!" : "Keep Practicing"}
              </Badge>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-white/5 rounded-sm">
                  <div className="text-2xl font-bold text-[#00FF94]">
                    {result.correctAnswers}
                  </div>
                  <div className="text-xs text-gray-500">Correct</div>
                </div>
                <div className="p-4 bg-white/5 rounded-sm">
                  <div className="text-2xl font-bold text-red-400">
                    {result.totalQuestions - result.correctAnswers}
                  </div>
                  <div className="text-xs text-gray-500">Wrong</div>
                </div>
                <div className="p-4 bg-white/5 rounded-sm">
                  <div className="text-2xl font-bold text-white font-mono">
                    {formatTime(result.timeTaken)}
                  </div>
                  <div className="text-xs text-gray-500">Time Taken</div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FFD700]" />
                Review Answers
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {result.detailedResults?.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-sm border ${
                      q.isCorrect
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {q.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium mb-2">
                          {idx + 1}. {q.question}
                        </p>
                        <div className="text-xs space-y-1">
                          <p className="text-green-400">
                            ✓ Correct: {q.options[q.correctAnswer]}
                          </p>
                          {!q.isCorrect && q.userAnswer !== null && (
                            <p className="text-red-400">
                              ✗ Your answer: {q.options[q.userAnswer]}
                            </p>
                          )}
                          {q.explanation && (
                            <p className="text-gray-500 mt-2 italic">
                              💡 {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Try Again */}
            <Button
              onClick={resetTest}
              className="w-full py-6 bg-[#FFD700] text-black hover:bg-[#FFE44D] font-bold"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Take Another Test
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockTestPrep;
