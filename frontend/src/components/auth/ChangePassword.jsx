import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import api from "@/utils/api";
import { USER_API_END_POINT } from "@/utils/constant";
import { setUser } from "@/redux/authSlice";
import { AuthLayout, AuthError, PasswordField, Submit, homeFor } from "./AuthLayout";

// The server's rule for a first password: 8+ characters with upper case, lower case and a number
const valid = (p) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p);

/** A recruiter's first sign-in: replace the password the owner's invitation sent. */
const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const email = location.state?.email;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) navigate("/login", { replace: true });
  }, [email, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid(password)) return setError("Use 8 or more characters with upper case, lower case and a number.");
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`${USER_API_END_POINT}/change-initial-password`, {
        email,
        newPassword: password,
        confirmPassword: password,
      });
      if (data.success) {
        dispatch(setUser(data.user));
        toast.success("Password set");
        navigate(homeFor(data.user), { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't set the password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set your password">
      <p className="auth-lead">Replace the one from your invitation.</p>
      <form onSubmit={submit}>
        <input type="email" value={email ?? ""} autoComplete="username" readOnly hidden />
        <PasswordField label="New password" autoComplete="new-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        <AuthError>{error}</AuthError>
        <Submit loading={loading}>Continue</Submit>
      </form>
    </AuthLayout>
  );
};

export default ChangePassword;
