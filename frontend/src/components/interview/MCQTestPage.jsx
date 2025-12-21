import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Timer,
  Flag,
  Send,
  Eye,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { INTERVIEW_API_END_POINT } from "@/utils/constant";
import Navbar from "../shared/Navbar";

const MCQTestPage = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Fetch test data
  useEffect(() => {
    fetchTestData();
  }, [interviewId]);

  // Timer countdown
  useEffect(() => {
    if (!testStarted || timeLeft <= 0 || testCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, timeLeft, testCompleted]);

  // Fraud detection: Tab switch monitoring
  useEffect(() => {
    if (!testStarted || testCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        reportFraudAlert("tab_switch", "Candidate switched tabs during test");
        toast.warning("⚠️ Tab switch detected! This will be reported.");
      }
    };

    const handleBlur = () => {
      reportFraudAlert("window_blur", "Window lost focus during test");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [testStarted, testCompleted]);

  // Disable right-click and copy
  useEffect(() => {
    if (!testStarted || testCompleted) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      reportFraudAlert("right_click", "Attempted right-click during test");
      return false;
    };

    const handleCopy = (e) => {
      e.preventDefault();
      reportFraudAlert("copy_paste", "Attempted to copy content during test");
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
    };
  }, [testStarted, testCompleted]);

  const fetchTestData = async () => {
    try {
      const response = await axios.get(
        `${INTERVIEW_API_END_POINT}/${interviewId}/mcq`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setTestData(response.data);
        setQuestions(response.data.questions);

        if (response.data.status === "in_progress") {
          setTestStarted(true);
          // Calculate remaining time
          const startTime = new Date(response.data.startedAt);
          const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
          const remaining = response.data.timeLimit * 60 - elapsed;
          setTimeLeft(Math.max(0, remaining));
        } else if (
          ["completed", "passed", "failed"].includes(response.data.status)
        ) {
          setTestCompleted(true);
          fetchResult();
        } else {
          setTimeLeft(response.data.timeLimit * 60);
        }
      }
    } catch (error) {
      console.error("Fetch test error:", error);
      toast.error(error.response?.data?.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const fetchResult = async () => {
    try {
      const response = await axios.get(
        `${INTERVIEW_API_END_POINT}/${interviewId}/mcq/result`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setResult(response.data.result);
      }
    } catch (error) {
      console.error("Fetch result error:", error);
    }
  };

  const startTest = async () => {
    try {
      const response = await axios.post(
        `${INTERVIEW_API_END_POINT}/${interviewId}/mcq/start`,
        {},
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setTestStarted(true);
        setTimeLeft(testData.timeLimit * 60);
        toast.success("Test started! Good luck!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start test");
    }
  };

  const reportFraudAlert = async (type, details) => {
    try {
      await axios.post(
        `${INTERVIEW_API_END_POINT}/${interviewId}/video/fraud-alert`,
        {
          type,
          details,
          severity: type === "tab_switch" ? "high" : "medium",
        },
        { withCredentials: true },
      );
    } catch (error) {
      console.error("Failed to report fraud alert:", error);
    }
  };

  const handleAnswerChange = (questionIndex, answerIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));
  };

  const handleAutoSubmit = () => {
    toast.warning("Time is up! Submitting your answers...");
    submitTest();
  };

  const submitTest = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(
        ([questionIndex, selectedAnswer]) => ({
          questionIndex: parseInt(questionIndex),
          selectedAnswer,
        }),
      );

      const response = await axios.post(
        `${INTERVIEW_API_END_POINT}/${interviewId}/mcq/submit`,
        {
          answers: formattedAnswers,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        setTestCompleted(true);
        setResult(response.data.result);

        if (response.data.result.passed) {
          toast.success("🎉 Congratulations! You passed the test!");
        } else {
          toast.error(
            "Unfortunately, you did not pass. Better luck next time!",
          );
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit test");
    } finally {
      setSubmitting(false);
      setConfirmSubmitOpen(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (currentQuestionIndex / questions.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Result Screen
  if (testCompleted && result) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card
              className={`text-center ${
                result.passed
                  ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30"
                  : "bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30"
              }`}
            >
              <CardContent className="pt-12 pb-8">
                <div
                  className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                    result.passed ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-400" />
                  )}
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">
                  {result.passed ? "Congratulations! 🎉" : "Test Completed"}
                </h1>
                <p className="text-gray-400 mb-8">
                  {result.passed
                    ? "You passed the MCQ test! Proceed to the video interview."
                    : "Unfortunately, you did not meet the passing score."}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <p className="text-4xl font-bold text-white">
                      {result.score}%
                    </p>
                    <p className="text-sm text-gray-500">Your Score</p>
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <p className="text-4xl font-bold text-green-400">
                      {result.correctAnswers}
                    </p>
                    <p className="text-sm text-gray-500">Correct</p>
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <p className="text-4xl font-bold text-red-400">
                      {result.wrongAnswers}
                    </p>
                    <p className="text-sm text-gray-500">Wrong</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-gray-400 mb-8">
                  <Clock className="w-4 h-4" />
                  <span>
                    Time taken: {Math.floor(result.timeTaken / 60)}m{" "}
                    {result.timeTaken % 60}s
                  </span>
                </div>

                {result.passed ? (
                  <Button
                    onClick={() => navigate(`/interview/live/${interviewId}`)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8"
                  >
                    Proceed to Video Interview
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/student/dashboard")}
                    variant="outline"
                    className="border-zinc-700 text-gray-300"
                  >
                    Return to Dashboard
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Start Screen
  if (!testStarted) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
                  <Brain className="w-10 h-10 text-black" />
                </div>
                <CardTitle className="text-2xl text-white">
                  MCQ Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">
                      {testData?.totalQuestions}
                    </p>
                    <p className="text-sm text-gray-500">Questions</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">
                      {testData?.timeLimit} min
                    </p>
                    <p className="text-sm text-gray-500">Time Limit</p>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">
                        Important Instructions
                      </p>
                      <ul className="text-sm text-gray-400 mt-2 space-y-1">
                        <li>• Do not switch tabs or windows during the test</li>
                        <li>• Right-click and copy are disabled</li>
                        <li>• All activities are monitored</li>
                        <li>
                          • Minimum {testData?.passingScore}% required to pass
                        </li>
                        <li>• Test will auto-submit when time expires</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={startTest}
                  className="w-full py-6 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Test
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Test Screen
  return (
    <div className="min-h-screen bg-black">
      {/* Header with timer */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className="bg-zinc-800 text-gray-300">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              <Badge className="bg-green-500/20 text-green-400">
                {answeredCount} Answered
              </Badge>
              {tabSwitchCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {tabSwitchCount} Warning{tabSwitchCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeLeft < 60
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : "bg-zinc-800 text-white"
              }`}
            >
              <Timer className="w-5 h-5" />
              <span className="text-xl font-mono font-bold">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-1" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-32 pb-32">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Badge
                      className={`${
                        currentQuestion?.difficulty === "easy"
                          ? "bg-green-500/20 text-green-400"
                          : currentQuestion?.difficulty === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {currentQuestion?.difficulty}
                    </Badge>
                    <Badge className="bg-zinc-800 text-gray-400">
                      {currentQuestion?.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-white leading-relaxed">
                    {currentQuestion?.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={answers[currentQuestionIndex]?.toString()}
                    onValueChange={(value) =>
                      handleAnswerChange(currentQuestionIndex, parseInt(value))
                    }
                    className="space-y-3"
                  >
                    {currentQuestion?.options.map((option, index) => (
                      <Label
                        key={index}
                        htmlFor={`option-${index}`}
                        className={`flex items-center p-4 rounded-xl cursor-pointer transition-all ${
                          answers[currentQuestionIndex] === index
                            ? "bg-yellow-500/20 border-2 border-yellow-500"
                            : "bg-zinc-800/50 border-2 border-zinc-700 hover:border-zinc-600"
                        }`}
                      >
                        <RadioGroupItem
                          value={index.toString()}
                          id={`option-${index}`}
                          className="mr-4"
                        />
                        <span className="text-gray-300">{option}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={() =>
                setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
              }
              disabled={currentQuestionIndex === 0}
              className="border-zinc-700 text-gray-300"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {/* Question Navigator */}
            <div className="hidden md:flex gap-1">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                    index === currentQuestionIndex
                      ? "bg-yellow-500 text-black"
                      : answers[index] !== undefined
                        ? "bg-green-500/30 text-green-400"
                        : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => setConfirmSubmitOpen(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Test
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Submit Dialog */}
      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Submit Test?</DialogTitle>
            <DialogDescription>
              You have answered {answeredCount} of {questions.length} questions.
              {answeredCount < questions.length && (
                <span className="text-yellow-400 block mt-2">
                  Warning: {questions.length - answeredCount} question(s) are
                  unanswered!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSubmitOpen(false)}
              className="border-zinc-700 text-gray-300"
            >
              Review Answers
            </Button>
            <Button
              onClick={submitTest}
              disabled={submitting}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
            >
              {submitting ? "Submitting..." : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCQTestPage;
