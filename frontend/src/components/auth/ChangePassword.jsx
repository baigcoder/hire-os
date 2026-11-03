import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "@/redux/authSlice";
import { USER_API_END_POINT } from "@/utils/constant";
import api from "@/utils/api";
import { toast } from "sonner";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get email from location state
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      toast.error("Please login first to change your password.");
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  // Password validation
  const passwordChecks = {
    length: newPassword.length >= 8,
    lowercase: /[a-z]/.test(newPassword),
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    match: newPassword && confirmPassword && newPassword === confirmPassword,
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        `${USER_API_END_POINT}/change-initial-password`,
        { email, newPassword, confirmPassword },
      );

      if (response.data.success) {
        dispatch(setUser(response.data.user));

        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
        }

        toast.success("Password changed successfully!");

        const nameSlug =
          response.data.user.fullname?.replace(/\s+/g, "-").toLowerCase() ||
          "dashboard";
        navigate(`/recruiter/${nameSlug}`, { replace: true });
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to change password.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const CheckItem = ({ valid, text }) => (
    <div
      className={`flex items-center gap-2 text-xs ${valid ? "text-accent" : "text-gray-600"}`}
    >
      {valid ? (
        <CheckCircle size={12} className="text-accent" />
      ) : (
        <XCircle size={12} className="text-gray-600" />
      )}
      {text}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" />

      {/* Gradient orbs */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative bg-card border border-white/10 rounded-sm p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-sm bg-primary mb-4">
              <ShieldCheck className="w-7 h-7 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              Set New Password
            </h1>
            <p className="text-gray-500 text-sm">
              Create a secure password for your account
            </p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-sm bg-red-500/10 border border-red-500/30"
            >
              <p className="text-red-400 text-xs text-center">
                {error}
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-sm text-gray-500 cursor-not-allowed text-sm"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                  size={16}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                  size={16}
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="p-4 rounded-sm bg-white/5 border border-white/10 space-y-2">
              <p className="text-xs text-gray-500 mb-3">
                Password Requirements
              </p>
              <CheckItem
                valid={passwordChecks.length}
                text="At least 8 characters"
              />
              <CheckItem
                valid={passwordChecks.lowercase}
                text="One lowercase letter"
              />
              <CheckItem
                valid={passwordChecks.uppercase}
                text="One uppercase letter"
              />
              <CheckItem valid={passwordChecks.number} text="One number" />
              <CheckItem valid={passwordChecks.match} text="Passwords match" />
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={!isPasswordValid || loading}
              className={`w-full py-4 rounded-sm font-bold text-sm transition-all flex items-center justify-center gap-2 ${isPasswordValid
                  ? "bg-primary text-black hover:bg-[#FFE44D] hover:shadow-[0_0_30px_rgba(255,215,0,0.2)]"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
                }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-transparent border-t-black rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Terminal size={16} />
                  Set Password & Continue
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
