/**
 * Lazy Components - Code Splitting
 * Uses React.lazy for dynamic imports to reduce initial bundle size
 * Heavy components are loaded only when needed
 */

import React, { Suspense, lazy } from 'react';

// ═══════════════════════════════════════════════════════════════
// LOADING FALLBACKS
// ═══════════════════════════════════════════════════════════════

/**
 * Full page loading spinner
 */
export const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-amber-400/30 rounded-full" />
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-amber-400 rounded-full animate-spin" />
            </div>
            <p className="text-amber-400/70 font-mono text-sm">Loading...</p>
        </div>
    </div>
);

/**
 * Component loading spinner (smaller, inline)
 */
export const ComponentLoader = () => (
    <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
    </div>
);

/**
 * Card skeleton loader
 */
export const CardSkeleton = () => (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-zinc-700 rounded w-3/4 mb-3" />
        <div className="h-3 bg-zinc-700/50 rounded w-1/2 mb-2" />
        <div className="h-3 bg-zinc-700/50 rounded w-2/3" />
    </div>
);

// ═══════════════════════════════════════════════════════════════
// LAZY LOADED PAGES
// ═══════════════════════════════════════════════════════════════

// Dashboard pages (heavy components)
export const LazyCEODashboard = lazy(() =>
    import('./admin/CEODashboard.jsx')
);

export const LazyRecruiterDashboard = lazy(() =>
    import('./admin/RecruiterDashboardNew.jsx')
);

export const LazyStudentDashboard = lazy(() =>
    import('./student/DashboardNew.jsx')
);

// Heavy feature pages
export const LazyVideoInterview = lazy(() =>
    import('./interview/LiveInterview.jsx')
);

export const LazyMCQTest = lazy(() =>
    import('./interview/MCQTestPage.jsx')
);

export const LazyResumeBuilder = lazy(() =>
    import('./student/ResumeAnalyzer.jsx')
);

// Admin pages
export const LazyCompanySettings = lazy(() =>
    import('./company/CompanyDashboard.jsx')
);

export const LazyAnalytics = lazy(() =>
    import('./admin/RecruiterAnalytics.jsx')
);

// Profile and settings
export const LazyProfile = lazy(() =>
    import('./Profile.jsx')
);

// ═══════════════════════════════════════════════════════════════
// LAZY WRAPPER HOC
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap a lazy component with Suspense
 * @param {React.LazyExoticComponent} LazyComponent - Lazy loaded component
 * @param {React.Component} Fallback - Loading fallback
 * @returns {React.Component} Wrapped component
 */
export const withSuspense = (LazyComponent, Fallback = PageLoader) => {
    return function SuspenseWrapper(props) {
        return (
            <Suspense fallback={<Fallback />}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
};

// Pre-wrapped lazy components for direct use
export const CEODashboardPage = withSuspense(LazyCEODashboard);
export const RecruiterDashboardPage = withSuspense(LazyRecruiterDashboard);
export const StudentDashboardPage = withSuspense(LazyStudentDashboard);
export const VideoInterviewPage = withSuspense(LazyVideoInterview);
export const MCQTestPage = withSuspense(LazyMCQTest);
export const ProfilePage = withSuspense(LazyProfile, ComponentLoader);

// ═══════════════════════════════════════════════════════════════
// PRELOADING
// ═══════════════════════════════════════════════════════════════

/**
 * Preload a component (call on hover or anticipation)
 */
export const preloadComponent = (importFn) => {
    const componentImport = importFn();
    // The import starts immediately but doesn't block
    return componentImport;
};

/**
 * Preload common routes based on user role
 */
export const preloadForRole = (role) => {
    switch (role) {
        case 'ceo':
            preloadComponent(() => import('./admin/CEODashboard.jsx'));
            break;
        case 'recruiter':
            preloadComponent(() => import('./admin/RecruiterDashboardNew.jsx'));
            break;
        case 'student':
            preloadComponent(() => import('./student/DashboardNew.jsx'));
            break;
        default:
            break;
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    // Loaders
    PageLoader,
    ComponentLoader,
    CardSkeleton,

    // Lazy components
    LazyCEODashboard,
    LazyRecruiterDashboard,
    LazyStudentDashboard,
    LazyVideoInterview,
    LazyMCQTest,
    LazyResumeBuilder,
    LazyCompanySettings,
    LazyAnalytics,
    LazyProfile,

    // Wrapped components
    CEODashboardPage,
    RecruiterDashboardPage,
    StudentDashboardPage,
    VideoInterviewPage,
    MCQTestPage,
    ProfilePage,

    // Utilities
    withSuspense,
    preloadComponent,
    preloadForRole
};
