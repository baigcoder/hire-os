import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    Shield,
    KeyRound,
    AlertCircle,
    User,
    Building2,
    Briefcase,
    Terminal
} from 'lucide-react';

// Google Icon Component
const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, signInWithGoogle, sendOTP, verifyOTP, isAuthenticated, loading: authLoading, user } = useAuth();

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('student');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Role options
    const roleOptions = [
        { id: 'student', label: 'Candidate', icon: User },
        { id: 'recruiter', label: 'Recruiter', icon: Briefcase },
        { id: 'company_admin', label: 'Admin', icon: Building2 }
    ];

    // OTP states
    const [authMode, setAuthMode] = useState('password');
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [otpTimer, setOtpTimer] = useState(0);

    // Redirect if authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            const from = location.state?.from?.pathname;
            if (from) {
                navigate(from, { replace: true });
            } else {
                const nameSlug = user.fullname ? user.fullname.replace(/\s+/g, '-').toLowerCase() : 'dashboard';
                if (user.role === 'company_admin') {
                    navigate('/company/admin/dashboard', { replace: true });
                } else if (user.role === 'recruiter') {
                    navigate(`/recruiter/${nameSlug}`, { replace: true });
                } else {
                    navigate(`/student/${nameSlug}`, { replace: true });
                }
            }
        }
    }, [isAuthenticated, user, navigate, location]);

    // OTP Timer
    useEffect(() => {
        if (otpTimer > 0) {
            const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpTimer]);

    // Handle password sign in
    const handlePasswordSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await signIn(email, password, selectedRole);
            if (error) throw error;

            if (data?.requirePasswordChange || data?.user?.mustChangePassword) {
                toast.info('Please set a new password to continue.');
                navigate('/change-password', { state: { email: data?.user?.email || email }, replace: true });
                return;
            }

            toast.success('Access granted');
            const user = data?.user;
            if (user) {
                const nameSlug = user.fullname?.replace(/\s+/g, '-').toLowerCase() || 'dashboard';
                if (user.role === 'company_admin') {
                    navigate('/company/admin/dashboard', { replace: true });
                } else if (user.role === 'recruiter') {
                    navigate(`/recruiter/${nameSlug}`, { replace: true });
                } else {
                    navigate(`/student/${nameSlug}`, { replace: true });
                }
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    // Handle Google sign in
    const handleGoogleSignIn = async () => {
        if (selectedRole === 'recruiter') {
            setError('Recruiters must use email/password provided by admin');
            return;
        }
        setError('');
        setLoading(true);
        try {
            localStorage.setItem('pendingSignupRole', selectedRole);
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Google sign-in failed');
            localStorage.removeItem('pendingSignupRole');
            setLoading(false);
        }
    };

    // Send OTP
    const handleSendOTP = async () => {
        if (!email) {
            setError('Enter email address');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const { error } = await sendOTP(email);
            if (error) throw error;
            setOtpSent(true);
            setOtpTimer(60);
            toast.success('OTP transmitted');
        } catch (err) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    // OTP input handlers
    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otpCode];
        newOtp[index] = value;
        setOtpCode(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
        setOtpCode(newOtp);
    };

    // Verify OTP
    const handleVerifyOTP = async () => {
        const otp = otpCode.join('');
        if (otp.length !== 6) {
            setError('Enter complete 6-digit code');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const { error } = await verifyOTP(email, otp);
            if (error) throw error;
            toast.success('Verified');
            navigate('/');
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] flex">
            {/* Industrial Grid Background */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

            {/* Left Panel - Branding */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 bg-[#050505] p-12 flex-col justify-between relative border-r border-white/5"
            >
                {/* HUD Corners */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#FFD700]/30" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#FFD700]/30" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#FFD700]/30" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#FFD700]/30" />

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 relative z-10">
                    <div className="w-10 h-10 rounded-sm bg-[#FFD700] flex items-center justify-center text-black font-black text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                        H.
                    </div>
                    <span className="text-xl font-bold tracking-tight">
                        HIRE<span className="text-[#FFD700]">.OS</span>
                    </span>
                </Link>

                {/* Hero Content */}
                <div className="relative z-10 space-y-8">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#FFD700] font-mono mb-3">// System Access</p>
                        <h1 className="text-4xl font-bold uppercase tracking-tight mb-4">
                            Authentication
                            <br />
                            <span className="text-[#FFD700]">Portal</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-mono max-w-sm">
                            Secure access to industrial-grade talent acquisition system.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {[
                            { icon: Shield, text: 'Enterprise-grade security' },
                            { icon: Terminal, text: 'Role-based access control' },
                            { icon: KeyRound, text: 'Multi-factor authentication' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-gray-500">
                                <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center">
                                    <item.icon size={14} className="text-[#FFD700]" />
                                </div>
                                <span className="text-xs uppercase tracking-wider">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-gray-700 text-[10px] font-mono uppercase tracking-wider relative z-10">
                    © {new Date().getFullYear()} HIRE.OS // Secure Authentication
                </p>
            </motion.div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Form Container */}
                    <div className="bg-[#111111] border border-white/10 rounded-sm p-8 relative overflow-hidden">
                        {/* HUD Corners */}
                        <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />

                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-6">
                            <Link to="/" className="inline-flex items-center gap-2">
                                <div className="w-8 h-8 rounded-sm bg-[#FFD700] flex items-center justify-center text-black font-bold text-xs">H.</div>
                                <span className="text-lg font-bold">HIRE<span className="text-[#FFD700]">.OS</span></span>
                            </Link>
                        </div>

                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold uppercase tracking-wider mb-2">Sign In</h2>
                            <p className="text-gray-600 text-xs font-mono">
                                No account?{' '}
                                <Link to="/signup" className="text-[#FFD700] hover:underline">Initialize</Link>
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/50 rounded-sm text-red-400 text-xs mb-4"
                            >
                                <AlertCircle size={14} />
                                <span className="font-mono">{error}</span>
                            </motion.div>
                        )}

                        {/* Google Sign In */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-white/10 rounded-sm bg-white/5 hover:bg-white/10 text-xs font-medium uppercase tracking-wider transition-all mb-4"
                        >
                            <GoogleIcon />
                            <span>Continue with Google</span>
                        </button>

                        {/* Divider */}
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-3 bg-[#111111] text-gray-600 text-[10px] font-mono uppercase tracking-wider">or</span>
                            </div>
                        </div>

                        {/* Auth Mode Toggle */}
                        <div className="flex bg-white/5 rounded-sm p-1 border border-white/10 mb-4">
                            <button
                                onClick={() => { setAuthMode('password'); setOtpSent(false); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm text-xs font-medium uppercase tracking-wider transition-all ${authMode === 'password'
                                    ? 'bg-[#FFD700] text-black'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                <Lock size={12} />
                                Password
                            </button>
                            <button
                                onClick={() => setAuthMode('otp')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm text-xs font-medium uppercase tracking-wider transition-all ${authMode === 'otp'
                                    ? 'bg-[#FFD700] text-black'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                <KeyRound size={12} />
                                OTP
                            </button>
                        </div>

                        {/* Password Form */}
                        {authMode === 'password' && (
                            <form onSubmit={handlePasswordSignIn} className="space-y-4">
                                {/* Role Selector */}
                                <div>
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2 block">Access Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {roleOptions.map((role) => (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => setSelectedRole(role.id)}
                                                className={`flex flex-col items-center gap-1 p-2.5 rounded-sm border transition-all ${selectedRole === role.id
                                                    ? 'bg-[#FFD700]/10 border-[#FFD700]/50 text-[#FFD700]'
                                                    : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'
                                                    }`}
                                            >
                                                <role.icon size={16} />
                                                <span className="text-[10px] font-mono uppercase">{role.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full pl-10 pr-4 py-3 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Password</label>
                                        <Link to="/forgot-password" className="text-[10px] text-[#FFD700] hover:underline font-mono">Reset</Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-10 py-3 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 transition-all font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-3 h-3 rounded-sm border-white/20 bg-white/5 text-[#FFD700] focus:ring-[#FFD700]/50 accent-[#FFD700]"
                                    />
                                    <label htmlFor="remember" className="ml-2 text-xs text-gray-500 font-mono">Remember session</label>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold text-xs uppercase tracking-wider rounded-sm shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Authenticate <ArrowRight size={14} /></>}
                                </button>
                            </form>
                        )}

                        {/* OTP Form */}
                        {authMode === 'otp' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            disabled={otpSent}
                                            className="w-full pl-10 pr-4 py-3 rounded-sm border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 transition-all font-mono disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {!otpSent ? (
                                    <button
                                        onClick={handleSendOTP}
                                        disabled={loading || !email}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold text-xs uppercase tracking-wider rounded-sm shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : <>Transmit OTP <ArrowRight size={14} /></>}
                                    </button>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2 block text-center">Enter 6-digit code</label>
                                            <div className="flex gap-2 justify-center">
                                                {otpCode.map((digit, idx) => (
                                                    <input
                                                        key={idx}
                                                        id={`otp-${idx}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                                                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Backspace' && !digit && idx > 0) {
                                                                document.getElementById(`otp-${idx - 1}`)?.focus();
                                                            }
                                                        }}
                                                        className="w-10 h-12 text-center text-lg font-mono font-bold rounded-sm border border-white/10 bg-white/5 text-[#FFD700] focus:outline-none focus:border-[#FFD700] transition-all"
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            {otpTimer > 0 ? (
                                                <p className="text-xs text-gray-600 font-mono">Resend in <span className="text-[#FFD700]">{otpTimer}s</span></p>
                                            ) : (
                                                <button onClick={handleSendOTP} disabled={loading} className="text-xs text-[#FFD700] hover:underline font-mono">Resend</button>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleVerifyOTP}
                                            disabled={loading || otpCode.join('').length !== 6}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold text-xs uppercase tracking-wider rounded-sm shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Verify <ArrowRight size={14} /></>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;