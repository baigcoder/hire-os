import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Generic protected route - allows any authenticated user
const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
    const { user } = useSelector(store => store.auth);
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
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
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
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        return null;
    }

    return <>{children}</>;
};

// Recruiter-only protected route (includes company_admin)
export const RecruiterRoute = ({ children }) => {
    const { user } = useSelector(store => store.auth);
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (!user && !isAuthenticated) {
            navigate("/login", { state: { from: window.location.pathname } });
            return;
        }

        // Allow both recruiters and company admins
        if (!['recruiter', 'company_admin'].includes(user?.role)) {
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
    if (!['recruiter', 'company_admin'].includes(user?.role)) return null;

    return <>{children}</>;
};

// Company Admin only route
export const CompanyAdminRoute = ({ children }) => {
    const { user } = useSelector(store => store.auth);
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (!user && !isAuthenticated) {
            navigate("/login", { state: { from: window.location.pathname } });
            return;
        }

        if (user?.role !== 'company_admin') {
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
    if (user?.role !== 'company_admin') return null;

    return <>{children}</>;
};

// Super Admin only route
export const SuperAdminRoute = ({ children }) => {
    const { user } = useSelector(store => store.auth);
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (!user && !isAuthenticated) {
            navigate("/login", { state: { from: window.location.pathname } });
            return;
        }

        if (user?.role !== 'super_admin') {
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
    if (user?.role !== 'super_admin') return null;

    return <>{children}</>;
};

// Student-only protected route  
export const StudentRoute = ({ children }) => {
    return <ProtectedRoute requiredRole="student">{children}</ProtectedRoute>;
};

export default ProtectedRoute;