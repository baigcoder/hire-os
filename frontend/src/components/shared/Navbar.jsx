import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";
import { USER_API_END_POINT, MESSAGE_API_END_POINT } from "@/utils/constant";
import api from "@/utils/api";
import { toast } from "sonner";
import { logout } from "@/redux/authSlice";
import { useAuth } from "../../context/AuthContext";
import {
  Building,
  Briefcase,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  CreditCard,
  Terminal,
  PenLine,
  MessageSquare,
  Calendar,
} from "lucide-react";
import AddReviewModal from "./AddReviewModal";
import { useInShell } from "../app/shellContext";

const NavbarBar = () => {
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
      } catch {
        // sign-out continues even if this step fails
      }
      localStorage.removeItem("token");
      localStorage.removeItem("pendingSignupRole");
      toast.success("Signed out");
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
    ? user?.fullname.replace(/\s+/g, "-").toLowerCase()
    : "dashboard";

  const isCompanyAdmin = user?.role === "company_admin";

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
          path: "/ceo/messages",
          label: "Messages",
          icon: MessageSquare,
        },
        { path: "/company/pricing", label: "Pricing", icon: CreditCard },
      ]
      : [
        // Recruiter navbar - no Jobs or Pricing (managed by CEO)
        {
          path: `/recruiter/${nameSlug}`,
          label: "Dashboard",
          icon: Terminal,
        },
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
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-background/90 backdrop-blur-lg border-b border-white/5 py-3" : "bg-transparent py-5"}`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* HIRE.OS Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-black font-black text-sm tracking-tighter transition-all duration-300">
              H.
            </div>
            <span className="text-lg font-bold text-white tracking-tight group-hover:text-primary transition-colors">
              HIRE<span className="text-primary">.OS</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn &&
              navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isActive(link.path) ? "text-primary" : "text-gray-400 hover:text-white"}`}
                >
                  <link.icon size={14} strokeWidth={2.5} />
                  {link.label}
                </Link>
              ))}

            {!isLoggedIn && (
              <>
                <Link
                  to="/browse"
                  className={`text-sm font-medium transition-colors ${isActive("/browse") ? "text-primary" : "text-gray-400 hover:text-white"}`}
                >
                  Browse
                </Link>
                <Link
                  to="/company/pricing"
                  className={`text-sm font-medium transition-colors ${isActive("/company/pricing") ? "text-primary" : "text-gray-400 hover:text-white"}`}
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
                    to="/ceo/messages"
                    className="relative p-2 rounded-md hover:bg-white/5 transition-colors text-gray-400 hover:text-primary border border-transparent hover:border-primary/30"
                    title="Messages"
                  >
                    <MessageSquare size={18} />
                    {unreadMessageCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Notifications - hide for recruiters */}
                {user?.role !== "recruiter" && (
                  <button className="relative p-2 rounded-md hover:bg-white/5 transition-colors text-gray-400 hover:text-white border border-transparent hover:border-white/10">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full"></span>
                  </button>
                )}

                {/* Write Review - hide for recruiters */}
                {user?.role !== "recruiter" && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="relative p-2 rounded-md hover:bg-white/5 transition-colors text-gray-400 hover:text-primary border border-transparent hover:border-primary/30"
                    title="Write a Review"
                  >
                    <PenLine size={18} />
                  </button>
                )}

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 pl-3 pr-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:border-primary/30"
                  >
                    <span className="hidden sm:inline text-sm font-medium text-gray-300">
                      {user?.fullname?.split(" ")[0]?.toUpperCase()}
                    </span>
                    <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center text-black font-bold text-xs">
                      {user?.fullname?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-card rounded-md shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-4 border-b border-white/5 bg-white/5">
                        <p className="text-sm font-bold text-white truncate">
                          {user?.fullname?.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.email}
                        </p>
                      </div>

                      <div className="p-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-md transition-colors hover:text-primary font-medium"
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
                    className="hidden sm:inline-flex text-gray-300 hover:text-primary hover:bg-transparent px-3 font-medium text-sm"
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-primary text-black font-bold hover:bg-[#FFE44D] transition-all rounded-md px-5 text-sm">
                    Get Access
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-white hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-white/10 animate-in slide-in-from-top-5 duration-200 z-[60]">
            <div className="p-4 space-y-2">
              {isLoggedIn ? (
                navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium ${isActive(link.path) ? "bg-primary/10 text-primary" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
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
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Briefcase size={16} />
                    Find Jobs
                  </Link>
                  <Link
                    to="/browse"
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
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
          className="fixed inset-0 z-40 bg-black/30"
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

// Inside the app shell the shell's own navigation takes over
const Navbar = () => (useInShell() ? null : <NavbarBar />);

export default Navbar;
