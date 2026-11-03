import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout, AuthError, CodeField, Field, GoogleButton, PasswordField, Submit, homeFor, useCountdown } from "./AuthLayout";

/** Sign in with a password, or with a code sent by email. The account knows its own role. */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, sendOTP, verifyOTP, isAuthenticated, user } = useAuth();

  const [mode, setMode] = useState("password"); // password | code
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [wait, startWait] = useCountdown();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) navigate(location.state?.from?.pathname || homeFor(user), { replace: true });
  }, [isAuthenticated, user, navigate, location]);

  const run = async (fn) => {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithPassword = (e) => {
    e.preventDefault();
    run(async () => {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      if (data?.requirePasswordChange || data?.user?.mustChangePassword) {
        navigate("/change-password", { state: { email: data?.user?.email || email }, replace: true });
        return;
      }
      navigate(location.state?.from?.pathname || homeFor(data?.user), { replace: true });
    });
  };

  const sendCode = (e) => {
    e?.preventDefault();
    run(async () => {
      const { error } = await sendOTP(email);
      if (error) throw error;
      setCodeSent(true);
      startWait();
    });
  };

  const verifyCode = (e) => {
    e.preventDefault();
    run(async () => {
      const { error } = await verifyOTP(email, code);
      if (error) throw error;
      navigate("/");
    });
  };

  const google = () =>
    run(async () => {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    });

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setCodeSent(false);
    setCode("");
  };

  const emailField = (
    <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} readOnly={codeSent} />
  );

  return (
    <AuthLayout
      title="Sign in"
      foot={
        <>
          No account? <Link to="/signup">Create one</Link>
        </>
      }
    >
      <GoogleButton onClick={google} disabled={loading} />

      {mode === "password" ? (
        <form onSubmit={signInWithPassword}>
          {emailField}
          <PasswordField
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aside={<Link to="/forgot-password">Forgot?</Link>}
          />
          <AuthError>{error}</AuthError>
          <Submit loading={loading}>Sign in</Submit>
        </form>
      ) : !codeSent ? (
        <form onSubmit={sendCode}>
          {emailField}
          <AuthError>{error}</AuthError>
          <Submit loading={loading}>Email me a code</Submit>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          {emailField}
          <CodeField value={code} onChange={setCode} />
          <AuthError>{error}</AuthError>
          <Submit loading={loading} disabled={loading || code.length !== 6}>
            Sign in
          </Submit>
          <button type="button" className="auth-text-btn" onClick={() => sendCode()} disabled={wait > 0 || loading}>
            {wait > 0 ? `Send again in ${wait}s` : "Send again"}
          </button>
        </form>
      )}

      <button type="button" className="auth-text-btn" onClick={() => switchMode(mode === "password" ? "code" : "password")}>
        {mode === "password" ? "Sign in with an email code" : "Sign in with a password"}
      </button>
    </AuthLayout>
  );
};

export default Login;
