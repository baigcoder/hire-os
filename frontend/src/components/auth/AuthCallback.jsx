import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/authSlice";
import axios from "axios";
import { USER_API_END_POINT } from "../../utils/constant";
import { AuthLayout, AuthError } from "./AuthLayout";

const AuthCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing"); // 'processing' | 'success' | 'error'
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          // Sync with backend to get/create user
          const supabaseUser = session.user;

          // Check for pending signup role (from Google signup flow)
          const pendingRole = localStorage.getItem("pendingSignupRole");
          console.log("AuthCallback - pendingRole from localStorage:", pendingRole);

          try {
            console.log("Calling supabase-sync with:", {
              email: supabaseUser.email,
              pendingRole: pendingRole || "student",
            });

            const response = await axios.post(
              `${USER_API_END_POINT}/supabase-sync`,
              {
                // Verified server-side; identity comes from this token
                accessToken: session.access_token,
                supabaseId: supabaseUser.id,
                email: supabaseUser.email,
                fullname:
                  supabaseUser.user_metadata?.full_name ||
                  supabaseUser.email?.split("@")[0],
                authProvider: supabaseUser.app_metadata?.provider || "google",
                profilePhoto: supabaseUser.user_metadata?.avatar_url || "",
                pendingRole: pendingRole || "student", // Pass pending role to backend
              },
              { withCredentials: true },
            );

            console.log("supabase-sync response:", {
              success: response.data.success,
              role: response.data.user?.role,
              redirectTo: response.data.redirectTo,
              isNewUser: response.data.isNewUser,
              requiresRegistration: response.data.requiresRegistration,
            });

            if (response.data.success) {
              const user = response.data.user;
              const { isNewUser, redirectTo, requiresRegistration, token } = response.data;

              // CRITICAL: Store the JWT token for API authentication
              if (token) {
                console.log("JWT token stored in localStorage");
              }

              dispatch(setUser(user));

              // Clear pending role
              localStorage.removeItem("pendingSignupRole");

              setStatus("success");

              // Use backend's redirectTo for navigation
              setTimeout(() => {
                console.log(
                  "Auth redirect:",
                  {
                    user: user.fullname,
                    role: user.role,
                    isNewUser,
                    redirectTo,
                    requiresRegistration,
                  }
                );

                if (redirectTo) {
                  // Backend provided explicit redirect destination
                  navigate(redirectTo, {
                    replace: true,
                    state: requiresRegistration ? { fromSignup: true } : undefined,
                  });
                } else {
                  // Fallback: determine redirect based on role
                  if (user.role === "company_admin") {
                    if (isNewUser || !user.companyId) {
                      navigate("/company/register", { replace: true, state: { fromSignup: true } });
                    } else {
                      navigate("/company/admin/dashboard", { replace: true });
                    }
                  } else if (user.role === "recruiter") {
                    const nameSlug = user.fullname?.replace(/\s+/g, "-").toLowerCase() || "dashboard";
                    navigate(`/recruiter/${nameSlug}`, { replace: true });
                  } else {
                    // Student
                    const nameSlug = user.fullname?.replace(/\s+/g, "-").toLowerCase() || "dashboard";
                    navigate(`/student/${nameSlug}`, { replace: true });
                  }
                }
              }, 1500);
            }
          } catch (syncError) {
            console.error("Backend sync error:", syncError);

            // Check if recruiter is trying to use Google sign-in (not allowed)
            if (syncError.response?.data?.code === "GOOGLE_LOGIN_RESTRICTED") {
              setError(
                "Recruiters must login with email and password. Please use the credentials sent to your email by your company admin.",
              );
              setStatus("error");
              // Sign out from Supabase since this login method is not allowed
              await supabase.auth.signOut();
              return;
            }

            // Other errors - still allow login, redirect to home
            setStatus("success");
            setTimeout(() => {
              navigate("/", { replace: true });
            }, 1500);
          }
        } else {
          // Check for error in URL params
          const errorDescription = searchParams.get("error_description");
          if (errorDescription) {
            throw new Error(errorDescription);
          }

          // No session but no error - might be email confirmation
          const accessToken = searchParams.get("access_token");
          const refreshToken = searchParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set session manually
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;

            // Recursively handle the callback now that session is set
            handleAuthCallback();
          } else {
            // Email confirmation successful
            setStatus("success");
            setTimeout(() => {
              navigate("/login", { replace: true });
            }, 2000);
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
        setStatus("error");
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, dispatch]);

  if (status === "error") {
    return (
      <AuthLayout title="Sign-in didn't finish" foot={<Link to="/login">Back to sign in</Link>}>
        <AuthError>{error}</AuthError>
      </AuthLayout>
    );
  }
  return <AuthLayout title="Signing you in…" />;
};

export default AuthCallback;
