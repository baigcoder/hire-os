import React, { useState } from "react";
import Navbar from "./shared/Navbar";
import Footer from "./shared/Footer";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Mail,
  Phone,
  Pen,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  ExternalLink,
  Plus,
  Shield,
  Calendar,
  Building2,
  Award,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Code,
  Globe,
  Linkedin,
  Github,
  Twitter,
} from "lucide-react";
import { Badge } from "./ui/badge";
import AppliedJobTable from "./AppliedJobTable";
import UpdateProfileDialog from "./UpdateProfileDialog";
import { useSelector } from "react-redux";
import useGetAppliedJobs from "@/hooks/useGetAppliedJobs";
import { motion } from "framer-motion";

const Profile = () => {
  useGetAppliedJobs();
  const [open, setOpen] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { allAppliedJobs } = useSelector((store) => store.job);

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
      month: "long",
      day: "numeric",
    });
  };

  // Calculate application stats
  const stats = {
    total: allAppliedJobs?.length || 0,
    pending: allAppliedJobs?.filter((j) => j.status === "pending")?.length || 0,
    reviewing:
      allAppliedJobs?.filter((j) =>
        ["under_review", "shortlisted"].includes(j.status),
      )?.length || 0,
    interviews:
      allAppliedJobs?.filter((j) => j.status === "interview")?.length || 0,
    accepted:
      allAppliedJobs?.filter((j) => ["hired", "accepted"].includes(j.status))
        ?.length || 0,
    rejected:
      allAppliedJobs?.filter((j) => j.status === "rejected")?.length || 0,
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="p-4 rounded-md bg-[#111111] border border-white/10 hover:border-[#FFD700]/30 transition-all">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-sm bg-white/5 flex items-center justify-center ${color}`}
        >
          <Icon size={16} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            {label}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111111] border border-white/10 rounded-md overflow-hidden mb-6"
        >
          {/* Cover / Header */}
          <div className="h-32 bg-gradient-to-r from-[#FFD700]/20 via-[#FFD700]/10 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-50" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                {user?.profile?.profilePhoto ? (
                  <Avatar className="w-28 h-28 border-2 border-[#FFD700]/50 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                    <AvatarImage
                      src={user.profile.profilePhoto}
                      alt={user?.fullname}
                    />
                  </Avatar>
                ) : (
                  <div className="w-28 h-28 rounded-full border-2 border-[#FFD700]/50 shadow-[0_0_30px_rgba(255,215,0,0.2)] bg-[#FFD700] flex items-center justify-center">
                    <span className="text-4xl font-bold text-black">
                      {getInitials(user?.fullname)}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-[#00FF94] rounded-full border-2 border-[#111111]"></div>
              </motion.div>

              {/* Name & Role */}
              <div className="flex-1 pt-4 sm:pt-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                      {user?.fullname || "User"}
                      {user?.authProvider === "google" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00FF94]/10 text-[#00FF94] text-[10px] font-medium rounded-sm border border-[#00FF94]/30 uppercase tracking-wider">
                          <Shield size={10} />
                          Verified
                        </span>
                      )}
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm font-mono">
                      {user?.profile?.bio ? (
                        <span className="line-clamp-1">{user.profile.bio}</span>
                      ) : (
                        <span className="italic">HIRE.OS Candidate</span>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={() => setOpen(true)}
                    className="hidden sm:flex items-center gap-2 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold shadow-[0_0_20px_rgba(255,215,0,0.2)] rounded-sm text-xs uppercase tracking-wider"
                  >
                    <Pen size={14} />
                    Edit
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Edit Button */}
            <Button
              onClick={() => setOpen(true)}
              className="sm:hidden w-full mt-4 flex items-center justify-center gap-2 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold rounded-sm text-xs uppercase tracking-wider"
            >
              <Pen size={14} />
              Edit Profile
            </Button>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                <div className="w-8 h-8 rounded-sm bg-[#FFD700]/10 flex items-center justify-center">
                  <Mail size={14} className="text-[#FFD700]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-xs font-mono text-gray-300 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Phone size={18} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.phoneNumber || "Not added"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin size={18} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Location
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {typeof user?.profile?.location === "object"
                      ? `${user?.profile?.location?.city || ""}${user?.profile?.location?.city && user?.profile?.location?.country ? ", " : ""}${user?.profile?.location?.country || ""}` ||
                        "Not specified"
                      : user?.profile?.location || "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Calendar size={18} className="text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Member Since
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user?.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
        >
          <StatCard
            icon={Briefcase}
            label="Total Applied"
            value={stats.total}
            color="bg-gray-600"
            bgColor="bg-white dark:bg-gray-800"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={stats.pending}
            color="bg-yellow-500"
            bgColor="bg-yellow-50 dark:bg-yellow-900/20"
          />
          <StatCard
            icon={Target}
            label="In Review"
            value={stats.reviewing}
            color="bg-blue-500"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            icon={TrendingUp}
            label="Interviews"
            value={stats.interviews}
            color="bg-purple-500"
            bgColor="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            icon={CheckCircle}
            label="Accepted"
            value={stats.accepted}
            color="bg-green-500"
            bgColor="bg-green-50 dark:bg-green-900/20"
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value={stats.rejected}
            color="bg-red-500"
            bgColor="bg-red-50 dark:bg-red-900/20"
          />
        </motion.div>

        {/* Skills & Experience Section */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Skills Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Code size={16} className="text-white" />
                </div>
                Skills
              </h2>
              <button
                onClick={() => setOpen(true)}
                className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 p-2 rounded-lg transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {user?.profile?.skills?.length > 0 ? (
                user.profile.skills.map((skill, index) => (
                  <Badge
                    key={index}
                    className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 px-3 py-1 font-medium"
                  >
                    {skill}
                  </Badge>
                ))
              ) : (
                <div className="text-center py-6 w-full">
                  <Code
                    size={32}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
                  />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No skills added yet
                  </p>
                  <button
                    onClick={() => setOpen(true)}
                    className="text-yellow-600 hover:text-yellow-700 text-sm font-medium mt-2"
                  >
                    + Add your skills
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Experience Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Building2 size={16} className="text-white" />
                </div>
                Experience
              </h2>
              <button
                onClick={() => setOpen(true)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            {user?.profile?.experience?.length > 0 ? (
              <div className="space-y-3">
                {user.profile.experience.slice(0, 2).map((exp, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {exp.title}
                    </p>
                    <p className="text-xs text-gray-500">{exp.company}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Building2
                  size={32}
                  className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
                />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No experience added
                </p>
                <button
                  onClick={() => setOpen(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                >
                  + Add experience
                </button>
              </div>
            )}
          </motion.div>

          {/* Education Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <GraduationCap size={16} className="text-white" />
                </div>
                Education
              </h2>
              <button
                onClick={() => setOpen(true)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            {user?.profile?.education?.length > 0 ? (
              <div className="space-y-3">
                {user.profile.education.slice(0, 2).map((edu, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {edu.degree}
                    </p>
                    <p className="text-xs text-gray-500">{edu.school}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <GraduationCap
                  size={32}
                  className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
                />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No education added
                </p>
                <button
                  onClick={() => setOpen(true)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium mt-2"
                >
                  + Add education
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Applied Jobs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <FileText size={16} className="text-white" />
              </div>
              Applied Jobs
            </h2>
            <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {stats.total} applications
            </Badge>
          </div>
          <AppliedJobTable />
        </motion.div>

        {/* Tip Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
              <Award size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Pro Tip
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Complete your profile to increase your chances of getting hired.
                Add your skills, experience, and education. You'll upload your
                resume when applying to specific jobs.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
      <UpdateProfileDialog open={open} setOpen={setOpen} />
    </div>
  );
};

export default Profile;
