import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import axios from "axios";
import api from "@/utils/api";
import { OTP_API_END_POINT } from "@/utils/constant";
import { setUser } from "../../redux/authSlice";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout, AuthError, CodeField, Field, GoogleButton, PasswordField, Submit, homeFor, useCountdown } from "./AuthLayout";

// Three of: 8+ characters, upper case, lower case, a number, a symbol
const strongEnough = (p) =>
  [p.length >= 8, /[A-Z]/.test(p), /[a-z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length >= 3;

/** Create an account, then confirm the email with a code. */
const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const { signInWithGoogle, isAuthenticated, user } = useAuth();

  const [form, setForm] = useState({ role: "student", fullname: "", email: "", password: "" });
  const [step, setStep] = useState("form"); // form | code
  const [code, setCode] = useState("");
  const [wait, startWait] = useCountdown();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) navigate(homeFor(user));
  }, [isAuthenticated, user, navigate]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const weak = form.password && !strongEnough(form.password);

  const sendCode = async () => {
    await axios.post(`${OTP_API_END_POINT}/send`, { email: form.email, purpose: "signup" });
    startWait();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (weak) return setError("Choose a stronger password.");
    setError("");
    setLoading(true);
    try {
      await sendCode();
      setStep("code");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      await sendCode();
    } catch {
      setError("Couldn't send the code. Try again.");
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${OTP_API_END_POINT}/verify-signup`, {
        email: form.email,
        otp: code,
        fullname: form.fullname,
        password: form.password,
        role: form.role,
      });
      if (!data.success) throw new Error();
      if (data.user) dispatch(setUser(data.user));

      if (referralCode) {
        // A bad referral code never blocks the new account
        api.post("/referral/apply", { code: referralCode }).catch(() => {});
      }

      if (form.role === "company_admin") {
        navigate("/company/pricing", {
          replace: true,
          state: { fromSignup: true, userId: data.user?._id, fullname: form.fullname, email: form.email },
        });
        return;
      }
      if (data.showTrialWelcome) {
        localStorage.setItem("showTrialWelcome", "true");
        localStorage.setItem("trialEndDate", data.trialEndDate);
      }
      toast.success("Your 30-day free trial has started.");
      navigate(homeFor(data.user ?? { role: form.role, fullname: form.fullname }), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "That code didn't work.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    localStorage.setItem("pendingSignupRole", form.role);
    const { error } = await signInWithGoogle().catch((e) => ({ error: e }));
    if (error) {
      localStorage.removeItem("pendingSignupRole");
      setError("Google sign-up didn't work. Try again.");
      setLoading(false);
    }
  };

  if (step === "code") {
    return (
      <AuthLayout title="Check your email">
        <p className="auth-lead">
          We sent a code to <strong>{form.email}</strong>.
        </p>
        <form onSubmit={verify}>
          <CodeField value={code} onChange={setCode} />
          <AuthError>{error}</AuthError>
          <Submit loading={loading} disabled={loading || code.length !== 6}>
            Create account
          </Submit>
          <button type="button" className="auth-text-btn" onClick={resend} disabled={wait > 0}>
            {wait > 0 ? `Send again in ${wait}s` : "Send again"}
          </button>
        </form>
        <button type="button" className="auth-text-btn" onClick={() => setStep("form")}>
          Use a different email
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create an account"
      foot={
        <>
          Have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <div className="auth-seg" role="group" aria-label="I want to">
        {[
          ["student", "Find a job"],
          ["company_admin", "Hire"],
        ].map(([role, label]) => (
          <button key={role} type="button" aria-pressed={form.role === role} onClick={() => setForm((f) => ({ ...f, role }))}>
            {label}
          </button>
        ))}
      </div>

      <GoogleButton onClick={google} disabled={loading} />

      <form onSubmit={submit}>
        <Field label="Full name" autoComplete="name" required value={form.fullname} onChange={set("fullname")} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
        <PasswordField autoComplete="new-password" required minLength={8} value={form.password} onChange={set("password")} aria-describedby={weak ? "pw-rule" : undefined} />
        {weak && (
          <p className="auth-fine" id="pw-rule" style={{ textAlign: "left", marginTop: -8 }}>
            Mix in upper case, numbers or symbols.
          </p>
        )}
        <AuthError>{error}</AuthError>
        <Submit loading={loading}>Continue</Submit>
        <p className="auth-fine">
          By continuing you agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </form>
    </AuthLayout>
  );
};

export default Signup;
