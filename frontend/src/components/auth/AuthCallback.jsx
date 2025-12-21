import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/authSlice";
import axios from "axios";
import { USER_API_END_POINT } from "../../utils/constant";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

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

          try {
            const response = await axios.post(
              `${USER_API_END_POINT}/supabase-sync`,
              {
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

            if (response.data.success) {
              const user = response.data.user;
              dispatch(setUser(user));

              // Clear pending role
              localStorage.removeItem("pendingSignupRole");

              setStatus("success");

              // Redirect based on role
              setTimeout(() => {
                console.log(
                  "🔐 Auth redirect - User:",
                  user.fullname,
                  "Role:",
                  user.role,
                  "isNewUser:",
                  response.data.isNewUser,
                );
                if (user.role === "company_admin") {
                  // New company admin - redirect to pricing to select package
                  if (response.data.isNewUser) {
                    navigate("/company/pricing", {
                      replace: true,
                      state: { fromSignup: true },
                    });
                  } else {
                    navigate("/company/admin/dashboard", { replace: true });
                  }
                } else if (user.role === "recruiter") {
                  const nameSlug =
                    user.fullname?.replace(/\s+/g, "-").toLowerCase() ||
                    "dashboard";
                  navigate(`/recruiter/${nameSlug}`, { replace: true });
                } else {
                  // Default to student dashboard for job seekers
                  const nameSlug =
                    user.fullname?.replace(/\s+/g, "-").toLowerCase() ||
                    "dashboard";
                  navigate(`/student/${nameSlug}`, { replace: true });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-6 p-8">
        {status === "processing" && (
          <>
            <div className="w-16 h-16 mx-auto">
              <Loader2 size={64} className="animate-spin text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Authenticating...
              </h2>
              <p className="text-gray-400 mt-2">
                Please wait while we verify your account.
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center animate-scale-in">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Success!</h2>
              <p className="text-gray-400 mt-2">
                Redirecting to your dashboard...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center animate-scale-in">
              <XCircle size={40} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Authentication Failed
              </h2>
              <p className="text-red-400 mt-2">{error}</p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
