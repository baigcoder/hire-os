import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/authSlice";
import { toast } from "sonner";
import axios from "axios";
import { OTP_API_END_POINT } from "@/utils/constant";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  User,
  CheckCircle2,
  XCircle,
  Shield,
  AlertCircle,
  Phone,
  ArrowLeft,
  Terminal,
  Building,
} from "lucide-react";

// Google Icon
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { signInWithGoogle, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [step, setStep] = useState("form");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      const nameSlug = user.fullname
        ? user.fullname.replace(/\s+/g, "-").toLowerCase()
        : "dashboard";
      if (user.role === "company_admin") {
        navigate("/company/admin/dashboard");
      } else if (user.role === "recruiter") {
        navigate(`/recruiter/${nameSlug}`);
      } else {
        navigate(`/student/${nameSlug}`);
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  useEffect(() => {
    const password = formData.password;
    const strength = {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      score: 0,
    };
    strength.score = [
      strength.hasMinLength,
      strength.hasUppercase,
      strength.hasLowercase,
      strength.hasNumber,
      strength.hasSpecial,
    ].filter(Boolean).length;
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.fullname || !formData.email || !formData.password) {
      setError("Fill all required fields");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (passwordStrength.score < 3) {
      setError("Password too weak");
      return;
    }
    if (!acceptTerms) {
      setError("Accept terms to continue");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${OTP_API_END_POINT}/send`, {
        email: formData.email,
        purpose: "signup",
      });
      if (response.data.success) {
        setStep("otp");
        setOtpTimer(60);
        toast.success("OTP transmitted");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    setOtpCode(
      pastedData.split("").concat(Array(6 - pastedData.length).fill("")),
    );
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await axios.post(`${OTP_API_END_POINT}/send`, {
        email: formData.email,
        purpose: "signup",
      });
      setOtpTimer(60);
      toast.success("OTP resent");
    } catch (err) {
      setError("Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpCode.join("");
    if (otp.length !== 6) {
      setError("Enter complete code");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${OTP_API_END_POINT}/verify-signup`, {
        email: formData.email,
        otp: otp,
        fullname: formData.fullname,
        phoneNumber: formData.phone,
        password: formData.password,
        role: formData.role,
      });
      if (response.data.success) {
        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
        }
        if (response.data.user) {
          dispatch(setUser(response.data.user));
        }

        // Role-based redirect after signup
        const nameSlug = formData.fullname.replace(/\s+/g, "-").toLowerCase();

        if (formData.role === "company_admin") {
          // CEO flow: Redirect to pricing page first
          toast.success("Account created! Select a subscription plan.");
          navigate("/company/pricing", {
            replace: true,
            state: {
              fromSignup: true,
              userId: response.data.user._id,
              fullname: formData.fullname,
              email: formData.email,
            },
          });
        } else if (formData.role === "student") {
          // Student flow: Store trial info and redirect to dashboard
          if (response.data.showTrialWelcome) {
            localStorage.setItem("showTrialWelcome", "true");
            localStorage.setItem("trialEndDate", response.data.trialEndDate);
          }
          toast.success("Welcome! Your 30-day free trial has started.");
          navigate(`/student/${nameSlug}`, { replace: true });
        } else {
          // Recruiter flow
          toast.success("Account initialized");
          navigate(`/recruiter/${nameSlug}`, { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      // DEBUG: Log the role being stored
      console.log("🔐 Google Signup - Storing pendingRole:", formData.role);
      localStorage.setItem("pendingSignupRole", formData.role);
      console.log("🔐 Stored pendingRole:", localStorage.getItem("pendingSignupRole"));
      await signInWithGoogle();
    } catch (err) {
      setError("Google sign-up failed");
      localStorage.removeItem("pendingSignupRole");
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return "bg-red-500";
    if (passwordStrength.score <= 3) return "bg-yellow-500";
    return "bg-[#00FF94]";
  };

  // OTP Verification Step
  if (step === "otp") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] flex items-center justify-center p-6">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-[#111111] border border-white/10 rounded-sm p-8 relative">
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />

            <button
              onClick={() => setStep("form")}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-xs uppercase tracking-wider mb-6"
            >
              <ArrowLeft size={14} /> Back
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto rounded-sm bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center mb-4">
                <Mail size={20} className="text-[#FFD700]" />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-wider mb-2">
                Verify Email
              </h2>
              <p className="text-gray-600 text-xs font-mono">
                Code sent to{" "}
                <span className="text-white">{formData.email}</span>
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/50 rounded-sm text-red-400 text-xs mb-4">
                <AlertCircle size={14} />
                <span className="font-mono">{error}</span>
              </div>
            )}

            <div className="flex gap-2 justify-center mb-4">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digit && idx > 0)
                      document.getElementById(`otp-${idx - 1}`)?.focus();
                  }}
                  className="w-10 h-12 text-center text-lg font-mono font-bold rounded-sm border border-white/10 bg-white/5 text-[#FFD700] focus:outline-none focus:border-[#FFD700] transition-all"
                />
              ))}
            </div>

            <div className="text-center mb-4">
              {otpTimer > 0 ? (
                <p className="text-xs text-gray-600 font-mono">
                  Resend in <span className="text-[#FFD700]">{otpTimer}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-xs text-[#FFD700] hover:underline font-mono"
                >
                  Resend
                </button>
              )}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otpCode.join("").length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold text-xs uppercase tracking-wider rounded-sm shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Initialize Account <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Form
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] flex">
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex lg:w-1/2 bg-[#050505] p-12 flex-col justify-between relative border-r border-white/5"
      >
        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#FFD700]/30" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#FFD700]/30" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#FFD700]/30" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#FFD700]/30" />

        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-sm bg-[#FFD700] flex items-center justify-center text-black font-black text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            H.
          </div>
          <span className="text-xl font-bold tracking-tight">
            HIRE<span className="text-[#FFD700]">.OS</span>
          </span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#FFD700] font-mono mb-3">
              // New User Registration
            </p>
            <h1 className="text-4xl font-bold uppercase tracking-tight mb-4">
              Initialize
              <br />
              <span className="text-[#FFD700]">Profile</span>
            </h1>
            <p className="text-gray-500 text-sm font-mono max-w-sm">
              Create your account to access industrial-grade career tools.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Shield, text: "Secure authentication" },
              { icon: Terminal, text: "AI-powered matching" },
              { icon: CheckCircle2, text: "Verified employers" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-gray-500">
                <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center">
                  <item.icon size={14} className="text-[#FFD700]" />
                </div>
                <span className="text-xs uppercase tracking-wider">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-700 text-[10px] font-mono uppercase tracking-wider relative z-10">
          © {new Date().getFullYear()} HIRE.OS
        </p>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#111111] border border-white/10 rounded-sm p-6 relative">
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />

            <div className="lg:hidden text-center mb-4">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-sm bg-[#FFD700] flex items-center justify-center text-black font-bold text-xs">
                  H.
                </div>
                <span className="text-lg font-bold">
                  HIRE<span className="text-[#FFD700]">.OS</span>
                </span>
              </Link>
            </div>

            <div className="text-center mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider mb-1">
                Create Account
              </h2>
              <p className="text-gray-600 text-xs font-mono">
                Have an account?{" "}
                <Link to="/login" className="text-[#FFD700] hover:underline">
                  Sign In
                </Link>
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-900/50 rounded-sm text-red-400 text-xs mb-4">
                <AlertCircle size={14} />
                <span className="font-mono">{error}</span>
              </div>
            )}

            {/* Role Selection */}
            <div className="mb-4">
              <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2 block">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "student" })}
                  className={`p-3 border rounded-sm text-center transition-all ${formData.role === "student"
                      ? "border-[#00FF94] bg-[#00FF94]/10 text-[#00FF94]"
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                    }`}
                >
                  <User className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    Job Seeker
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, role: "company_admin" })
                  }
                  className={`p-3 border rounded-sm text-center transition-all ${formData.role === "company_admin"
                      ? "border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]"
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                    }`}
                >
                  <Building className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    Company Owner
                  </span>
                </button>
              </div>
            </div>

            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 rounded-sm bg-white/5 hover:bg-white/10 text-xs font-medium uppercase tracking-wider transition-all mb-3"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-[#111111] text-gray-600 text-[10px] font-mono uppercase tracking-wider">
                  or
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                    size={14}
                  />
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-4 py-2.5 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 font-mono"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                    size={14}
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 font-mono"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                    size={14}
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+92 300 1234567"
                    className="w-full pl-9 pr-4 py-2.5 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 font-mono"
                  />
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                      size={14}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-8 py-2.5 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">
                    Confirm
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                      size={14}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-8 py-2.5 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-1">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 rounded-sm ${i <= passwordStrength.score ? getStrengthColor() : "bg-white/10"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-3 h-3 mt-0.5 rounded-sm border-white/20 bg-white/5 text-[#FFD700] accent-[#FFD700]"
                />
                <label
                  htmlFor="terms"
                  className="text-[9px] text-gray-500 font-mono leading-tight"
                >
                  I accept the{" "}
                  <Link to="/terms" className="text-[#FFD700] hover:underline">
                    Terms
                  </Link>{" "}
                  &{" "}
                  <Link
                    to="/privacy"
                    className="text-[#FFD700] hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold text-xs uppercase tracking-wider rounded-sm shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Create Account <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
