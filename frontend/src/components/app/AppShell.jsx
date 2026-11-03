import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  LayoutGrid,
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
  LogOut,
  Menu,
  X,
} from "lucide-react";
import api from "@/utils/api";
import { USER_API_END_POINT } from "@/utils/constant";
import { logout } from "@/redux/authSlice";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "../notifications/NotificationCenter";
import { ShellContext } from "./shellContext";
import "./app.css";

/** Navigation per role: the screens each person actually works in. */
const NAV = {
  company_admin: [
    {
      items: [
        ["Overview", "/company/admin/dashboard", LayoutGrid],
        ["Jobs", "/admin/jobs", Briefcase],
        ["Applications", "/admin/applications", Users],
        ["Interviews", "/admin/interviews", Video],
        ["Analytics", "/admin/analytics", BarChart3],
        ["Messages", "/ceo/messages", MessageSquare],
      ],
    },
    {
      label: "Company",
      items: [
        ["Settings", "/company/settings", Settings],
        ["Billing", "/company/billing", CreditCard],
      ],
    },
  ],
  recruiter: [
    {
      items: [
        ["Overview", "/recruiter/dashboard", LayoutGrid],
        ["Applicants", "/recruiter/applicants", Users],
        ["Jobs", "/recruiter/jobs", Briefcase],
        ["Pipeline", "/recruiter/pipeline", Columns3],
        ["Interviews", "/recruiter/interviews", Video],
        ["Talent pool", "/recruiter/talent-pool", Library],
        ["Messages", "/recruiter/messages", MessageSquare],
      ],
    },
    {
      label: "Tools",
      items: [
        ["Assessments", "/recruiter/assessments", ClipboardList],
        ["Email templates", "/recruiter/email-templates", Mail],
        ["Job templates", "/recruiter/job-templates", FileText],
      ],
    },
  ],
  student: [
    {
      items: [
        ["Overview", "/student/dashboard", LayoutGrid],
        ["Find jobs", "/jobs", Search],
        ["Applications", "/applied-jobs", FileCheck],
        ["Resume analysis", "/resume-analyzer", FileText],
        ["Career tools", "/student/career", Library],
        ["Interview practice", "/interview-prep", Mic],
        ["Messages", "/messages", MessageSquare],
      ],
    },
    {
      label: "You",
      items: [
        ["Profile", "/profile", User],
        ["Settings", "/settings", Settings],
      ],
    },
  ],
};

const ROLE_NAME = { company_admin: "Owner", recruiter: "Recruiter", student: "Candidate" };

export const Mark = () => (
  <span className="app-wordmark">
    <span className="app-mark" aria-hidden="true" />
    HIRE.OS
  </span>
);

/**
 * The shell for the screens people work in: a sidebar and a top bar on one
 * ground, divided by 1px rules (ruled T-frame). The top bar names the scope
 * and the screen, and holds notifications and the account.
 */
const AppShell = ({ title, scope, children }) => {
  const { user } = useSelector((s) => s.auth);
  const { signOut } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = NAV[user?.role] ?? NAV.student;

  useEffect(() => setMenuOpen(false), [location.pathname]);

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

  const nav = (
    <nav aria-label="Main" className="app-nav">
      {groups.map((g, i) => (
        <div key={g.label ?? i} className="app-nav-group">
          {g.label && <div className="app-nav-label">{g.label}</div>}
          {g.items.map(([label, to, Icon]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `app-nav-item${isActive ? " is-active" : ""}`}>
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="app-account">
      <div className="app-avatar" aria-hidden="true">
        {user?.fullname?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="app-account-text">
        <div className="app-account-name">{user?.fullname ?? "Signed in"}</div>
        <div className="app-meta">{ROLE_NAME[user?.role] ?? "Member"}</div>
      </div>
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
        {nav}
        <div className="app-side-foot">{account}</div>
      </aside>

      <header className="app-top">
        <button type="button" className="app-icon-btn app-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
          <Menu aria-hidden="true" />
        </button>
        <div className="app-crumb">
          {scope && <span className="app-crumb-scope">{scope}</span>}
          {scope && <span className="app-crumb-sep" aria-hidden="true">/</span>}
          <span className="app-crumb-page">{title}</span>
        </div>
        <div className="app-top-right">
          <NotificationBell />
        </div>
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
          {nav}
          <div className="app-side-foot">{account}</div>
        </div>
      )}
    </div>
  );
};

export default AppShell;
