import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Generic protected route - allows any authenticated user
const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
  const { user } = useSelector((store) => store.auth);
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Check if user is authenticated (either via Redux or Supabase)
    if (!user && !isAuthenticated) {
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    // Check for required role if specified (single role)
    if (requiredRole && user?.role !== requiredRole) {
      navigate("/");
      return;
    }

    // Check for allowed roles (multiple roles)
    if (
      allowedRoles &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user?.role)
    ) {
      navigate("/");
      return;
    }
  }, [user, isAuthenticated, loading, requiredRole, allowedRoles, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children (will redirect)
  if (!user && !isAuthenticated) {
    return null;
  }

  // If role required but doesn't match, don't render (will redirect)
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  // If allowed roles specified but user role not in list
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    return null;
  }

  return <>{children}</>;
};

// Recruiter-only protected route (includes company_admin) - with subscription check
export const RecruiterRoute = ({ children }) => {
  const { user } = useSelector((store) => store.auth);
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user && !isAuthenticated) {
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    // Allow both recruiters and company admins
    if (!["recruiter", "company_admin"].includes(user?.role)) {
      navigate("/");
      return;
    }

    // Check subscription status for both recruiters and company_admins
    const subscriptionStatus = user?.subscriptionStatus;
    const pendingStatuses = ["pending", "none", "cancelled", "expired"];

    // Recruiters need an active company subscription
    if (pendingStatuses.includes(subscriptionStatus) && user?.role === "recruiter") {
      console.log("🚫 Recruiter access blocked - company subscription not active");
      navigate("/", {
        state: { message: "Your company's subscription is not active. Please contact your admin." }
      });
      return;
    }

    // Company admins with pending subscription get special handling in CompanyAdminRoute
  }, [user, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isAuthenticated) return null;
  if (!["recruiter", "company_admin"].includes(user?.role)) return null;

  return <>{children}</>;
};

// Company Admin only route - includes subscription check
export const CompanyAdminRoute = ({ children }) => {
  const { user } = useSelector((store) => store.auth);
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user && !isAuthenticated) {
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    if (user?.role !== "company_admin") {
      navigate("/");
      return;
    }

    // Check if company_admin has completed payment setup
    // If no companyId or subscription is pending, redirect to pricing
    const subscriptionStatus = user?.subscriptionStatus;
    const hasCompany = !!user?.companyId;

    // Subscription statuses that block dashboard access
    const pendingStatuses = ["pending", "none", "cancelled", "expired"];

    // If user doesn't have a company OR subscription is not active
    if (!hasCompany || pendingStatuses.includes(subscriptionStatus)) {
      // Allow access to pricing/payment related pages
      const currentPath = window.location.pathname;
      const allowedPaths = [
        "/company/pricing",
        "/company/onboarding",
        "/payment",
        "/checkout",
      ];

      const isAllowedPath = allowedPaths.some(path =>
        currentPath.startsWith(path)
      );

      if (!isAllowedPath) {
        console.log("🚫 Dashboard blocked - subscription not active:", {
          hasCompany,
          subscriptionStatus,
          redirectingTo: "/company/pricing"
        });
        navigate("/company/pricing", {
          state: {
            fromDashboard: true,
            message: "Please complete your subscription to access the dashboard."
          }
        });
        return;
      }
    }
  }, [user, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isAuthenticated) return null;
  if (user?.role !== "company_admin") return null;

  // Additional render check for subscription status
  const subscriptionStatus = user?.subscriptionStatus;
  const hasCompany = !!user?.companyId;
  const pendingStatuses = ["pending", "none", "cancelled", "expired"];

  // Check if on allowed path for incomplete subscription
  const currentPath = window.location.pathname;
  const allowedPaths = ["/company/pricing", "/company/onboarding", "/payment", "/checkout"];
  const isAllowedPath = allowedPaths.some(path => currentPath.startsWith(path));

  if ((!hasCompany || pendingStatuses.includes(subscriptionStatus)) && !isAllowedPath) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};

// Super Admin only route
export const SuperAdminRoute = ({ children }) => {
  const { user } = useSelector((store) => store.auth);
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user && !isAuthenticated) {
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }

    if (user?.role !== "super_admin") {
      navigate("/");
      return;
    }
  }, [user, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isAuthenticated) return null;
  if (user?.role !== "super_admin") return null;

  return <>{children}</>;
};

// Student-only protected route
export const StudentRoute = ({ children }) => {
  return <ProtectedRoute requiredRole="student">{children}</ProtectedRoute>;
};

export default ProtectedRoute;
