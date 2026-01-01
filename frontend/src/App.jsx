import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageLoader } from "./components/LazyComponents";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import AuthCallback from "./components/auth/AuthCallback";
import { RealtimeProvider } from "./context/SocketContext";
import { Toaster } from "./components/ui/sonner";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import ChangePassword from "./components/auth/ChangePassword";
import Home from "./components/Home";
import FeaturesPage from "./components/FeaturesPage";
import Jobs from "./components/Jobs";
import Browse from "./components/Browse";
import Profile from "./components/Profile";
import ProfilePage from "./components/ProfilePage";
import SettingsPage from "./components/SettingsPage";
import JobDescription from "./components/JobDescription";
import Companies from "./components/admin/Companies";
import CompanyCreate from "./components/admin/CompanyCreate";
import CompanySetup from "./components/admin/CompanySetup";
import AdminJobs from "./components/admin/AdminJobs";
import PostJob from "./components/admin/PostJob";
import Applicants from "./components/admin/Applicants";
import AdminApplications from "./components/admin/AdminApplications";
import AdminInterviews from "./components/admin/AdminInterviews";
import AdminAnalytics from "./components/admin/AdminAnalytics";
import ProtectedRoute, {
  RecruiterRoute,
  CompanyAdminRoute,
} from "./components/admin/ProtectedRoute";
import AppliedJobs from "./components/student/AppliedJobs";
import PricingPage from "./components/company/PricingPage";
import BillingPage from "./components/company/BillingPage";
import CompanyProfilePage from "./components/company/CompanyProfilePage";
import CompanyRegistration from "./components/company/CompanyRegistration";
import PaymentPage from "./components/company/PaymentPage";
import PaymentSuccess from "./components/company/PaymentSuccess";
import PaymentSimulator from "./components/company/PaymentSimulator";
import PaddleCheckout from "./components/company/PaddleCheckout";
import AdminSignupFlow from "./components/company/AdminSignupFlow";
// import CompanyDashboard from './components/company/CompanyDashboard' // Lazy loaded
// import CompanyAdminDashboard from './components/company/CompanyAdminDashboard' // Lazy loaded
// import Dashboard from './components/student/DashboardNew' // Lazy loaded
// import RecruiterDashboard from './components/admin/RecruiterDashboardNew' // Lazy loaded
import RecruiterJobs from "./components/recruiter/RecruiterJobs";
// import LiveInterview from './components/interview/LiveInterview' // Lazy loaded
import MCQTestPage from "./components/interview/MCQTestPage";
import InterviewReport from "./components/interview/InterviewReport";
import NotificationCenter from "./components/notifications/NotificationCenter";
import AnalysisResult from "./components/student/AnalysisResult";
import CompanyReport from "./components/admin/CompanyReport";
import CEOReportReview from "./components/admin/CEOReportReview";
// import CEODashboard from './components/admin/CEODashboard' // Lazy loaded
import MockInterview from "./components/student/MockInterview";
import CallDialog from "./components/shared/CallDialog";
import { AlertCircle, ArrowLeft } from "lucide-react";

// Lazy Load Heavy Dashboards
const Dashboard = React.lazy(() => import("./components/student/DashboardNew"));
const RecruiterDashboard = React.lazy(
  () => import("./components/admin/RecruiterDashboardNew"),
);
const CEODashboard = React.lazy(
  () => import("./components/admin/CEODashboard"),
);
const CompanyDashboard = React.lazy(
  () => import("./components/company/CompanyDashboard"),
);
const CompanyAdminDashboard = React.lazy(
  () => import("./components/company/CompanyAdminDashboard"),
);
const LiveInterview = React.lazy(
  () => import("./components/interview/LiveInterview"),
);

// New Recruiter Dashboard Components
const RecruiterDashboardEnhanced = React.lazy(
  () => import("./components/recruiter/RecruiterDashboardEnhanced"),
);
const CandidatePipeline = React.lazy(
  () => import("./components/recruiter/CandidatePipeline"),
);
const AnalyticsDashboard = React.lazy(
  () => import("./components/recruiter/AnalyticsDashboard"),
);
const EmailTemplates = React.lazy(
  () => import("./components/recruiter/EmailTemplates"),
);
const OfferLetterTemplates = React.lazy(
  () => import("./components/admin/OfferLetterTemplates"),
);
const InterviewFeedbackForm = React.lazy(
  () => import("./components/recruiter/InterviewFeedbackForm"),
);
const RecruiterInterviewSchedule = React.lazy(
  () => import("./components/recruiter/InterviewSchedule"),
);
const RecruiterMessagesPage = React.lazy(
  () => import("./components/recruiter/MessagesPage"),
);
const CompanyAdminSettingsPage = React.lazy(
  () => import("./components/company/CompanyAdminSettingsPage"),
);
const StudentMessagesPage = React.lazy(
  () => import("./components/student/StudentMessagesPage"),
);
const ReferralDashboard = React.lazy(
  () => import("./components/student/ReferralDashboard"),
);
const AICareerCoach = React.lazy(
  () => import("./components/student/AICareerCoach"),
);
const SalaryBenchmark = React.lazy(
  () => import("./components/student/SalaryBenchmark"),
);
const ResumeAnalyzer = React.lazy(
  () => import("./components/student/ResumeAnalyzer"),
);
const JobTemplateManager = React.lazy(
  () => import("./components/recruiter/JobTemplateManager"),
);
const TalentPoolManager = React.lazy(
  () => import("./components/recruiter/TalentPoolManager"),
);
const AssessmentBuilder = React.lazy(
  () => import("./components/recruiter/AssessmentBuilder"),
);

// Lazy Wrapper
const LazyWrapper = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// Redesigned 404 Component - Industrial Theme
const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] font-['Space_Grotesk',sans-serif] relative overflow-hidden">
    {/* Industrial Grid Background */}
    <div
      className="fixed inset-0 opacity-30 pointer-events-none"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
      }}
    />

    {/* Glow Effects */}
    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[100px]" />

    <div className="relative z-10 text-center p-10 bg-[#111111] border border-white/10 rounded-sm shadow-2xl max-w-md">
      {/* Corner Accents */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#FFD700]/50" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#FFD700]/50" />
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/20" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/20" />

      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 border-2 border-[#FFD700] rounded-full flex items-center justify-center">
          <AlertCircle size={32} className="text-[#FFD700]" />
        </div>
      </div>

      {/* Error Code */}
      <h1 className="text-7xl font-black text-[#FFD700] font-mono tracking-tighter mb-2">
        404
      </h1>

      {/* Terminal-style Status */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-mono text-red-400 uppercase tracking-wider">
          Route Not Found
        </span>
      </div>

      <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-3">
        System Error
      </h2>
      <p className="text-gray-500 text-sm font-mono mb-8 max-w-sm mx-auto">
        The requested endpoint does not exist in the current routing matrix.
        Please verify your navigation path.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#FFD700] text-black font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#FFE44D] transition-all"
        >
          <ArrowLeft size={16} className="mr-2" />
          Return Home
        </a>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center px-6 py-3 border border-white/20 text-gray-400 font-bold text-xs uppercase tracking-wider rounded-sm hover:border-[#FFD700]/50 hover:text-[#FFD700] transition-all"
        >
          Go Back
        </button>
      </div>
    </div>

    {/* Footer Terminal Info */}
    <div className="absolute bottom-6 text-center">
      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
        HIRE.OS // Industrial Grade Talent Acquisition
      </p>
    </div>
  </div>
);

// Footer Pages
import About from "./components/pages/About";
import Contact from "./components/pages/Contact";
import Careers from "./components/pages/Careers";
import Press from "./components/pages/Press";
import LegalPage from "./components/pages/LegalPage";
import ResourcePage from "./components/pages/ResourcePage";

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Home />, // Pure Landing Page
    errorElement: <NotFound />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/change-password",
    element: <ChangePassword />,
  },

  // Footer Pages - Company
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/careers", element: <Careers /> },
  { path: "/press", element: <Press /> },

  // Footer Pages - Legal
  { path: "/privacy", element: <LegalPage type="privacy" /> },
  { path: "/terms", element: <LegalPage type="terms" /> },
  { path: "/cookies", element: <LegalPage type="cookies" /> },

  // Footer Pages - Resources
  { path: "/help", element: <ResourcePage type="help" /> },
  { path: "/resume", element: <ResourcePage type="resume" /> },
  { path: "/salary", element: <ResourcePage type="salary" /> },
  { path: "/tips", element: <ResourcePage type="tips" /> },

  {
    path: "/jobs",
    element: <Jobs />,
  },
  {
    path: "/features",
    element: <FeaturesPage />,
  },
  {
    path: "/browse",
    element: <Browse />,
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile/old", // Keep old profile as fallback
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/description/:id",
    element: <JobDescription />,
    errorElement: <NotFound />,
  },
  // Public Company Profile
  {
    path: "/company/:id",
    element: <CompanyProfilePage />,
  },

  // Student Dashboard
  {
    path: "/student/:name",
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <Dashboard />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/student/dashboard", // Fallback/Redirect
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <Dashboard />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/applied-jobs",
    element: (
      <ProtectedRoute>
        <AppliedJobs />
      </ProtectedRoute>
    ),
  },
  {
    path: "/resume/analysis", // New AI Analysis Route
    element: (
      <ProtectedRoute>
        <AnalysisResult />
      </ProtectedRoute>
    ),
  },
  {
    path: "/interview-prep", // Mock Interview Practice
    element: (
      <ProtectedRoute>
        <MockInterview />
      </ProtectedRoute>
    ),
  },
  {
    path: "/mock-interview", // Alternative route
    element: (
      <ProtectedRoute>
        <MockInterview />
      </ProtectedRoute>
    ),
  },
  {
    path: "/notifications", // Notifications Center
    element: (
      <ProtectedRoute>
        <NotificationCenter />
      </ProtectedRoute>
    ),
  },
  {
    path: "/messages", // Student Messages
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <StudentMessagesPage />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/referrals",
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <ReferralDashboard />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/career-coach",
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <AICareerCoach />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/salary-benchmark",
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <SalaryBenchmark />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/resume-analyzer",
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <ResumeAnalyzer />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },

  // Interview Routes
  {
    path: "/interview/live/:id", // Live Video Interview with ID
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <LiveInterview />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/interview/live", // Development access without ID
    element: (
      <LazyWrapper>
        <LiveInterview />
      </LazyWrapper>
    ),
  },
  {
    path: "/interview/mcq/:id", // MCQ Test Page
    element: (
      <ProtectedRoute>
        <MCQTestPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/interview/:id/mcq", // Alternative MCQ path
    element: (
      <ProtectedRoute>
        <MCQTestPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/interview/:id/video", // Video Interview Page
    element: (
      <ProtectedRoute>
        <LazyWrapper>
          <LiveInterview />
        </LazyWrapper>
      </ProtectedRoute>
    ),
  },
  {
    path: "/interview/:id/report", // Interview Report with CEO Approval
    element: (
      <ProtectedRoute>
        <InterviewReport />
      </ProtectedRoute>
    ),
  },

  // Notifications
  {
    path: "/notifications",
    element: (
      <ProtectedRoute>
        <NotificationCenter />
      </ProtectedRoute>
    ),
  },

  // Recruiter Dashboard
  {
    path: "/recruiter/:name",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <RecruiterDashboard />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    path: "/recruiter/dashboard", // Fallback/Redirect
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <RecruiterDashboard />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    // Recruiter view company jobs (read-only)
    path: "/recruiter/jobs",
    element: (
      <RecruiterRoute>
        <RecruiterJobs />
      </RecruiterRoute>
    ),
  },
  {
    // Recruiter view applications for a specific job
    path: "/recruiter/job/:id/applications",
    element: (
      <RecruiterRoute>
        <Applicants />
      </RecruiterRoute>
    ),
  },
  {
    // Accept invitation (public route)
    path: "/recruiter/accept-invite",
    element: <CompanyRegistration mode="recruiter-invite" />,
  },
  {
    // Recruiter interview scheduling page
    path: "/recruiter/interviews",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <RecruiterInterviewSchedule />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    // Recruiter messages page
    path: "/recruiter/messages",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <RecruiterMessagesPage />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    // Recruiter pipeline view
    path: "/recruiter/pipeline",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <CandidatePipeline />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    // Email templates
    path: "/recruiter/email-templates",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <EmailTemplates />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    // Job templates
    path: "/recruiter/job-templates",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <JobTemplateManager />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    // Talent pool
    path: "/recruiter/talent-pool",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <TalentPoolManager />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    // Assessments
    path: "/recruiter/assessments",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <AssessmentBuilder />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },

  {
    path: "/admin/companies",
    element: (
      <RecruiterRoute>
        <Companies />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/companies/create",
    element: (
      <RecruiterRoute>
        <CompanyCreate />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/companies/:id",
    element: (
      <RecruiterRoute>
        <CompanySetup />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/jobs",
    element: (
      <RecruiterRoute>
        <AdminJobs />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/jobs/create",
    element: (
      <CompanyAdminRoute>
        <PostJob />
      </CompanyAdminRoute>
    ), // Only CEO can post jobs
  },
  {
    path: "/admin/jobs/:id/applicants",
    element: (
      <RecruiterRoute>
        <Applicants />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/jobs/:id/report",
    element: (
      <RecruiterRoute>
        <CompanyReport />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/applications",
    element: (
      <RecruiterRoute>
        <AdminApplications />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/interviews",
    element: (
      <RecruiterRoute>
        <AdminInterviews />
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <AnalyticsDashboard />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  // New Recruiter Dashboard Routes
  {
    path: "/admin/pipeline",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <CandidatePipeline />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/email-templates",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <EmailTemplates />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/offer-templates",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <OfferLetterTemplates />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/dashboard-enhanced",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <RecruiterDashboardEnhanced />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },
  {
    path: "/admin/interview-feedback/:id",
    element: (
      <RecruiterRoute>
        <LazyWrapper>
          <InterviewFeedbackForm />
        </LazyWrapper>
      </RecruiterRoute>
    ),
  },

  // Company Admin Routes
  {
    path: "/company/admin/dashboard",
    element: (
      <CompanyAdminRoute>
        <LazyWrapper>
          <CompanyAdminDashboard />
        </LazyWrapper>
      </CompanyAdminRoute>
    ),
  },
  {
    path: "/ceo/reports/:id",
    element: (
      <CompanyAdminRoute>
        <CEOReportReview />
      </CompanyAdminRoute>
    ),
  },
  {
    path: "/ceo/dashboard",
    element: (
      <CompanyAdminRoute>
        <LazyWrapper>
          <CEODashboard />
        </LazyWrapper>
      </CompanyAdminRoute>
    ),
  },
  {
    path: "/ceo/messages",
    element: (
      <CompanyAdminRoute>
        <LazyWrapper>
          <RecruiterMessagesPage />
        </LazyWrapper>
      </CompanyAdminRoute>
    ),
  },
  {
    path: "/company/settings",
    element: (
      <CompanyAdminRoute>
        <LazyWrapper>
          <React.Suspense fallback={<PageLoader />}>
            <CompanyAdminSettingsPage />
          </React.Suspense>
        </LazyWrapper>
      </CompanyAdminRoute>
    ),
  },

  // Company routes
  {
    path: "/admin/signup",
    element: <AdminSignupFlow />,
  },
  {
    path: "/company/signup",
    element: <AdminSignupFlow />,
  },
  {
    path: "/company/pricing",
    element: <PricingPage />,
  },
  {
    path: "/company/billing",
    element: (
      <CompanyAdminRoute>
        <BillingPage />
      </CompanyAdminRoute>
    ),
  },
  {
    path: "/company/register",
    element: <CompanyRegistration />,
  },
  {
    path: "/company/payment",
    element: <PaymentPage />,
  },
  {
    path: "/company/payment/success",
    element: <PaymentSuccess />,
  },
  {
    path: "/company/payment/checkout",
    element: <PaymentSimulator />,
  },
  {
    path: "/company/payment/paddle",
    element: <PaddleCheckout />,
  },
  {
    path: "/company/dashboard",
    element: (
      <LazyWrapper>
        <CompanyDashboard />
      </LazyWrapper>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <RealtimeProvider>
        <RouterProvider router={appRouter} />
        <CallDialog />
        <Toaster />
      </RealtimeProvider>
    </ErrorBoundary>
  );
}

export default App;
