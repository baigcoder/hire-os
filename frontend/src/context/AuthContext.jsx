import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseAuth } from "../lib/supabase";
import { useDispatch } from "react-redux";
import { setUser, logout as reduxLogout } from "../redux/authSlice";
import api from "../utils/api";

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



  // Sync Supabase user with backend and Redux
  // The backend verifies the Supabase access token; identity comes from it
  const syncUserWithBackend = async (supabaseUser, accessToken) => {
    if (!supabaseUser) {
      dispatch(reduxLogout());
      setLocalUser(null);
      return null;
    }

    try {
      // Get pending role from localStorage (set during Google signup flow)
      const pendingRole = localStorage.getItem("pendingSignupRole");

      // Try to get or create user in backend
      const response = await api.post(
        "/user/supabase-sync",
        {
          accessToken,
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
          pendingRole: pendingRole || "student", // Pass pending role for new user creation
        },
      );

      if (response.data.success) {
        dispatch(setUser(response.data.user));
        setLocalUser(response.data.user);

        // Store auth info for AuthCallback to handle redirect
        // This is needed because AuthContext runs before AuthCallback
        if (response.data.isNewUser) {
          sessionStorage.setItem("authNewUser", "true");
          sessionStorage.setItem("authUserRole", response.data.user?.role || "student");
        }

        // Clear pending role after successful sync
        localStorage.removeItem("pendingSignupRole");

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

  // The API couldn't renew the session (signed out elsewhere, password changed, access ended)
  useEffect(() => {
    const ended = () => {
      dispatch(reduxLogout());
      setLocalUser(null);
    };
    window.addEventListener("session-ended", ended);
    return () => window.removeEventListener("session-ended", ended);
  }, [dispatch]);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { session: currentSession } = await supabaseAuth.getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          await syncUserWithBackend(
            currentSession.user,
            currentSession.access_token,
          );
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
        await syncUserWithBackend(
          currentSession?.user,
          currentSession?.access_token,
        );
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

  // Sign in with email and password: our API first, then Supabase for accounts that live only there
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      let apiMessage;
      try {
        // Trimmed: passwords sent by email are often pasted with a trailing space
        const response = await api.post("/user/login", { email: email?.trim(), password: password?.trim() });
        if (response.data.success) {
          dispatch(setUser(response.data.user));
          setLocalUser(response.data.user);
          return { data: response.data, error: null };
        }
      } catch (apiError) {
        apiMessage = apiError.response?.data?.message;
        // A locked or expired account is a real answer, not a reason to try elsewhere
        if ([403, 423].includes(apiError.response?.status)) throw new Error(apiMessage);
      }

      const { data, error } = await supabaseAuth.signIn(email, password).catch((e) => ({ error: e }));
      if (!error && data?.session) return { data, error: null };
      throw new Error(apiMessage || "Invalid email or password.");
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

  // Sign out - clear all auth state completely
  const signOut = async () => {
    setLoading(true);
    try {
      // Try to call backend logout (don't block on failure)
      try {
        await api.post("/user/logout");
      } catch (backendError) {
        console.log("Backend logout call failed (non-blocking):", backendError.message);
      }

      // Sign out from Supabase
      await supabaseAuth.signOut();

      // Clear all auth-related localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("pendingSignupRole");

      // Clear sessionStorage
      sessionStorage.removeItem("authNewUser");
      sessionStorage.removeItem("authUserRole");

      // Clear Redux state
      dispatch(reduxLogout());
      setLocalUser(null);
      setSession(null);
    } catch (error) {
      console.error("Sign out error:", error);
      // Even on error, still clear local state
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      dispatch(reduxLogout());
      setLocalUser(null);
      setSession(null);
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
