import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { STATS_API_END_POINT, COMPANY_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import {
  Briefcase,
  Building,
  Users,
  Check,
  X,
  ChevronRight,
  Play,
  Zap,
  Sparkles,
  Target,
  BarChart3,
  Star,
  Crown,
  ArrowRight,
  Rocket,
  CheckCircle2,
  Shield,
  Video,
  Brain,
  FileText,
  Bell,
  CreditCard,
  Globe,
  Award,
  TrendingUp,
  Clock,
  Eye,
  UserPlus,
  Lock,
  Unlock,
  Gift,
  Menu,
  Search,
  MapPin,
  Terminal,
  Activity,
  Cpu,
  Radio,
  User,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import Navbar from "./shared/Navbar";
import Footer from "./shared/Footer";

// ========== INDUSTRIAL COMPONENTS ==========

// Animated counter with monospace styling - accepts dynamic target
const DataCounter = ({ target, suffix = "", prefix = "", label }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2500;
    const steps = 80;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="text-center">
      <div className="font-mono text-4xl md:text-5xl font-bold text-white tracking-tight">
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs text-gray-500 uppercase tracking-widest mt-2 font-medium">
        {label}
      </div>
    </div>
  );
};

// Industrial Feature Card with HUD aesthetic
const IndustrialFeatureCard = ({
  icon: Icon,
  title,
  description,
  isPro = false,
  index = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, borderColor: isPro ? "#FFD700" : "#00FF94" }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.08, duration: 0.4 }}
    className={`relative p-6 rounded-md border transition-all duration-300 group cursor-default overflow-hidden ${
      isPro
        ? "bg-[#FFD700]/5 border-[#FFD700]/20"
        : "bg-[#111111] border-white/10"
    }`}
  >
    {/* Hover Scan Effect */}
    <motion.div
      className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b ${isPro ? "from-[#FFD700]/10" : "from-[#00FF94]/10"} to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out`}
    />

    {/* Corner accent */}
    <div
      className={`absolute top-0 right-0 w-8 h-8 border-t border-r ${isPro ? "border-[#FFD700]/40" : "border-white/10"} transition-all group-hover:w-12 group-hover:h-12`}
    />
    <div
      className={`absolute bottom-0 left-0 w-8 h-8 border-b border-l ${isPro ? "border-[#FFD700]/40" : "border-white/10"} transition-all group-hover:w-12 group-hover:h-12`}
    />

    {isPro && (
      <Badge className="absolute -top-px right-4 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded-b-sm rounded-t-none uppercase tracking-wider">
        Pro
      </Badge>
    )}
    <div
      className={`w-10 h-10 rounded-sm flex items-center justify-center mb-4 transition-all duration-300 ${
        isPro
          ? "bg-[#FFD700] text-black"
          : "bg-white/5 text-[#FFD700] group-hover:bg-[#FFD700]/10 group-hover:scale-110"
      }`}
    >
      <Icon className="w-5 h-5" strokeWidth={2} />
    </div>
    <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk',sans-serif] group-hover:text-[#FFD700] transition-colors">
      {title}
    </h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

// Live Status Indicator
const LiveIndicator = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00FF94]/10 border border-[#00FF94]/20 rounded-sm">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF94]"></span>
    </span>
    <span className="text-[#00FF94] text-xs font-mono uppercase tracking-wider">
      System Online
    </span>
  </div>
);

// ========== MAIN COMPONENT ==========
const Home = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");

  // Base stats + dynamic increment from MongoDB
  // Base values: 15 jobs, 5 companies, 25 candidates, 80% success rate
  const BASE_STATS = {
    activeJobs: 15,
    companies: 5,
    candidates: 25,
    successRate: 80,
  };

  const [stats, setStats] = useState(BASE_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);

  // Reviews for testimonials section
  const [reviews, setReviews] = useState([]);

  // Featured companies
  const [featuredCompanies, setFeaturedCompanies] = useState([]);

  // Comment form state
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentRating, setCommentRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [commentTitle, setCommentTitle] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch real stats from API - adds to base values
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${STATS_API_END_POINT}/public`);
        console.log("📊 Stats API Response:", response.data);
        if (response.data.success && response.data.raw) {
          const { activeJobs, companies, candidates, successRate } =
            response.data.raw;
          // Base values + real data from database (dynamic growth)
          setStats({
            activeJobs: BASE_STATS.activeJobs + activeJobs,
            companies: BASE_STATS.companies + companies,
            candidates: BASE_STATS.candidates + candidates,
            successRate: Math.min(
              BASE_STATS.successRate + Math.floor(successRate / 10),
              99,
            ), // Cap at 99%
          });
          setIsLive(true);
        }
      } catch (error) {
        console.log("Stats fetch error:", error.message);
        setStats(BASE_STATS);
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const response = await axios.get(
          `${STATS_API_END_POINT}/reviews?limit=6`,
        );
        if (response.data.success) {
          setReviews(response.data.reviews);
        }
      } catch (error) {
        console.log("Reviews fetch error:", error.message);
      }
    };

    fetchStats();
    fetchReviews();
    fetchFeaturedCompanies();

    // Refresh stats every 30 seconds for live updates
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch featured companies
  const fetchFeaturedCompanies = async () => {
    try {
      const response = await axios.get(
        `${COMPANY_API_END_POINT}/featured?limit=6`,
      );
      if (response.data.success) {
        setFeaturedCompanies(response.data.companies);
      }
    } catch (error) {
      console.log("Featured companies fetch error:", error.message);
    }
  };

  const handleSearch = () => {
    navigate(`/browse?query=${searchQuery}&location=${location}`);
  };

  const getDashboardPath = () => {
    if (!user) return "/signup";
    if (user.role === "company_admin") return "/company/admin/dashboard";
    if (user.role === "recruiter") return "/recruiter/dashboard";
    return "/student/dashboard";
  };

  // Submit a new review/comment
  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Please login to submit a review");
      return;
    }
    if (!commentText.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmittingComment(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${STATS_API_END_POINT}/reviews`,
        {
          rating: commentRating,
          title: commentTitle,
          comment: commentText.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setShowCommentForm(false);
        setCommentText("");
        setCommentTitle("");
        setCommentRating(5);

        // Refresh reviews
        const reviewsRes = await axios.get(
          `${STATS_API_END_POINT}/reviews?limit=6`,
        );
        if (reviewsRes.data.success) {
          setReviews(reviewsRes.data.reviews);
        }
      }
    } catch (error) {
      console.error("Submit comment error:", error);
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingComment(false);
    }
  };

  const DecryptionText = ({ text, className }) => {
    const [displayText, setDisplayText] = useState("");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*";

    useEffect(() => {
      let iteration = 0;
      const maxIterations = 20; // How many scrambles before settling

      const interval = setInterval(() => {
        setDisplayText(
          text
            .split("")
            .map((letter, index) => {
              if (index < iteration) {
                return text[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join(""),
        );

        if (iteration >= text.length) {
          clearInterval(interval);
        }

        iteration += 1 / 3; // Speed of reveal
      }, 30);

      return () => clearInterval(interval);
    }, [text]);

    return <span className={className}>{displayText}</span>;
  };

  const ScannerBackground = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute top-0 left-0 w-full h-[2px] bg-[#FFD700]/50 shadow-[0_0_20px_rgba(255,215,0,0.5)] z-0"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#FFD700]/5 to-transparent z-0"
        animate={{ top: ["-100%", "100%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden font-['Space_Grotesk',sans-serif]">
      <Navbar />

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Industrial Grid Background */}
        <div className="absolute inset-0 bg-grid opacity-40" />

        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FFD700]/8 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00FF94]/5 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* System Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-4 mb-10"
            >
              <LiveIndicator />
              <Badge className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 text-xs font-mono">
                v2.0.0 STABLE
              </Badge>
            </motion.div>

            {/* Main Heading - Industrial Typography */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-6xl md:text-7xl lg:text-[120px] font-black mb-6 leading-[0.9] tracking-tighter"
            >
              <DecryptionText text="HIRE" className="text-white" />
              <span className="text-[#FFD700]">.</span>
              <span className="text-[#FFD700]">OS</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-4 font-light"
            >
              Industrial Grade Talent Acquisition
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-sm md:text-base text-gray-600 max-w-xl mx-auto mb-12 font-mono"
            >
              AI-powered interviews • Real-time analytics • Precision matching
            </motion.p>

            {/* Search Bar - Industrial Style */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-3xl mx-auto mb-10"
            >
              <div className="flex flex-col md:flex-row gap-3 p-3 bg-[#111111] border border-white/10 rounded-md">
                <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-sm border border-white/5">
                  <Search className="w-4 h-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Job title or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none text-white placeholder:text-gray-600 focus-visible:ring-0 font-mono text-sm"
                  />
                </div>
                <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-sm border border-white/5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Location..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 bg-transparent border-none text-white placeholder:text-gray-600 focus-visible:ring-0 font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  className="px-6 py-5 bg-[#FFD700] text-black font-bold text-sm hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider"
                >
                  Execute Search
                </Button>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              {!user ? (
                <>
                  <Link to="/signup">
                    <Button className="px-8 py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] shadow-[0_0_30px_rgba(255,215,0,0.2)] rounded-sm uppercase tracking-wider">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </Button>
                  </Link>
                  <Link to="/company/pricing">
                    <Button
                      variant="outline"
                      className="px-8 py-5 text-sm font-bold border-white/20 text-white hover:bg-white/5 rounded-sm uppercase tracking-wider"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Enterprise Solutions
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to={getDashboardPath()}>
                  <Button className="px-8 py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider">
                    <Terminal className="w-4 h-4 mr-2" />
                    Access Dashboard
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* Stats - DYNAMIC Data Display from MongoDB */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="max-w-4xl mx-auto"
            >
              {/* Live Monitoring Banner */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF94]"></span>
                  </span>
                  <span className="text-[#00FF94] text-xs font-mono uppercase tracking-wider">
                    Live Monitoring
                  </span>
                </div>
                <span className="text-gray-600 text-[10px] font-mono">
                  Auto-updating every 30s
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-[#111111]/80 border border-white/5 rounded-md">
                <DataCounter
                  target={stats.activeJobs}
                  suffix="+"
                  label="Active Jobs"
                />
                <DataCounter
                  target={stats.companies}
                  suffix="+"
                  label="Companies"
                />
                <DataCounter
                  target={stats.candidates}
                  suffix="+"
                  label="Candidates"
                />
                <DataCounter
                  target={stats.successRate}
                  suffix="%"
                  label="Success Rate"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-8 rounded-sm border border-white/20 flex items-start justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-2 rounded-sm bg-[#FFD700]"
            />
          </div>
        </motion.div>
      </section>

      {/* ========== RECENT LAUNCHES SECTION ========== */}
      <section className="py-20 bg-gradient-to-b from-[#0A0A0A] to-[#111111] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 px-4 py-1.5 bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/20 text-xs font-mono uppercase tracking-widest">
              <Sparkles className="w-3 h-3 mr-2" />
              Just Launched
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              What's <span className="text-[#FFD700]">New</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Video,
                title: "AI Video Interviews",
                desc: "Live HD video with real-time transcription and analysis.",
                tag: "NEW",
                color: "#00FF94",
              },
              {
                icon: Brain,
                title: "Smart MCQ Engine",
                desc: "Auto-generated assessments with fraud detection.",
                tag: "NEW",
                color: "#FFD700",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Real-time hiring metrics and conversion tracking.",
                tag: "UPDATED",
                color: "#00BFFF",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative p-6 bg-[#111111] border border-white/10 rounded-sm group hover:border-white/20 transition-all"
              >
                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
                <Badge
                  className="absolute -top-2 right-4 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider"
                  style={{ backgroundColor: item.color, color: "#000" }}
                >
                  {item.tag}
                </Badge>
                <div
                  className="w-12 h-12 rounded-sm flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon
                    className="w-6 h-6"
                    style={{ color: item.color }}
                  />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#FFD700] transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Link to="/features">
              <Button
                variant="outline"
                className="px-6 py-4 text-sm font-bold border-white/20 text-white hover:bg-white/5 rounded-sm uppercase tracking-wider"
              >
                Explore All Features
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ========== CAPABILITIES SECTION ========== */}
      <section className="py-24 bg-[#0A0A0A] relative">
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge className="mb-6 px-4 py-1.5 bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/20 text-xs font-mono uppercase tracking-widest">
              <Unlock className="w-3 h-3 mr-2" />
              Free Access
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              Candidate <span className="text-[#00FF94]">Toolkit</span>
            </h2>
            <p className="text-gray-500">
              Full-spectrum tools for job seekers. Zero cost.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            <IndustrialFeatureCard
              icon={FileText}
              title="AI Resume Analysis"
              description="Instant feedback on ATS compatibility and optimization suggestions."
              index={0}
            />
            <IndustrialFeatureCard
              icon={Target}
              title="Precision Matching"
              description="ML algorithms connect your profile with relevant opportunities."
              index={1}
            />
            <IndustrialFeatureCard
              icon={Bell}
              title="Real-time Alerts"
              description="Instant notifications when matching positions are posted."
              index={2}
            />
            <IndustrialFeatureCard
              icon={Eye}
              title="Application Tracker"
              description="Monitor application status and employer engagement."
              index={3}
            />
            <IndustrialFeatureCard
              icon={Briefcase}
              title="One-Click Apply"
              description="Streamlined application process across multiple listings."
              index={4}
            />
            <IndustrialFeatureCard
              icon={TrendingUp}
              title="Market Intelligence"
              description="Salary benchmarks and industry trend analysis."
              index={5}
            />
          </div>
        </div>
      </section>

      {/* ========== ENTERPRISE SECTION ========== */}
      <section className="py-24 bg-gradient-to-b from-[#0A0A0A] via-[#111111] to-[#0A0A0A] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FFD700]/5 rounded-full blur-[200px]" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge className="mb-6 px-4 py-1.5 bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20 text-xs font-mono uppercase tracking-widest">
              <Crown className="w-3 h-3 mr-2" />
              Enterprise Grade
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              Recruitment <span className="text-[#FFD700]">Infrastructure</span>
            </h2>
            <p className="text-gray-500">
              Industrial-strength tools for high-performance talent acquisition.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            <IndustrialFeatureCard
              icon={Video}
              title="Live Video Interviews"
              description="HD video conferencing with recording and AI transcription."
              isPro
              index={0}
            />
            <IndustrialFeatureCard
              icon={Brain}
              title="MCQ Assessment Engine"
              description="Custom test creation with auto-grading and analytics."
              isPro
              index={1}
            />
            <IndustrialFeatureCard
              icon={Shield}
              title="Fraud Detection System"
              description="Behavioral analysis and proctoring for test integrity."
              isPro
              index={2}
            />
            <IndustrialFeatureCard
              icon={BarChart3}
              title="Analytics Dashboard"
              description="Real-time pipeline metrics and conversion tracking."
              isPro
              index={3}
            />
            <IndustrialFeatureCard
              icon={Users}
              title="Team Collaboration"
              description="Multi-recruiter access with role-based permissions."
              isPro
              index={4}
            />
            <IndustrialFeatureCard
              icon={Gift}
              title="Offer Management"
              description="Digital offer letters with e-signature integration."
              isPro
              index={5}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/company/pricing">
              <Button className="px-8 py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] shadow-[0_0_30px_rgba(255,215,0,0.15)] rounded-sm uppercase tracking-wider">
                View Pricing Matrix
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ========== FEATURED COMPANIES SECTION ========== */}
      {featuredCompanies.length > 0 && (
        <section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-[#00FF94]/5 rounded-full blur-[150px]" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <Badge className="mb-6 px-4 py-1.5 bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/20 text-xs font-mono uppercase tracking-widest">
                <Building className="w-3 h-3 mr-2" />
                Hiring Now
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                Featured <span className="text-[#00FF94]">Companies</span>
              </h2>
              <p className="text-gray-500">
                Top employers actively recruiting on HIRE.OS
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {featuredCompanies.map((company, index) => (
                <motion.div
                  key={company._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/company/${company._id}`}
                    className="group block p-5 bg-[#111111] border border-white/10 hover:border-[#00FF94]/30 rounded-sm transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10 group-hover:border-[#00FF94]/30 transition-colors" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/10 group-hover:border-[#00FF94]/30 transition-colors" />

                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building className="w-6 h-6 text-[#FFD700]/50" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-bold text-sm truncate group-hover:text-[#00FF94] transition-colors">
                            {company.name}
                          </h3>
                          {company.isVerified && (
                            <Badge className="bg-[#00FF94]/10 text-[#00FF94] text-[9px] px-1.5 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        {company.tagline && (
                          <p className="text-gray-500 text-xs font-mono line-clamp-1 mb-2">
                            {company.tagline}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {company.industry && (
                            <span className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-sm font-mono">
                              {company.industry}
                            </span>
                          )}
                          {company.location && (
                            <span className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-sm font-mono flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {company.location.split(",")[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="absolute bottom-3 right-3 w-6 h-6 flex items-center justify-center text-gray-600 group-hover:text-[#00FF94] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-10"
            >
              <Link to="/browse">
                <Button
                  variant="outline"
                  className="px-6 py-4 text-xs font-bold border-white/20 text-gray-400 hover:border-[#00FF94]/50 hover:text-[#00FF94] rounded-sm uppercase tracking-wider"
                >
                  View All Companies
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ========== SYSTEM PROTOCOL SECTION ========== */}
      <section className="py-24 bg-gradient-to-b from-[#0A0A0A] to-[#111111] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge className="mb-6 px-4 py-1.5 bg-white/10 text-white border-white/20 text-xs font-mono uppercase tracking-widest">
              <Cpu className="w-3 h-3 mr-2" />
              How It Works
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              System <span className="text-[#FFD700]">Protocol</span>
            </h2>
            <p className="text-gray-500">
              Step-by-step workflows for every user type
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* CANDIDATE PROTOCOL */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#111111] border border-[#00FF94]/20 rounded-md p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-[#00FF94]/10 rounded-sm">
                  <User className="w-4 h-4 text-[#00FF94]" />
                </div>
                <h3 className="text-sm font-bold text-[#00FF94] uppercase tracking-wider">
                  Candidate Protocol
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    step: "01",
                    title: "Create Profile",
                    desc: "Sign up free & complete your profile",
                  },
                  {
                    step: "02",
                    title: "Upload Resume",
                    desc: "Get AI-powered resume analysis",
                  },
                  {
                    step: "03",
                    title: "Apply to Jobs",
                    desc: "One-click apply to matching jobs",
                  },
                  {
                    step: "04",
                    title: "Take Assessments",
                    desc: "Complete MCQ tests & interviews",
                  },
                  {
                    step: "05",
                    title: "Get Hired",
                    desc: "Receive offer & accept position",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-[#0A0A0A] border border-white/5 rounded-sm group hover:border-[#00FF94]/30 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-[#00FF94] bg-[#00FF94]/10 px-1.5 py-0.5 rounded-sm">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#00FF94] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/signup" className="block mt-6">
                <Button className="w-full py-4 text-xs font-bold bg-[#00FF94] text-black hover:bg-[#00FF94]/80 rounded-sm uppercase tracking-wider">
                  Start as Candidate
                </Button>
              </Link>
            </motion.div>

            {/* RECRUITER PROTOCOL */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#111111] border border-[#FFD700]/20 rounded-md p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-[#FFD700]/10 rounded-sm">
                  <Users className="w-4 h-4 text-[#FFD700]" />
                </div>
                <h3 className="text-sm font-bold text-[#FFD700] uppercase tracking-wider">
                  Recruiter Protocol
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    step: "01",
                    title: "Join Company",
                    desc: "Get invited or request access",
                  },
                  {
                    step: "02",
                    title: "Post Jobs",
                    desc: "Create detailed job listings",
                  },
                  {
                    step: "03",
                    title: "Screen Candidates",
                    desc: "Review applications & resumes",
                  },
                  {
                    step: "04",
                    title: "Conduct Interviews",
                    desc: "Video calls & MCQ assessments",
                  },
                  {
                    step: "05",
                    title: "Send Offers",
                    desc: "Extend offers to top candidates",
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-[#0A0A0A] border border-white/5 rounded-sm group hover:border-[#FFD700]/30 hover:bg-[#FFD700]/5 transition-all cursor-crosshair"
                  >
                    <span className="text-[10px] font-mono text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded-sm group-hover:bg-[#FFD700] group-hover:text-black transition-colors">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 group-hover:text-gray-400">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Link to="/company/pricing" className="block mt-6">
                <Button className="w-full py-4 text-xs font-bold bg-[#FFD700] text-black hover:bg-[#FFD700]/80 rounded-sm uppercase tracking-wider">
                  Start as Recruiter
                </Button>
              </Link>
            </motion.div>

            {/* ADMIN PROTOCOL */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#111111] border border-[#00BFFF]/20 rounded-md p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-[#00BFFF]/10 rounded-sm">
                  <Crown className="w-4 h-4 text-[#00BFFF]" />
                </div>
                <h3 className="text-sm font-bold text-[#00BFFF] uppercase tracking-wider">
                  Admin Protocol
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    step: "01",
                    title: "Register Company",
                    desc: "Setup organization & profile",
                  },
                  {
                    step: "02",
                    title: "Choose Plan",
                    desc: "Select subscription & features",
                  },
                  {
                    step: "03",
                    title: "Invite Team",
                    desc: "Add recruiters & set permissions",
                  },
                  {
                    step: "04",
                    title: "Configure Settings",
                    desc: "Brand, workflows & integrations",
                  },
                  {
                    step: "05",
                    title: "Monitor & Grow",
                    desc: "Analytics, billing & scaling",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-[#0A0A0A] border border-white/5 rounded-sm group hover:border-[#00BFFF]/30 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-[#00BFFF] bg-[#00BFFF]/10 px-1.5 py-0.5 rounded-sm">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#00BFFF] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/admin/signup" className="block mt-6">
                <Button className="w-full py-4 text-xs font-bold bg-[#00BFFF] text-black hover:bg-[#00BFFF]/80 rounded-sm uppercase tracking-wider">
                  Start as Admin
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS SECTION ========== */}
      <section className="py-24 bg-[#0A0A0A] relative">
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge className="mb-6 px-4 py-1.5 bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20 text-xs font-mono uppercase tracking-widest">
              <Star className="w-3 h-3 mr-2" />
              User Reviews
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              What Users <span className="text-[#FFD700]">Say</span>
            </h2>
            <p className="text-gray-500">
              Real feedback from job seekers and employers using HIRE.OS
            </p>
          </motion.div>

          {reviews.length > 0 ? (
            <div className="relative w-full overflow-hidden">
              {/* Gradient Masks for smooth fade edges */}
              <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />

              <motion.div
                className="flex gap-6 w-max"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  repeat: Infinity,
                  ease: "linear",
                  duration: Math.max(20, reviews.length * 5), // Adjust speed based on content
                }}
              >
                {/* Double the reviews for seamless loop */}
                {[...reviews, ...reviews, ...reviews].map((review, idx) => (
                  <div
                    key={`${review._id}-${idx}`}
                    className="w-[350px] md:w-[450px] flex-shrink-0 relative p-6 bg-[#111111] border border-white/10 group hover:border-[#FFD700]/30 transition-colors"
                  >
                    {/* Industrial Corners */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-[#FFD700] transition-colors" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-[#FFD700] transition-colors" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-[#FFD700] transition-colors" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-[#FFD700] transition-colors" />

                    {/* Header Info */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/5">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? "text-[#FFD700] fill-[#FFD700]" : "text-gray-800"}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        REV_ID::{review._id.slice(-6)}
                      </span>
                    </div>

                    {/* Comment Content */}
                    <div className="mb-6 min-h-[80px]">
                      {review.title && (
                        <h3 className="text-white font-bold text-sm mb-2 uppercase tracking-wide font-mono text-[#00FF94]">
                          {review.title}
                        </h3>
                      )}
                      <p className="text-gray-400 text-sm leading-relaxed font-mono opacity-80">
                        "{review.comment}"
                      </p>
                    </div>

                    {/* User Footer */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="w-10 h-10 bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-[#FFD700]/50 transition-colors">
                        {review.user?.photo ? (
                          <img
                            src={review.user.photo}
                            alt={review.user.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-xs font-bold uppercase tracking-wider">
                            {review.user?.name || "ANONYMOUS"}
                          </p>
                          {review.user?.role === "recruiter" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse" />
                          )}
                        </div>
                        <Badge
                          className={`mt-1 text-[9px] px-1.5 py-0 rounded-none border-0 ${
                            review.user?.role === "company_admin" ||
                            review.user?.role === "super_admin"
                              ? "bg-[#FFD700] text-black hover:bg-[#FFD700]"
                              : review.user?.role === "recruiter"
                                ? "bg-[#00FF94] text-black hover:bg-[#00FF94]"
                                : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {review.user?.role === "company_admin"
                            ? "CORPORATE"
                            : review.user?.role === "super_admin"
                              ? "SYSTEM OPS"
                              : review.user?.role === "recruiter"
                                ? "RECRUITER"
                                : "CANDIDATE"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-16 max-w-2xl mx-auto border border-dashed border-white/10">
              <div className="w-16 h-16 bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Terminal className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono mb-2">
                LOG_EMPTY
              </h3>
              <p className="text-gray-500 font-mono text-xs">
                Waiting for incoming transmission data...
              </p>
            </div>
          )}

          {/* Add Comment Button - Removed for logged-in users since they have the button in navbar */}

          {/* Comment Form Modal */}
          <AnimatePresence>
            {showCommentForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setShowCommentForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#111111] border border-white/10 rounded-md p-8 max-w-lg w-full mx-4 relative"
                >
                  {/* Corner accents */}
                  <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#FFD700]/30" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#FFD700]/30" />

                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#FFD700]" />
                    Share Your Experience
                  </h3>

                  {/* Star Rating */}
                  <div className="mb-6">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-mono">
                      Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCommentRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${star <= commentRating ? "text-[#FFD700] fill-[#FFD700]" : "text-gray-600"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title (optional) */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-mono">
                      Title (optional)
                    </label>
                    <Input
                      value={commentTitle}
                      onChange={(e) => setCommentTitle(e.target.value)}
                      placeholder="Sum up your experience..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-[#FFD700]/50"
                    />
                  </div>

                  {/* Comment */}
                  <div className="mb-6">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-mono">
                      Your Feedback *
                    </label>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your experience with HIRE.OS..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-sm text-white placeholder:text-gray-600 focus:border-[#FFD700]/50 focus:outline-none resize-none"
                    />
                  </div>

                  {/* User Info Display */}
                  <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-sm border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                      {user?.profile?.profilePhoto ? (
                        <img
                          src={user.profile.profilePhoto}
                          alt={user.fullname}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[#FFD700]" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {user?.fullname}
                      </p>
                      <p className="text-gray-500 text-xs">{user?.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowCommentForm(false)}
                      variant="outline"
                      className="flex-1 border-white/10 text-gray-400 hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitComment}
                      disabled={submittingComment || !commentText.trim()}
                      className="flex-1 bg-[#FFD700] text-black hover:bg-[#FFE44D] font-bold"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Submit Review
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-24 bg-gradient-to-b from-[#0A0A0A] to-[#111111] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FFD700]/10 rounded-full blur-[200px]" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
              Initialize <span className="text-[#FFD700]">Operations</span>
            </h2>
            <p className="text-gray-500 mb-4 max-w-xl mx-auto">
              Deploy HIRE.OS for your organization or start your candidate
              profile today.
            </p>

            {/* Student Free Trial Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-sm mb-8">
              <Gift className="w-4 h-4 text-[#00FF94]" />
              <span className="text-[#00FF94] text-sm font-bold">
                Students get 30 days FREE access to all features!
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button className="px-10 py-6 text-base font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] shadow-[0_0_40px_rgba(255,215,0,0.2)] rounded-sm uppercase tracking-wider">
                  Launch System
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              {user && (
                <Button
                  variant="outline"
                  onClick={() => setShowCommentForm(true)}
                  className="px-10 py-6 text-base font-bold border-white/20 text-white hover:bg-white/5 rounded-sm uppercase tracking-wider"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Write a Review
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
