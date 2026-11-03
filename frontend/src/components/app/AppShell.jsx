import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Sun,
  Briefcase,
  Users,
  Video,
  BarChart3,
  MessageSquare,
  Settings,
  CreditCard,
  Columns3,
  Library,
  ClipboardList,
  Mail,
  FileText,
  Search,
  FileCheck,
  Mic,
  User,
  UsersRound,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import api from "@/utils/api";
import { USER_API_END_POINT } from "@/utils/constant";
import { logout } from "@/redux/authSlice";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "../notifications/NotificationCenter";
import { ShellContext } from "./shellContext";
import "./app.css";

/**
 * Navigation per role: the daily work first, everything else under More.
 * Each entry is [label, path, icon].
 */
const NAV = {
  company_admin: {
    main: [
      ["Today", "/company/admin/dashboard", Sun],
      ["Jobs", "/admin/jobs", Briefcase],
      ["Applicants", "/admin/applications", Users],
      ["Interviews", "/admin/interviews", Video],
      ["Team", "/company/team", UsersRound],
      ["Messages", "/ceo/messages", MessageSquare],
    ],
    more: [
      ["Analytics", "/admin/analytics", BarChart3],
      ["Settings", "/company/settings", Settings],
      ["Billing", "/company/billing", CreditCard],
    ],
  },
  recruiter: {
    main: [
      ["Today", "/recruiter/dashboard", Sun],
      ["Applicants", "/recruiter/applicants", Users],
      ["Interviews", "/recruiter/interviews", Video],
      ["Jobs", "/recruiter/jobs", Briefcase],
      ["Messages", "/recruiter/messages", MessageSquare],
    ],
    more: [
      ["Pipeline board", "/recruiter/pipeline", Columns3],
      ["Talent pool", "/recruiter/talent-pool", Library],
      ["Assessments", "/recruiter/assessments", ClipboardList],
      ["Email templates", "/recruiter/email-templates", Mail],
      ["Job templates", "/recruiter/job-templates", FileText],
    ],
  },
  student: {
    main: [
      ["Today", "/student/dashboard", Sun],
      ["Jobs", "/jobs", Search],
      ["Applications", "/applied-jobs", FileCheck],
      ["Messages", "/messages", MessageSquare],
    ],
    more: [
      ["Resume analysis", "/resume-analyzer", FileText],
      ["Interview practice", "/interview-prep", Mic],
      ["Career tools", "/student/career", Library],
      ["Profile", "/profile", User],
      ["Settings", "/settings", Settings],
    ],
  },
};

export const Mark = () => (
  <span className="app-wordmark">
    <span className="app-mark" aria-hidden="true" />
    HIRE.OS
  </span>
);

const NavItem = ([label, to, Icon]) => (
  <NavLink key={to} to={to} end className={({ isActive }) => `app-nav-item${isActive ? " is-active" : ""}`}>
    <Icon aria-hidden="true" />
    {label}
  </NavLink>
);

/**
 * The shell for the screens people work in: one sidebar with the product,
 * the work and the account. No top bar on desktop: the page's own title
 * names it. Below 1024px a slim bar opens the same navigation as a sheet.
 */
const AppShell = ({ title, children }) => {
  const { user } = useSelector((s) => s.auth);
  const { signOut } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = NAV[user?.role] ?? NAV.student;
  const inMore = nav.more.some(([, to]) => location.pathname.startsWith(to));
  const [moreOpen, setMoreOpen] = useState(inMore);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (title) document.title = `${title} · HIRE.OS`;
  }, [title]);

  const signOutHandler = async () => {
    try {
      await signOut();
      await api.get(`${USER_API_END_POINT}/logout`).catch(() => {});
    } finally {
      dispatch(logout());
      localStorage.removeItem("token");
      localStorage.removeItem("pendingSignupRole");
      toast.success("Signed out");
      navigate("/", { replace: true });
    }
  };

  const navigation = (
    <nav aria-label="Main" className="app-nav">
      <div className="app-nav-group">{nav.main.map(NavItem)}</div>
      <div className="app-nav-group">
        <button type="button" className="app-nav-item app-more" aria-expanded={moreOpen || inMore} onClick={() => setMoreOpen((o) => !o)}>
          <ChevronRight aria-hidden="true" className={moreOpen || inMore ? "is-open" : ""} />
          More
        </button>
        {(moreOpen || inMore) && nav.more.map(NavItem)}
      </div>
    </nav>
  );

  const foot = (
    <div className="app-side-foot">
      <div className="app-avatar" aria-hidden="true">
        {user?.fullname?.[0]?.toUpperCase() ?? "?"}
      </div>
      <span className="app-account-name">{user?.fullname ?? "Signed in"}</span>
      <NotificationBell />
      <button type="button" className="app-icon-btn" onClick={signOutHandler} aria-label="Sign out" title="Sign out">
        <LogOut aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="app">
      <aside className="app-side">
        <NavLink to="/" className="app-brand" aria-label="HIRE.OS home">
          <Mark />
        </NavLink>
        {navigation}
        {foot}
      </aside>

      <header className="app-top">
        <button type="button" className="app-icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
          <Menu aria-hidden="true" />
        </button>
        <span className="app-top-title">{title}</span>
        <NotificationBell />
      </header>

      <main className="app-canvas" id="main">
        <ShellContext.Provider value={true}>{children}</ShellContext.Provider>
      </main>

      {menuOpen && (
        <div className="app-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="app-sheet-head">
            <Mark />
            <button type="button" className="app-icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X aria-hidden="true" />
            </button>
          </div>
          {navigation}
          {foot}
        </div>
      )}
    </div>
  );
};

export default AppShell;
