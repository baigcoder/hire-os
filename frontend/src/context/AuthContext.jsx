import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseAuth } from "../lib/supabase";
import { useDispatch } from "react-redux";
import { setUser, logout as reduxLogout } from "../redux/authSlice";
import axios from "axios";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setLocalUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

  // Sync Supabase user with backend and Redux
  const syncUserWithBackend = async (supabaseUser) => {
    if (!supabaseUser) {
      dispatch(reduxLogout());
      setLocalUser(null);
      return null;
    }

    try {
      // Try to get or create user in backend
      const response = await axios.post(
        `${API_URL}/user/supabase-sync`,
        {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email,
          fullname:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name ||
            supabaseUser.email?.split("@")[0],
          profilePhoto:
            supabaseUser.user_metadata?.avatar_url ||
            supabaseUser.user_metadata?.picture,
          provider: supabaseUser.app_metadata?.provider || "email",
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        dispatch(setUser(response.data.user));
        setLocalUser(response.data.user);

        // If this is a new user (first-time signup), trigger trial welcome modal
        if (response.data.isNewUser && response.data.user?.role === "student") {
          console.log(
            "🎉 New student signup detected - showing trial welcome!",
          );
          localStorage.setItem("showTrialWelcome", "true");
          localStorage.setItem(
            "trialEndDate",
            response.data.trialEndDate || "",
          );
          // Store in sessionStorage for immediate access
          sessionStorage.setItem("newUserTrialStart", "true");
        }

        return response.data.user;
      }
    } catch (error) {
      console.error("Error syncing user with backend:", error);
      // Still set a basic user if backend sync fails
      const basicUser = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        fullname:
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split("@")[0],
        profilePhoto: supabaseUser.user_metadata?.avatar_url,
      };
      dispatch(setUser(basicUser));
      setLocalUser(basicUser);
      return basicUser;
    }
  };

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { session: currentSession } = await supabaseAuth.getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          await syncUserWithBackend(currentSession.user);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event);
      setSession(currentSession);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await syncUserWithBackend(currentSession?.user);
      } else if (event === "SIGNED_OUT") {
        dispatch(reduxLogout());
        setLocalUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  // Sign up with email and password
  const signUp = async (email, password, metadata = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.signUp(
        email,
        password,
        metadata,
      );
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password, role = null) => {
    setLoading(true);
    try {
      // If role is specified, try backend authentication first (for recruiters/company_admin)
      if (role && (role === "recruiter" || role === "company_admin")) {
        console.log(`Trying backend auth for role: ${role}`);
        console.log("📧 Auth data being sent:", {
          email: email,
          emailLength: email?.length,
          password: password,
          passwordLength: password?.length,
          role: role,
        });
        try {
          // Trim email and password to remove accidental whitespace from copy-paste
          const trimmedEmail = email?.trim();
          const trimmedPassword = password?.trim();

          const response = await axios.post(
            `${API_URL}/user/login`,
            { email: trimmedEmail, password: trimmedPassword, role },
            { withCredentials: true },
          );

          if (response.data.success) {
            // Set user in Redux and local state
            dispatch(setUser(response.data.user));
            setLocalUser(response.data.user);

            // Store token if available
            if (response.data.token) {
              localStorage.setItem("token", response.data.token);
            }

            return { data: response.data, error: null };
          }
        } catch (backendError) {
          console.log(
            `Backend auth failed for role ${role}:`,
            backendError.response?.data?.message,
          );
          // If role-specific backend fails, throw error with specific message
          throw new Error(
            backendError.response?.data?.message || "Invalid login credentials",
          );
        }
      }

      // For students or when no role specified, try Supabase auth first
      const { data, error } = await supabaseAuth.signIn(email, password);

      if (!error && data) {
        return { data, error: null };
      }

      // If Supabase fails and role is student, try backend
      if (role === "student") {
        try {
          const response = await axios.post(
            `${API_URL}/user/login`,
            { email, password, role: "student" },
            { withCredentials: true },
          );

          if (response.data.success) {
            dispatch(setUser(response.data.user));
            setLocalUser(response.data.user);

            if (response.data.token) {
              localStorage.setItem("token", response.data.token);
            }

            return { data: response.data, error: null };
          }
        } catch (backendError) {
          console.log(
            `Backend auth failed for student:`,
            backendError.response?.data?.message,
          );
        }
      }

      // If all attempts fail, return error
      throw error || new Error("Invalid login credentials");
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.signInWithGoogle();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Send OTP to email
  const sendOTP = async (email) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.sendOTP(email);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (email, token) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.verifyOTP(email, token);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      await supabaseAuth.signOut();
      dispatch(reduxLogout());
      setLocalUser(null);
      setSession(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabaseAuth.resetPassword(email);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    sendOTP,
    verifyOTP,
    signOut,
    resetPassword,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
