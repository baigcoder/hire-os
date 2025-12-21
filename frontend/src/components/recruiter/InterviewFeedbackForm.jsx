/**
 * InterviewFeedbackForm.jsx
 * Structured interview feedback collection form
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Save,
  Send,
  User,
  Briefcase,
  Clock,
  CheckCircle,
  X,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { INTERVIEW_FEEDBACK_API_END_POINT } from "@/utils/constant";

// Rating Component with Stars
const RatingInput = ({ value, onChange, label, description }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-gray-400">{label}</Label>
        <span className="text-xs text-gray-600 font-mono">{value || 0}/5</span>
      </div>
      {description && <p className="text-xs text-gray-600">{description}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= (value || 0)
                  ? "text-[#FFD700] fill-[#FFD700]"
                  : "text-gray-700"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

// Scorecard Section
const ScorecardSection = ({ scorecard, onChange }) => {
  const categories = [
    {
      key: "technicalSkills",
      label: "Technical Skills",
      description: "Problem-solving, coding, domain knowledge",
    },
    {
      key: "communication",
      label: "Communication",
      description: "Clarity, articulation, listening skills",
    },
    {
      key: "problemSolving",
      label: "Problem Solving",
      description: "Analytical thinking, approach to challenges",
    },
    {
      key: "cultureFit",
      label: "Culture Fit",
      description: "Values alignment, team compatibility",
    },
    {
      key: "experience",
      label: "Relevant Experience",
      description: "Past work, industry knowledge",
    },
    {
      key: "enthusiasm",
      label: "Enthusiasm",
      description: "Interest in role, motivation",
    },
  ];

  const updateScore = (category, field, value) => {
    onChange({
      ...scorecard,
      [category]: {
        ...scorecard[category],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div
          key={cat.key}
          className="p-4 bg-[#0A0A0A] border border-white/10 rounded-sm"
        >
          <RatingInput
            value={scorecard[cat.key]?.score}
            onChange={(val) => updateScore(cat.key, "score", val)}
            label={cat.label}
            description={cat.description}
          />
          <Input
            placeholder={`Notes about ${cat.label.toLowerCase()}...`}
            value={scorecard[cat.key]?.notes || ""}
            onChange={(e) => updateScore(cat.key, "notes", e.target.value)}
            className="mt-3 bg-[#111111] border-white/10 text-white text-sm"
          />
        </div>
      ))}
    </div>
  );
};

// Strengths/Weaknesses Input
const TagInput = ({ items, onChange, placeholder, type }) => {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim() && !items.includes(inputValue.trim())) {
      onChange([...items, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemove = (item) => {
    onChange(items.filter((i) => i !== item));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-[#0A0A0A] border-white/10 text-white text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          className="border-white/10 text-gray-400"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <Badge
              key={idx}
              className={`${
                type === "strength"
                  ? "bg-[#00FF94]/10 text-[#00FF94]"
                  : "bg-red-500/10 text-red-400"
              } flex items-center gap-1`}
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="ml-1 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const InterviewFeedbackForm = ({
  interviewId,
  applicationId,
  candidate,
  job,
  onClose,
  onSubmit,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scorecard: {
      technicalSkills: { score: 0, notes: "" },
      communication: { score: 0, notes: "" },
      problemSolving: { score: 0, notes: "" },
      cultureFit: { score: 0, notes: "" },
      experience: { score: 0, notes: "" },
      enthusiasm: { score: 0, notes: "" },
    },
    recommendation: "",
    strengths: [],
    weaknesses: [],
    notes: "",
    privateNotes: "",
  });

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        INTERVIEW_FEEDBACK_API_END_POINT,
        {
          interviewId,
          applicationId,
          ...formData,
          isSubmitted: false,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        toast.success("Draft saved");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.recommendation) {
      toast.error("Please select a recommendation");
      return;
    }

    // Check if at least some scores are filled
    const hasScores = Object.values(formData.scorecard).some(
      (cat) => cat.score > 0,
    );
    if (!hasScores) {
      toast.error("Please provide at least some ratings");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        INTERVIEW_FEEDBACK_API_END_POINT,
        {
          interviewId,
          applicationId,
          ...formData,
          isSubmitted: true,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        toast.success("Feedback submitted");
        onSubmit?.(response.data.feedback);
        onClose?.();
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate overall score
  const overallScore = (() => {
    const scores = Object.values(formData.scorecard)
      .map((cat) => cat.score)
      .filter((s) => s > 0);
    if (scores.length === 0) return 0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  })();

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif] py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <MessageSquare className="w-7 h-7 text-[#FFD700]" />
              Interview Feedback
            </h1>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5 text-gray-400" />
              </Button>
            )}
          </div>
        </motion.div>

        {/* Candidate Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-[#111111] border border-white/10 rounded-sm mb-6"
        >
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 rounded-sm">
              <AvatarImage src={candidate?.profile?.profilePhoto} />
              <AvatarFallback className="rounded-sm bg-[#FFD700]/10 text-[#FFD700] text-xl font-bold">
                {candidate?.fullname?.[0] || "C"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-white">
                {candidate?.fullname || "Candidate"}
              </h2>
              <p className="text-gray-400">{candidate?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-[#FFD700]/10 text-[#FFD700]">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {job?.title || "Position"}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overall Score Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 bg-[#111111] border border-[#FFD700]/30 rounded-sm mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Overall Score
              </p>
              <p className="text-4xl font-bold text-[#FFD700] font-mono mt-1">
                {overallScore}
              </p>
              <p className="text-xs text-gray-600">out of 5.0</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${
                    star <= Math.round(overallScore)
                      ? "text-[#FFD700] fill-[#FFD700]"
                      : "text-gray-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Scorecard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-[#111111] border border-white/10 rounded-sm mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-[#FFD700]" />
            Scorecard
          </h3>
          <ScorecardSection
            scorecard={formData.scorecard}
            onChange={(scorecard) =>
              setFormData((prev) => ({ ...prev, scorecard }))
            }
          />
        </motion.div>

        {/* Strengths & Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid md:grid-cols-2 gap-6 mb-6"
        >
          <div className="p-6 bg-[#111111] border border-white/10 rounded-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-[#00FF94]" />
              Key Strengths
            </h3>
            <TagInput
              items={formData.strengths}
              onChange={(strengths) =>
                setFormData((prev) => ({ ...prev, strengths }))
              }
              placeholder="Add a strength..."
              type="strength"
            />
          </div>

          <div className="p-6 bg-[#111111] border border-white/10 rounded-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-400" />
              Areas of Concern
            </h3>
            <TagInput
              items={formData.weaknesses}
              onChange={(weaknesses) =>
                setFormData((prev) => ({ ...prev, weaknesses }))
              }
              placeholder="Add a concern..."
              type="weakness"
            />
          </div>
        </motion.div>

        {/* Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-[#111111] border border-white/10 rounded-sm mb-6"
        >
          <h3 className="text-sm font-bold text-white mb-4">
            Final Recommendation *
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "strong_hire", label: "Strong Hire", color: "#00FF94" },
              { value: "hire", label: "Hire", color: "#10B981" },
              { value: "no_hire", label: "No Hire", color: "#F59E0B" },
              {
                value: "strong_no_hire",
                label: "Strong No Hire",
                color: "#EF4444",
              },
            ].map((rec) => (
              <button
                key={rec.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    recommendation: rec.value,
                  }))
                }
                className={`p-4 border rounded-sm text-center transition-all ${
                  formData.recommendation === rec.value
                    ? "border-[#FFD700] bg-[#FFD700]/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: rec.color }}
                />
                <p
                  className={`text-sm ${
                    formData.recommendation === rec.value
                      ? "text-white font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  {rec.label}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <div className="p-6 bg-[#111111] border border-white/10 rounded-sm">
            <Label className="text-gray-400">General Notes</Label>
            <p className="text-xs text-gray-600 mb-2">Visible to hiring team</p>
            <Textarea
              placeholder="Overall impressions, key takeaways..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="bg-[#0A0A0A] border-white/10 text-white min-h-[120px]"
            />
          </div>

          <div className="p-6 bg-[#111111] border border-white/10 rounded-sm">
            <Label className="text-gray-400">Private Notes</Label>
            <p className="text-xs text-gray-600 mb-2">Only visible to you</p>
            <Textarea
              placeholder="Personal observations, reminders..."
              value={formData.privateNotes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  privateNotes: e.target.value,
                }))
              }
              className="bg-[#0A0A0A] border-white/10 text-white min-h-[120px]"
            />
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between p-6 bg-[#111111] border border-white/10 rounded-sm"
        >
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={loading}
            className="border-white/10 text-gray-400"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Draft"}
          </Button>

          <div className="flex gap-3">
            {onClose && (
              <Button
                variant="outline"
                onClick={onClose}
                className="border-white/10 text-gray-400"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.recommendation}
              className="bg-[#FFD700] text-black hover:bg-[#FFE44D]"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InterviewFeedbackForm;
