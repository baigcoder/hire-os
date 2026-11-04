import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { USER_API_END_POINT } from "@/utils/constant";
import { AuthLayout, AuthError, PasswordField, Submit } from "./AuthLayout";

/** Set a new password from the emailed link. The link is checked before the form shows. */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState("checking"); // checking | ready | invalid
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return setState("invalid");
    axios
      .get(`${USER_API_END_POINT}/verify-reset-token/${token}`)
      .then(({ data }) => {
        setEmail(data.email ?? "");
        setState(data.success ? "ready" : "invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${USER_API_END_POINT}/reset-password`, { token, password });
      if (data.success) {
        toast.success("Password changed. Sign in with the new one.");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't change the password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (state === "checking") return <AuthLayout title="Reset your password" />;

  if (state === "invalid") {
    return (
      <AuthLayout title="This link has expired" foot={<Link to="/login">Back to sign in</Link>}>
        <Link to="/forgot-password" className="auth-btn auth-btn-primary" style={{ textDecoration: "none" }}>
          Send a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      {email && <p className="auth-lead">For {email}</p>}
      <form onSubmit={submit}>
        <input type="email" value={email} autoComplete="username" readOnly hidden />
        <PasswordField label="New password" autoComplete="new-password" required minLength={8} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        <AuthError>{error}</AuthError>
        <Submit loading={loading}>Change password</Submit>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
