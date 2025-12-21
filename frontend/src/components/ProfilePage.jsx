import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/utils/api";
import { toast } from "sonner";
import { setUser } from "@/redux/authSlice";
import Navbar from "./shared/Navbar";
import Footer from "./shared/Footer";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  ExternalLink,
  Shield,
  Calendar,
  Award,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Pen,
  Camera,
  Save,
  Loader2,
  Code,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Building2,
  Users,
  CreditCard,
  Settings,
  ChevronRight,
  Link2,
  Upload,
  X,
  Sparkles,
} from "lucide-react";
import { USER_API_END_POINT } from "@/utils/constant";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((store) => store.auth);
  const { allAppliedJobs } = useSelector((store) => store.job);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState(
    user?.profile?.resumeOriginalName || "",
  );
  const [formData, setFormData] = useState({
    fullname: user?.fullname || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    bio: user?.profile?.bio || "",
    location:
      typeof user?.profile?.location === "object"
        ? user?.profile?.location?.city || ""
        : user?.profile?.location || "",
    skills: user?.profile?.skills?.join(", ") || "",
    experience: user?.profile?.experience || "",
    education: user?.profile?.education || "",
    linkedin: user?.profile?.socialLinks?.linkedin || "",
    github: user?.profile?.socialLinks?.github || "",
    twitter: user?.profile?.socialLinks?.twitter || "",
    website:
      user?.profile?.socialLinks?.website ||
      user?.profile?.socialLinks?.portfolio ||
      "",
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) {
      setActiveSection(tab);
    } else {
      setActiveSection("overview");
    }
  }, [location.search]);

  const roleConfig = {
    student: {
      title: "Candidate",
      color: "#FFD700",
      sections: ["overview", "applications", "skills", "resume"],
    },
    recruiter: {
      title: "Recruiter",
      color: "#00FF94",
      sections: ["overview", "company", "jobs", "stats"],
    },
    company_admin: {
      title: "CEO / Admin",
      color: "#00BFFF",
      sections: ["overview", "company", "team", "billing"],
    },
  };

  const currentRole = roleConfig[user?.role] || roleConfig.student;

  const stats = {
    total: allAppliedJobs?.length || 0,
    pending: allAppliedJobs?.filter((j) => j.status === "pending")?.length || 0,
    interviews:
      allAppliedJobs?.filter((j) => j.status === "interview")?.length || 0,
    accepted:
      allAppliedJobs?.filter((j) => ["hired", "accepted"].includes(j.status))
        ?.length || 0,
    rejected:
      allAppliedJobs?.filter((j) => j.status === "rejected")?.length || 0,
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setResumeFile(file);
    setResumeName(file.name);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      setLoading(true);
      const res = await api.post(
        `${USER_API_END_POINT}/profile/photo`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      if (res.data.success) {
        const updatedUser = {
          ...user,
          profile: {
            ...(user?.profile || {}),
            profilePhoto: res.data.profilePhoto,
          },
        };
        dispatch(setUser(updatedUser));
        toast.success("Photo updated");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload photo");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      const form = new FormData();
      form.append("fullname", formData.fullname);
      form.append("phoneNumber", formData.phoneNumber);
      form.append("bio", formData.bio);
      form.append("location", formData.location);
      form.append("skills", formData.skills);

      form.append(
        "socialLinks",
        JSON.stringify({
          linkedin: formData.linkedin,
          github: formData.github,
          twitter: formData.twitter,
          website: formData.website,
        }),
      );

      if (resumeFile) {
        form.append("file", resumeFile);
      }

      const res = await api.post(
        `${USER_API_END_POINT}/profile/update`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (res.data.success) {
        dispatch(setUser(res.data.user));
        toast.success("Profile updated successfully");
        setIsEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // Profile completion calculation
  const calculateCompletion = () => {
    const fields = [
      user?.fullname,
      user?.email,
      user?.phoneNumber,
      user?.profile?.bio,
      user?.profile?.skills?.length,
      user?.profile?.resume,
      user?.profile?.profilePhoto,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const trialEnd = user?.trialEndDate ? new Date(user.trialEndDate) : null;
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] selection:bg-[#FFD700]/30">
      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[200px]"
          style={{ backgroundColor: `${currentRole.color}10` }}
        />
      </div>

      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 pt-20 relative z-10">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111111] border border-white/10 rounded-md overflow-hidden mb-6 relative"
        >
          {/* Corner Accents */}
          <div
            className="absolute top-0 right-0 w-8 h-8 border-t border-r"
            style={{ borderColor: `${currentRole.color}50` }}
          />
          <div
            className="absolute bottom-0 left-0 w-8 h-8 border-b border-l"
            style={{ borderColor: `${currentRole.color}50` }}
          />

          {/* Cover / Header */}
          <div
            className="h-32 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${currentRole.color}20, transparent)`,
            }}
          >
            <div className="absolute inset-0 bg-grid opacity-50" />
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
              {/* Avatar with upload */}
              <div className="relative group">
                {user?.profile?.profilePhoto ? (
                  <Avatar
                    className="w-28 h-28 border-2 shadow-lg"
                    style={{ borderColor: `${currentRole.color}80` }}
                  >
                    <AvatarImage
                      src={user.profile.profilePhoto}
                      alt={user?.fullname}
                    />
                  </Avatar>
                ) : (
                  <div
                    className="w-28 h-28 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: `${currentRole.color}80`,
                      backgroundColor: currentRole.color,
                    }}
                  >
                    <span className="text-4xl font-bold text-black">
                      {getInitials(user?.fullname)}
                    </span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-[#00FF94] rounded-full border-2 border-[#111111]" />
              </div>

              {/* Name & Role */}
              <div className="flex-1 pt-4 sm:pt-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                      {user?.fullname || "User"}
                      <Badge
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                        style={{
                          backgroundColor: `${currentRole.color}20`,
                          color: currentRole.color,
                          borderColor: `${currentRole.color}50`,
                        }}
                      >
                        {currentRole.title}
                      </Badge>
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm font-mono">
                      {user?.profile?.bio || `HIRE.OS ${currentRole.title}`}
                    </p>
                  </div>
                  <div className="hidden sm:flex gap-2">
                    <Button
                      onClick={() => navigate("/settings")}
                      variant="outline"
                      className="border-white/10 text-gray-400 hover:bg-white/5 rounded-sm text-xs uppercase tracking-wider"
                    >
                      <Settings size={14} className="mr-2" />
                      Settings
                    </Button>
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      className="rounded-sm text-xs uppercase tracking-wider font-bold"
                      style={{
                        backgroundColor: currentRole.color,
                        color: "#000",
                      }}
                    >
                      <Pen size={14} className="mr-2" />
                      {isEditing ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
              {[
                {
                  icon: Mail,
                  label: "Email",
                  value: user?.email,
                  color: "#FFD700",
                },
                {
                  icon: Phone,
                  label: "Phone",
                  value: user?.phoneNumber || "Not added",
                  color: "#00FF94",
                },
                {
                  icon: MapPin,
                  label: "Location",
                  value:
                    typeof user?.profile?.location === "object"
                      ? `${user?.profile?.location?.city || ""}${user?.profile?.location?.city && user?.profile?.location?.country ? ", " : ""}${user?.profile?.location?.country || ""}` ||
                      "Not set"
                      : user?.profile?.location || "Not set",
                  color: "#00BFFF",
                },
                {
                  icon: Calendar,
                  label: "Member Since",
                  value: formatDate(user?.createdAt),
                  color: "#FF6B6B",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-sm flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon size={14} style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-xs font-mono text-gray-300 truncate">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Profile Completion */}
            <div className="mt-6 p-4 bg-white/5 rounded-sm border border-white/5">
              <div className="flex justify-between mb-2 text-xs">
                <span className="text-gray-500 uppercase tracking-wider">
                  Profile Completion
                </span>
                <span
                  className="font-mono"
                  style={{ color: currentRole.color }}
                >
                  {calculateCompletion()}%
                </span>
              </div>
              <Progress
                value={calculateCompletion()}
                className="h-1.5 bg-white/10"
              />
            </div>
          </div>
        </motion.div>

        {/* Edit Form */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-[#111111] border border-white/10 rounded-md p-6 relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-6 h-6 border-t border-r"
                  style={{ borderColor: `${currentRole.color}30` }}
                />

                <h3
                  className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2"
                  style={{ color: currentRole.color }}
                >
                  <Pen size={14} />
                  Edit Profile
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                        Full Name
                      </label>
                      <input
                        name="fullname"
                        value={formData.fullname}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                        Phone
                      </label>
                      <input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                        Location
                      </label>
                      <input
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30 font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Bio & Skills */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30 font-mono text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                        Skills (comma separated)
                      </label>
                      <input
                        name="skills"
                        value={formData.skills}
                        onChange={handleInputChange}
                        placeholder="React, Node.js, Python..."
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block">
                    Social Links
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        name: "linkedin",
                        icon: Linkedin,
                        placeholder: "LinkedIn URL",
                      },
                      {
                        name: "github",
                        icon: Github,
                        placeholder: "GitHub URL",
                      },
                      {
                        name: "twitter",
                        icon: Twitter,
                        placeholder: "Twitter URL",
                      },
                      {
                        name: "website",
                        icon: Globe,
                        placeholder: "Website URL",
                      },
                    ].map((social) => (
                      <div key={social.name} className="relative">
                        <social.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          name={social.name}
                          value={formData[social.name]}
                          onChange={handleInputChange}
                          placeholder={social.placeholder}
                          className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-sm text-white text-xs focus:outline-none focus:border-white/30"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resume Upload */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block">
                    Resume (PDF)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-[#00FF94]/10 flex items-center justify-center border border-[#00FF94]/30">
                        <FileText size={16} className="text-[#00FF94]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-300 font-mono truncate max-w-[180px]">
                          {resumeName ||
                            user?.profile?.resumeOriginalName ||
                            "No resume selected"}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                          PDF only, max 5MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center justify-center">
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleResumeChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <span className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#00FF94] text-black rounded-sm cursor-pointer">
                          {resumeFile ? "Change" : "Upload"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="border-white/10 text-gray-400 hover:bg-white/5 rounded-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="rounded-sm font-bold"
                    style={{
                      backgroundColor: currentRole.color,
                      color: "#000",
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Section (For Students) */}
        {user?.role === "student" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
          >
            {[
              {
                icon: Briefcase,
                label: "Total Applied",
                value: stats.total,
                color: "#FFD700",
              },
              {
                icon: Clock,
                label: "Pending",
                value: stats.pending,
                color: "#F59E0B",
              },
              {
                icon: Target,
                label: "Interviews",
                value: stats.interviews,
                color: "#8B5CF6",
              },
              {
                icon: CheckCircle,
                label: "Accepted",
                value: stats.accepted,
                color: "#00FF94",
              },
              {
                icon: XCircle,
                label: "Rejected",
                value: stats.rejected,
                color: "#EF4444",
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-[#111111] border border-white/10 rounded-sm p-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-sm flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <stat.icon size={16} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white font-mono">
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {user?.role === "student" &&
          user?.trialEndDate &&
          activeSection === "subscription" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6 bg-gradient-to-r from-[#00FF94]/10 to-emerald-500/5 rounded-sm p-5 border border-[#00FF94]/30 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#00FF94]/10 blur-2xl opacity-60" />
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-sm bg-[#00FF94]/15 flex items-center justify-center border border-[#00FF94]/40">
                    <Sparkles className="w-4 h-4 text-[#00FF94]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#00FF94] font-bold uppercase tracking-wider">
                      Free Trial
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {trialEnd
                        ? `Ends on ${trialEnd.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
                        : "Trial active"}
                    </p>
                  </div>
                </div>
                <Badge className="bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/40 text-[10px] font-mono uppercase tracking-wider">
                  {user.subscriptionStatus === "trial"
                    ? "ACTIVE"
                    : user.trialExpired
                      ? "EXPIRED"
                      : "TRIAL"}
                </Badge>
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-3xl font-black text-white font-mono">
                    {trialDaysRemaining !== null ? trialDaysRemaining : "-"}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    days remaining
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 font-mono mb-1">
                    Plan
                  </p>
                  <p className="text-sm text-white font-semibold font-mono">
                    HIRE.OS Trial Access
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        {/* Content Sections */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Skills Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#111111] border border-white/10 rounded-sm p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
            <h3 className="text-sm font-bold text-[#FFD700] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Code size={14} />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {user?.profile?.skills?.length > 0 ? (
                user.profile.skills.map((skill, idx) => (
                  <Badge
                    key={idx}
                    className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 text-xs"
                  >
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No skills added yet</p>
              )}
            </div>
          </motion.div>

          {/* Resume Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#111111] border border-white/10 rounded-sm p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#00FF94]/30" />
            <h3 className="text-sm font-bold text-[#00FF94] uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={14} />
              Resume
            </h3>
            {user?.profile?.resume ? (
              <div className="space-y-3">
                <p className="text-gray-400 text-xs font-mono truncate">
                  {user.profile.resumeOriginalName || "resume.pdf"}
                </p>
                <Button
                  onClick={() => window.open(user.profile.resume, "_blank")}
                  className="w-full bg-[#00FF94]/10 text-[#00FF94] hover:bg-[#00FF94]/20 border border-[#00FF94]/30 rounded-sm text-xs uppercase tracking-wider"
                >
                  <ExternalLink size={14} className="mr-2" />
                  View Resume
                </Button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No resume uploaded</p>
            )}
          </motion.div>

          {/* Social Links Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#111111] border border-white/10 rounded-sm p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#00BFFF]/30" />
            <h3 className="text-sm font-bold text-[#00BFFF] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Link2 size={14} />
              Social Links
            </h3>
            <div className="space-y-2">
              {[
                {
                  icon: Linkedin,
                  url: user?.profile?.socialLinks?.linkedin,
                  label: "LinkedIn",
                },
                {
                  icon: Github,
                  url: user?.profile?.socialLinks?.github,
                  label: "GitHub",
                },
                {
                  icon: Twitter,
                  url: user?.profile?.socialLinks?.twitter,
                  label: "Twitter",
                },
                {
                  icon: Globe,
                  url:
                    user?.profile?.socialLinks?.website ||
                    user?.profile?.socialLinks?.portfolio,
                  label: "Website",
                },
              ]
                .filter((s) => s.url)
                .map((social, idx) => (
                  <a
                    key={idx}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 bg-white/5 rounded-sm hover:bg-white/10 transition-colors group"
                  >
                    <social.icon
                      size={14}
                      className="text-gray-400 group-hover:text-[#00BFFF]"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-white">
                      {social.label}
                    </span>
                    <ExternalLink
                      size={12}
                      className="ml-auto text-gray-600 group-hover:text-gray-400"
                    />
                  </a>
                ))}
              {!user?.profile?.socialLinks?.linkedin &&
                !user?.profile?.socialLinks?.github && (
                  <p className="text-gray-500 text-sm">No links added</p>
                )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
