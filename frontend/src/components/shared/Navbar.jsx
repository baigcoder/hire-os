import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";
import { USER_API_END_POINT, MESSAGE_API_END_POINT } from "@/utils/constant";
import api from "@/utils/api";
import { toast } from "sonner";
import { setUser, logout } from "@/redux/authSlice";
import { useAuth } from "../../context/AuthContext";
import {
  Building,
  Briefcase,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  CreditCard,
  Terminal,
  PenLine,
  MessageSquare,
  Calendar,
} from "lucide-react";
import AddReviewModal from "./AddReviewModal";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);
  const { signOut } = useAuth();
  const isLoggedIn = !!user;
  const isStudent = user?.role === "student";

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch unread message count for CEO/admin
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?.role === "company_admin") {
        try {
          const res = await api.get(`${MESSAGE_API_END_POINT}/unread-count`);
          if (res.data.success) {
            setUnreadMessageCount(res.data.data?.unreadCount || 0);
          }
        } catch (err) {
          // Silently fail
        }
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const logoutHandler = async () => {
    try {
      await signOut();
      try {
        await api.get(`${USER_API_END_POINT}/logout`);
      } catch (e) { }
      localStorage.removeItem("token");
      localStorage.removeItem("pendingSignupRole");
      toast.success("System logout complete");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      dispatch(logout());
      localStorage.removeItem("token");
      toast.success("Logged out");
      navigate("/", { replace: true });
    }
  };

  const isActive = (path) => location.pathname === path;

  const nameSlug = user?.fullname
    ? user.fullname.replace(/\s+/g, "-").toLowerCase()
    : "dashboard";

  const isCompanyAdmin = user?.role === "company_admin";
  const isRecruiter = user?.role === "recruiter";

  const navLinks = isStudent
    ? [
      { path: `/student/${nameSlug}`, label: "Dashboard", icon: Terminal },
      { path: "/browse", label: "Browse", icon: Search },
      { path: "/applied-jobs", label: "Applications", icon: Briefcase },
    ]
    : isCompanyAdmin
      ? [
        {
          path: "/company/admin/dashboard",
          label: "Dashboard",
          icon: Terminal,
        },
        { path: "/admin/jobs", label: "Jobs", icon: Briefcase },
        { path: "/admin/companies", label: "Companies", icon: Building },
        {
          path: "/recruiter/messages",
          label: "Messages",
          icon: MessageSquare,
        },
        { path: "/company/pricing", label: "Pricing", icon: CreditCard },
      ]
      : [
        // Recruiter navbar - no Pricing (subscription managed by CEO)
        {
          path: `/recruiter/${nameSlug}`,
          label: "Dashboard",
          icon: Terminal,
        },
        { path: "/admin/jobs", label: "Jobs", icon: Briefcase },
        {
          path: "/recruiter/interviews",
          label: "Interviews",
          icon: Calendar,
        },
        {
          path: "/recruiter/messages",
          label: "Messages",
          icon: MessageSquare,
        },
      ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 font-['Space_Grotesk',sans-serif] ${isScrolled ? "bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/5 py-3" : "bg-transparent py-5"}`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* HIRE.OS Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-md bg-[#FFD700] flex items-center justify-center text-black font-black text-sm tracking-tighter shadow-[0_0_20px_rgba(255,215,0,0.3)] group-hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all duration-300">
              H.
            </div>
            <span className="text-lg font-bold text-white tracking-tight group-hover:text-[#FFD700] transition-colors">
              HIRE<span className="text-[#FFD700]">.OS</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn &&
              navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors uppercase tracking-wide ${isActive(link.path) ? "text-[#FFD700]" : "text-gray-400 hover:text-white"}`}
                >
                  <link.icon size={14} strokeWidth={2.5} />
                  {link.label}
                </Link>
              ))}

            {!isLoggedIn && (
              <>
                <Link
                  to="/browse"
                  className={`text-sm font-medium transition-colors uppercase tracking-wide ${isActive("/browse") ? "text-[#FFD700]" : "text-gray-400 hover:text-white"}`}
                >
                  Browse
                </Link>
                <Link
                  to="/company/pricing"
                  className={`text-sm font-medium transition-colors uppercase tracking-wide ${isActive("/company/pricing") ? "text-[#FFD700]" : "text-gray-400 hover:text-white"}`}
                >
                  Pricing
                </Link>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Messages Badge - CEO only */}
                {user?.role === "company_admin" && (
                  <Link
                    to="/recruiter/messages"
                    className="relative p-2 rounded-md hover:bg-white/5 transition-colors text-gray-400 hover:text-[#FFD700] border border-transparent hover:border-[#FFD700]/30"
                    title="Messages"
                  >
                    <MessageSquare size={18} />
                    {unreadMessageCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Notifications */}
                <button className="relative p-2 rounded-md hover:bg-white/5 transition-colors text-gray-400 hover:text-white border border-transparent hover:border-white/10">
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#00FF94] rounded-full"></span>
                </button>

                {/* Write Review */}
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="relative p-2 rounded-md hover:bg-white/5 transition-colors text-gray-400 hover:text-[#FFD700] border border-transparent hover:border-[#FFD700]/30"
                  title="Write a Review"
                >
                  <PenLine size={18} />
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 pl-3 pr-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:border-[#FFD700]/30"
                  >
                    <span className="hidden sm:inline text-sm font-medium text-gray-300 font-mono">
                      {user?.fullname?.split(" ")[0]?.toUpperCase()}
                    </span>
                    <div className="w-7 h-7 rounded-sm bg-[#FFD700] flex items-center justify-center text-black font-bold text-xs">
                      {user?.fullname?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-[#111111] rounded-md shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-4 border-b border-white/5 bg-white/5">
                        <p className="text-sm font-bold text-white truncate font-mono">
                          {user?.fullname?.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-mono">
                          {user?.email}
                        </p>
                      </div>

                      <div className="p-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-md transition-colors hover:text-[#FFD700] font-medium"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User size={14} />
                          Profile Settings
                        </Link>

                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            logoutHandler();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors mt-2 font-medium"
                        >
                          <LogOut size={14} />
                          System Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="hidden sm:inline-flex text-gray-300 hover:text-[#FFD700] hover:bg-transparent px-3 font-medium uppercase tracking-wide text-sm"
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-[#FFD700] text-black font-bold hover:bg-[#FFE44D] hover:shadow-[0_0_25px_rgba(255,215,0,0.4)] transition-all rounded-md px-5 uppercase tracking-wide text-sm">
                    Get Access
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-white hover:text-[#FFD700] transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#0A0A0A] border-b border-white/10 animate-in slide-in-from-top-5 duration-200 z-[60]">
            <div className="p-4 space-y-2">
              {isLoggedIn ? (
                navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors uppercase tracking-wide text-sm font-medium ${isActive(link.path) ? "bg-[#FFD700]/10 text-[#FFD700]" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <link.icon size={16} />
                    {link.label}
                  </Link>
                ))
              ) : (
                <>
                  <Link
                    to="/jobs"
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-gray-400 hover:bg-white/5 hover:text-white transition-colors uppercase tracking-wide text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Briefcase size={16} />
                    Find Jobs
                  </Link>
                  <Link
                    to="/browse"
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-gray-400 hover:bg-white/5 hover:text-white transition-colors uppercase tracking-wide text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Search size={16} />
                    Browse
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Click outside to close menus */}
      {(showUserMenu || mobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => {
            setShowUserMenu(false);
            setMobileMenuOpen(false);
          }}
        />
      )}

      {/* Review Modal */}
      <AddReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />
    </>
  );
};

export default Navbar;
