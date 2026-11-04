import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { USER_API_END_POINT } from "@/utils/constant";
import { AuthLayout, AuthError, Field, Submit } from "./AuthLayout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${USER_API_END_POINT}/forgot-password`, { email });
      if (data.success) setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const foot = <Link to="/login">Back to sign in</Link>;

  if (sent) {
    return (
      <AuthLayout title="Check your email" foot={foot}>
        <p className="auth-lead">
          If <strong>{email}</strong> has an account, a reset link is on its way.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" foot={foot}>
      <form onSubmit={submit}>
        <Field label="Email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthError>{error}</AuthError>
        <Submit loading={loading}>Send reset link</Submit>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
