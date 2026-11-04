import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "./auth.css";

/** Where each role lands after signing in. */
export const homeFor = (user) => {
  if (user?.role === "company_admin") return "/company/admin/dashboard";
  const slug = user?.fullname?.replace(/\s+/g, "-").toLowerCase() || "dashboard";
  return user?.role === "recruiter" ? `/recruiter/${slug}` : `/student/${slug}`;
};

/** One column on the page ground: the wordmark, the title, the form, one way out. */
export const AuthLayout = ({ title, children, foot }) => {
  useEffect(() => {
    document.title = `${title} · HIRE.OS`;
  }, [title]);

  return (
    <div className="auth">
      <Link to="/" className="auth-brand" aria-label="HIRE.OS home">
        <span className="auth-mark" aria-hidden="true" />
        HIRE.OS
      </Link>
      <main className="auth-col">
        <h1 className="auth-h1">{title}</h1>
        {children}
        {foot && <p className="auth-foot">{foot}</p>}
      </main>
    </div>
  );
};

export const Field = ({ label, aside, ...input }) => (
  <label className="auth-field">
    <span className="auth-label">
      {label}
      {aside}
    </span>
    <input className="auth-input" {...input} />
  </label>
);

export const PasswordField = ({ label = "Password", aside, ...input }) => {
  const [shown, setShown] = useState(false);
  return (
    <label className="auth-field">
      <span className="auth-label">
        {label}
        {aside}
      </span>
      <span className="auth-input-wrap">
        <input className="auth-input" type={shown ? "text" : "password"} {...input} />
        <button type="button" className="auth-reveal" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"}>
          {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
};

/** One box for the six digits: paste and the phone's code autofill both work. */
export const CodeField = ({ value, onChange }) => (
  <label className="auth-field">
    <span className="auth-label">Code</span>
    <input
      className="auth-input auth-code"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      required
      autoFocus
    />
  </label>
);

export const Submit = ({ loading, children, ...rest }) => (
  <button type="submit" className="auth-btn auth-btn-primary" disabled={loading} {...rest}>
    {loading ? "One moment…" : children}
  </button>
);

export const AuthError = ({ children }) =>
  children ? (
    <p className="auth-error" role="alert">
      {children}
    </p>
  ) : null;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export const GoogleButton = ({ onClick, disabled }) => (
  <>
    <button type="button" className="auth-btn" onClick={onClick} disabled={disabled}>
      <GoogleIcon />
      Continue with Google
    </button>
    <div className="auth-or" aria-hidden="true">
      or
    </div>
  </>
);

/** A 60-second wait before a code can be sent again. */
export const useCountdown = () => {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(60)];
};
