import { Link, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { useInShell } from "../app/shellContext";
import "./navbar.css";

const DASHBOARD = { company_admin: "/company/admin/dashboard", recruiter: "/recruiter/dashboard", student: "/student/dashboard" };

/**
 * The bar on public pages: the wordmark and three plain links, the same as
 * the landing page's. Signed in, Sign in becomes Dashboard; signing out
 * happens inside the app. Inside the app frame it isn't drawn at all.
 */
const NavbarBar = () => {
  const { user } = useSelector((s) => s.auth);
  const link = ({ isActive }) => `pub-nav-link${isActive ? " is-active" : ""}`;
  return (
    <header className="pub-nav">
      <Link to="/" className="pub-nav-mark" aria-label="HIRE.OS home">
        <span className="pub-nav-square" aria-hidden="true" />
        HIRE.OS
      </Link>
      <nav aria-label="Main" className="pub-nav-links">
        <NavLink to="/jobs" className={link}>
          Jobs
        </NavLink>
        <NavLink to="/company/pricing" className={link}>
          Pricing
        </NavLink>
        {user ? (
          <Link to={DASHBOARD[user.role] ?? "/student/dashboard"} className="pub-nav-link pub-nav-strong">
            Dashboard
          </Link>
        ) : (
          <NavLink to="/login" className={link}>
            Sign in
          </NavLink>
        )}
      </nav>
    </header>
  );
};

const Navbar = () => (useInShell() ? null : <NavbarBar />);

export default Navbar;
