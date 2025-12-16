import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Crown, Check, ArrowRight, ArrowLeft, CreditCard,
    User, Mail, Phone, Lock, Eye, EyeOff, Briefcase, Users,
    Sparkles, Shield, Video, Brain, BarChart3, Upload, Plus,
    Trash2, Send, CheckCircle, Loader2, Globe, MapPin, Terminal,
    Camera, Image, Linkedin, Twitter, Facebook
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { COMPANY_API_END_POINT, PAYMENT_API_END_POINT, USER_API_END_POINT } from '@/utils/constant';
import { setUser } from '@/redux/authSlice';
import Navbar from '../shared/Navbar';

// ========== STEP INDICATOR ==========
const StepIndicator = ({ currentStep, steps }) => (
    <div className="flex items-center justify-center mb-10 px-4 overflow-x-auto">
        {steps.map((step, index) => (
            <React.Fragment key={index}>
                <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-sm flex items-center justify-center font-mono font-bold text-sm transition-all border ${index < currentStep
                        ? 'bg-[#00FF94]/20 border-[#00FF94]/50 text-[#00FF94]'
                        : index === currentStep
                            ? 'bg-[#FFD700] border-[#FFD700] text-black'
                            : 'bg-white/5 border-white/10 text-gray-600'
                        }`}>
                        {index < currentStep ? <Check className="w-4 h-4" /> : String(index + 1).padStart(2, '0')}
                    </div>
                    <span className={`mt-2 text-[10px] md:text-xs font-mono uppercase tracking-wider text-center max-w-[80px] ${index <= currentStep ? 'text-white' : 'text-gray-600'}`}>
                        {step}
                    </span>
                </div>
                {index < steps.length - 1 && (
                    <div className={`w-8 md:w-16 h-px mx-1 md:mx-2 flex-shrink-0 ${index < currentStep ? 'bg-[#00FF94]' : 'bg-white/10'}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

// ========== PLAN CARD ==========
const PlanCard = ({ plan, selected, onSelect, billingCycle }) => {
    const price = billingCycle === 'yearly' ? plan.yearlyPrice : billingCycle === 'quarterly' ? plan.quarterlyPrice : plan.monthlyPrice;
    const savings = billingCycle === 'yearly' ? '20% OFF' : billingCycle === 'quarterly' ? '10% OFF' : null;

    return (
        <div
            onClick={() => onSelect(plan)}
            className={`relative p-5 md:p-6 rounded-sm cursor-pointer transition-all border ${selected
                ? 'border-[#FFD700] bg-[#FFD700]/5 shadow-[0_0_30px_rgba(255,215,0,0.1)]'
                : 'border-white/10 bg-[#111111] hover:border-white/20'
                }`}
        >
            <div className={`absolute top-0 right-0 w-5 h-5 border-t border-r ${selected ? 'border-[#FFD700]/50' : 'border-white/10'}`} />
            <div className={`absolute bottom-0 left-0 w-5 h-5 border-b border-l ${selected ? 'border-[#FFD700]/50' : 'border-white/10'}`} />

            {plan.popular && (
                <Badge className="absolute -top-px right-4 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded-b-sm rounded-t-none uppercase tracking-wider">
                    Popular
                </Badge>
            )}
            {savings && (
                <Badge className="absolute top-2 left-2 bg-[#00FF94]/20 text-[#00FF94] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                    {savings}
                </Badge>
            )}

            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">{plan.name}</h3>
            <p className="text-gray-600 text-xs font-mono mb-4">{plan.description}</p>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl md:text-3xl font-bold text-white font-mono">Rs {price.toLocaleString()}</span>
                <span className="text-gray-600 text-xs font-mono">/{billingCycle === 'yearly' ? 'year' : billingCycle === 'quarterly' ? 'qtr' : 'mo'}</span>
            </div>
            <ul className="space-y-2">
                {plan.features.slice(0, 5).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-500 text-xs font-mono">
                        <Check className="w-3 h-3 text-[#00FF94] flex-shrink-0" />
                        <span className="truncate">{feature}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ========== RECRUITER FORM ==========
const RecruiterForm = ({ recruiter, index, onChange, onRemove, canRemove }) => (
    <div className="p-4 bg-white/5 border border-white/10 rounded-sm relative">
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/10" />
        {canRemove && (
            <button
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/10 rounded-sm"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
        <div className="grid md:grid-cols-2 gap-3">
            <div>
                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Name *</Label>
                <Input
                    placeholder="John Doe"
                    value={recruiter.name}
                    onChange={(e) => onChange(index, 'name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono h-9"
                />
            </div>
            <div>
                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1 block">Email *</Label>
                <Input
                    type="email"
                    placeholder="john@company.com"
                    value={recruiter.email}
                    onChange={(e) => onChange(index, 'email', e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono h-9"
                />
            </div>
        </div>
    </div>
);

// ========== MAIN COMPONENT ==========
const AdminSignupFlow = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const preSelectedPlan = location.state?.plan;

    const { user } = useSelector(state => state.auth);
    const isLoggedIn = !!user;

    // Dynamic steps based on login state
    const steps = isLoggedIn
        ? ['Select Plan', 'Company Details', 'Add Team', 'Payment']
        : ['Create Account', 'Select Plan', 'Company Details', 'Add Team', 'Payment'];

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [billingCycle, setBillingCycle] = useState('monthly');

    // Plan data
    const plans = [
        {
            id: 'basic',
            name: 'Starter',
            description: 'Perfect for startups',
            monthlyPrice: 5000,
            quarterlyPrice: 13500,
            yearlyPrice: 48000,
            paddlePriceId: 'pri_01kc2k2hnr4re5yn3fevrkj9ty',
            features: ['5 Job Postings', '1 Recruiter', 'Basic Analytics', 'Email Support', '30-day Trial'],
            maxRecruiters: 1
        },
        {
            id: 'professional',
            name: 'Pro',
            description: 'For growing companies',
            monthlyPrice: 15000,
            quarterlyPrice: 40500,
            yearlyPrice: 144000,
            paddlePriceId: 'pri_01kc2k3tyv04ysgqjqbwk7z46f',
            popular: true,
            features: ['20 Job Postings', '5 Recruiters', 'Video Interviews', 'MCQ Tests', 'AI Matching', 'Priority Support'],
            maxRecruiters: 5
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'For large organizations',
            monthlyPrice: 40000,
            quarterlyPrice: 108000,
            yearlyPrice: 384000,
            paddlePriceId: 'pri_01kc2k4xnpav2hmzd5h8vncxfm',
            features: ['Unlimited Jobs', 'Unlimited Recruiters', 'API Access', 'Dedicated Manager', 'Custom Branding', 'SLA Support'],
            maxRecruiters: -1
        }
    ];

    // Form state
    const [adminInfo, setAdminInfo] = useState({
        fullname: user?.fullname || '',
        email: user?.email || '',
        phone: user?.phoneNumber || '',
        password: '',
        confirmPassword: ''
    });

    const [selectedPlan, setSelectedPlan] = useState(plans.find(p => p.id === preSelectedPlan) || null);

    const [companyInfo, setCompanyInfo] = useState({
        name: '',
        email: '',
        phone: '',
        website: '',
        location: '',
        description: '',
        industry: '',
        size: '',
        tagline: '',
        logo: null,
        logoPreview: null
    });

    const [recruiters, setRecruiters] = useState([]);
    const [registrationComplete, setRegistrationComplete] = useState(false);

    // Handle admin info changes
    const handleAdminChange = (field, value) => setAdminInfo(prev => ({ ...prev, [field]: value }));

    // Handle company info changes
    const handleCompanyChange = (field, value) => setCompanyInfo(prev => ({ ...prev, [field]: value }));

    // Handle logo upload
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Logo must be less than 2MB');
                return;
            }
            setCompanyInfo(prev => ({
                ...prev,
                logo: file,
                logoPreview: URL.createObjectURL(file)
            }));
        }
    };

    // Handle recruiter changes
    const handleRecruiterChange = (index, field, value) => {
        setRecruiters(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addRecruiter = () => {
        const maxAllowed = selectedPlan?.maxRecruiters || 1;
        if (maxAllowed !== -1 && recruiters.length >= maxAllowed - 1) {
            toast.error(`Your plan allows max ${maxAllowed} recruiters (including you)`);
            return;
        }
        setRecruiters(prev => [...prev, { name: '', email: '' }]);
    };

    const removeRecruiter = (index) => setRecruiters(prev => prev.filter((_, i) => i !== index));

    // Get current step index adjusted for login state
    const getStepContent = () => {
        if (isLoggedIn) {
            // Skip account creation step
            return currentStep;
        }
        return currentStep;
    };

    // Validation
    const validateStep = () => {
        const stepIndex = getStepContent();

        // Account creation step (only for non-logged in users)
        if (!isLoggedIn && stepIndex === 0) {
            if (!adminInfo.fullname || !adminInfo.email || !adminInfo.password) {
                toast.error('Please fill all required fields');
                return false;
            }
            if (adminInfo.password.length < 8) {
                toast.error('Password must be at least 8 characters');
                return false;
            }
            if (adminInfo.password !== adminInfo.confirmPassword) {
                toast.error('Passwords do not match');
                return false;
            }
            return true;
        }

        // Plan selection
        const planStepIndex = isLoggedIn ? 0 : 1;
        if (stepIndex === planStepIndex) {
            if (!selectedPlan) {
                toast.error('Please select a plan');
                return false;
            }
            return true;
        }

        // Company info
        const companyStepIndex = isLoggedIn ? 1 : 2;
        if (stepIndex === companyStepIndex) {
            if (!companyInfo.name || !companyInfo.location) {
                toast.error('Company name and location are required');
                return false;
            }
            return true;
        }

        return true;
    };

    const nextStep = () => {
        if (validateStep()) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
        }
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    // Handle final payment/registration
    const handlePayment = async () => {
        setLoading(true);
        try {
            const validRecruiters = recruiters.filter(r => r.name && r.email);

            // Create FormData for logo upload
            const formData = new FormData();
            formData.append('companyName', companyInfo.name);
            formData.append('email', companyInfo.email || adminInfo.email);
            formData.append('phone', companyInfo.phone);
            formData.append('description', companyInfo.description);
            formData.append('website', companyInfo.website);
            formData.append('location', companyInfo.location);
            formData.append('industry', companyInfo.industry);
            formData.append('companySize', companyInfo.size);
            formData.append('planId', selectedPlan.id);
            formData.append('billingCycle', billingCycle);
            formData.append('adminName', adminInfo.fullname);
            formData.append('adminEmail', adminInfo.email);
            formData.append('adminPassword', adminInfo.password);
            formData.append('adminPhone', adminInfo.phone);

            if (companyInfo.logo) {
                formData.append('file', companyInfo.logo);
            }

            // Initiate payment first
            const paymentResponse = await axios.post(`${PAYMENT_API_END_POINT}/initiate`, {
                planId: selectedPlan.id,
                billingCycle,
                amount: billingCycle === 'yearly' ? selectedPlan.yearlyPrice
                    : billingCycle === 'quarterly' ? selectedPlan.quarterlyPrice
                        : selectedPlan.monthlyPrice,
                companyData: {
                    name: companyInfo.name,
                    adminEmail: adminInfo.email
                }
            });

            if (!paymentResponse.data.success) {
                throw new Error(paymentResponse.data.message);
            }

            const { transactionId } = paymentResponse.data;

            // Store registration data for after payment
            const registrationData = {
                company: companyInfo,
                admin: adminInfo,
                plan: selectedPlan,
                billingCycle,
                recruiters: validRecruiters
            };
            sessionStorage.setItem('pendingRegistration', JSON.stringify(registrationData));
            sessionStorage.setItem('pendingTransactionId', transactionId);

            // Redirect to payment
            const price = billingCycle === 'yearly' ? selectedPlan.yearlyPrice
                : billingCycle === 'quarterly' ? selectedPlan.quarterlyPrice
                    : selectedPlan.monthlyPrice;

            window.location.href = `/company/payment/paddle?ref=${transactionId}&amount=${price}&plan=${selectedPlan.name}&priceId=${selectedPlan.paddlePriceId}`;

        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Success Screen
    if (registrationComplete) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
                <Navbar />
                <div className="container mx-auto px-4 py-16 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl mx-auto text-center"
                    >
                        <div className="w-20 h-20 mx-auto mb-8 rounded-sm bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-[#00FF94]" />
                        </div>
                        <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-4">
                            Welcome to Hire.OS
                        </h1>
                        <p className="text-gray-500 font-mono mb-8">
                            Your company has been successfully registered. You can now start posting jobs!
                        </p>
                        <Button
                            onClick={() => navigate('/admin/dashboard')}
                            className="px-8 py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider"
                        >
                            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </motion.div>
                </div>
            </div>
        );
    }

    // Calculate step content index
    const stepContentIndex = isLoggedIn ? currentStep + 1 : currentStep;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
            <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
            <Navbar />

            <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto"
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <Badge className="mb-3 px-3 py-1 bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20 text-[10px] font-mono uppercase tracking-widest">
                            <Building2 className="w-3 h-3 mr-1.5" /> Company Registration
                        </Badge>
                        <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-tight mb-2">
                            Start <span className="text-[#FFD700]">Hiring</span> Today
                        </h1>
                        <p className="text-gray-600 font-mono text-xs md:text-sm">
                            Complete the steps below to set up your recruitment platform
                        </p>
                    </div>

                    <StepIndicator currentStep={currentStep} steps={steps} />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="min-h-[400px]"
                        >
                            {/* Step 0: Create Account (only for non-logged in users) */}
                            {!isLoggedIn && currentStep === 0 && (
                                <div className="bg-[#111111] border border-white/10 rounded-sm p-6 md:p-8 relative">
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />

                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-[#FFD700]" />
                                        Create Admin Account
                                    </h2>

                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Full Name *
                                            </Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                                <Input
                                                    placeholder="Your full name"
                                                    value={adminInfo.fullname}
                                                    onChange={(e) => handleAdminChange('fullname', e.target.value)}
                                                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono pl-10"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Email *
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                                <Input
                                                    type="email"
                                                    placeholder="admin@company.com"
                                                    value={adminInfo.email}
                                                    onChange={(e) => handleAdminChange('email', e.target.value)}
                                                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono pl-10"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Phone
                                            </Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                                <Input
                                                    type="tel"
                                                    placeholder="+92 300 1234567"
                                                    value={adminInfo.phone}
                                                    onChange={(e) => handleAdminChange('phone', e.target.value)}
                                                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono pl-10"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Password *
                                            </Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Min 8 characters"
                                                    value={adminInfo.password}
                                                    onChange={(e) => handleAdminChange('password', e.target.value)}
                                                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono pl-10 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Confirm Password *
                                            </Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Re-enter password"
                                                    value={adminInfo.confirmPassword}
                                                    onChange={(e) => handleAdminChange('confirmPassword', e.target.value)}
                                                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono pl-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-600 font-mono mt-4">
                                        Already have an account?{' '}
                                        <a href="/login" className="text-[#FFD700] hover:underline">
                                            Login here
                                        </a>
                                    </p>
                                </div>
                            )}

                            {/* Step: Plan Selection */}
                            {((isLoggedIn && currentStep === 0) || (!isLoggedIn && currentStep === 1)) && (
                                <div>
                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 text-center">
                                        Choose Your Plan
                                    </h2>

                                    {/* Billing Toggle */}
                                    <div className="flex justify-center mb-6">
                                        <div className="inline-flex bg-white/5 border border-white/10 rounded-sm p-1">
                                            {['monthly', 'quarterly', 'yearly'].map((cycle) => (
                                                <button
                                                    key={cycle}
                                                    onClick={() => setBillingCycle(cycle)}
                                                    className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all rounded-sm ${billingCycle === cycle
                                                        ? 'bg-[#FFD700] text-black'
                                                        : 'text-gray-500 hover:text-white'
                                                        }`}
                                                >
                                                    {cycle}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                                        {plans.map(plan => (
                                            <PlanCard
                                                key={plan.id}
                                                plan={plan}
                                                selected={selectedPlan?.id === plan.id}
                                                onSelect={setSelectedPlan}
                                                billingCycle={billingCycle}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step: Company Info */}
                            {((isLoggedIn && currentStep === 1) || (!isLoggedIn && currentStep === 2)) && (
                                <div className="bg-[#111111] border border-white/10 rounded-sm p-6 md:p-8 relative">
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />

                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-[#FFD700]" />
                                        Company Details
                                    </h2>

                                    {/* Logo Upload */}
                                    <div className="mb-6 flex items-center gap-4">
                                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center overflow-hidden">
                                            {companyInfo.logoPreview ? (
                                                <img src={companyInfo.logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera className="w-6 h-6 text-gray-600" />
                                            )}
                                        </div>
                                        <div>
                                            <label className="cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="hidden"
                                                />
                                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-sm text-xs font-mono text-gray-400 hover:text-white hover:border-white/20 transition-colors">
                                                    <Upload className="w-3 h-3" />
                                                    Upload Logo
                                                </span>
                                            </label>
                                            <p className="text-[10px] text-gray-600 font-mono mt-1">Max 2MB, JPG/PNG</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Company Name *
                                            </Label>
                                            <Input
                                                placeholder="Acme Corporation"
                                                value={companyInfo.name}
                                                onChange={(e) => handleCompanyChange('name', e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Website
                                            </Label>
                                            <Input
                                                placeholder="https://company.com"
                                                value={companyInfo.website}
                                                onChange={(e) => handleCompanyChange('website', e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Location *
                                            </Label>
                                            <Input
                                                placeholder="Lahore, Pakistan"
                                                value={companyInfo.location}
                                                onChange={(e) => handleCompanyChange('location', e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Industry
                                            </Label>
                                            <select
                                                value={companyInfo.industry}
                                                onChange={(e) => handleCompanyChange('industry', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 text-white rounded-sm px-4 py-2.5 text-sm font-mono focus:border-[#FFD700]/50 focus:outline-none"
                                            >
                                                <option value="" className="bg-[#111]">Select industry</option>
                                                <option value="Technology" className="bg-[#111]">Technology</option>
                                                <option value="Finance" className="bg-[#111]">Finance</option>
                                                <option value="Healthcare" className="bg-[#111]">Healthcare</option>
                                                <option value="Education" className="bg-[#111]">Education</option>
                                                <option value="E-commerce" className="bg-[#111]">E-commerce</option>
                                                <option value="Manufacturing" className="bg-[#111]">Manufacturing</option>
                                                <option value="Consulting" className="bg-[#111]">Consulting</option>
                                                <option value="Other" className="bg-[#111]">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Company Size
                                            </Label>
                                            <select
                                                value={companyInfo.size}
                                                onChange={(e) => handleCompanyChange('size', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 text-white rounded-sm px-4 py-2.5 text-sm font-mono focus:border-[#FFD700]/50 focus:outline-none"
                                            >
                                                <option value="" className="bg-[#111]">Select size</option>
                                                <option value="1-10" className="bg-[#111]">1-10 employees</option>
                                                <option value="11-50" className="bg-[#111]">11-50 employees</option>
                                                <option value="51-200" className="bg-[#111]">51-200 employees</option>
                                                <option value="201-500" className="bg-[#111]">201-500 employees</option>
                                                <option value="501-1000" className="bg-[#111]">501-1000 employees</option>
                                                <option value="1000+" className="bg-[#111]">1000+ employees</option>
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                                Tagline
                                            </Label>
                                            <Input
                                                placeholder="Your company tagline..."
                                                value={companyInfo.tagline}
                                                onChange={(e) => handleCompanyChange('tagline', e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">
                                            Description
                                        </Label>
                                        <Textarea
                                            placeholder="Tell candidates about your company culture, mission, and values..."
                                            value={companyInfo.description}
                                            onChange={(e) => handleCompanyChange('description', e.target.value)}
                                            className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step: Add Team/Recruiters */}
                            {((isLoggedIn && currentStep === 2) || (!isLoggedIn && currentStep === 3)) && (
                                <div className="space-y-6">
                                    {/* Admin Preview */}
                                    <div className="bg-[#111111] border border-white/10 rounded-sm p-5 relative">
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#FFD700]/30" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-[#FFD700]" /> CEO / Admin (You)
                                        </h3>
                                        <div className="grid md:grid-cols-3 gap-3">
                                            <div className="p-3 bg-white/5 rounded-sm">
                                                <p className="text-[10px] text-gray-600 uppercase font-mono mb-0.5">Name</p>
                                                <p className="text-white text-sm font-mono truncate">{adminInfo.fullname || user?.fullname || '-'}</p>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-sm">
                                                <p className="text-[10px] text-gray-600 uppercase font-mono mb-0.5">Email</p>
                                                <p className="text-white text-sm font-mono truncate">{adminInfo.email || user?.email || '-'}</p>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-sm">
                                                <p className="text-[10px] text-gray-600 uppercase font-mono mb-0.5">Role</p>
                                                <p className="text-[#FFD700] text-sm font-mono">Company Admin</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recruiters */}
                                    <div className="bg-[#111111] border border-white/10 rounded-sm p-5 relative">
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-[#FFD700]" /> Invite Team Members
                                            <Badge className="ml-auto bg-white/10 text-gray-400 text-[10px] font-mono">
                                                {recruiters.length}/{selectedPlan?.maxRecruiters === -1 ? '∞' : selectedPlan?.maxRecruiters - 1 || 0}
                                            </Badge>
                                        </h3>
                                        <p className="text-gray-600 text-xs font-mono mb-4">
                                            Add recruiters who'll help manage job postings and candidates
                                        </p>

                                        {recruiters.length > 0 && (
                                            <div className="space-y-3 mb-4">
                                                {recruiters.map((recruiter, index) => (
                                                    <RecruiterForm
                                                        key={index}
                                                        recruiter={recruiter}
                                                        index={index}
                                                        onChange={handleRecruiterChange}
                                                        onRemove={removeRecruiter}
                                                        canRemove={true}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        <Button
                                            type="button"
                                            onClick={addRecruiter}
                                            variant="outline"
                                            className="w-full border-dashed border-white/20 text-gray-500 hover:text-white hover:border-white/40 rounded-sm text-xs"
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> Add Recruiter
                                        </Button>

                                        <p className="text-[10px] text-gray-600 font-mono mt-3 text-center">
                                            💡 You can skip this and invite team members later
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step: Payment */}
                            {((isLoggedIn && currentStep === 3) || (!isLoggedIn && currentStep === 4)) && (
                                <div className="bg-[#111111] border border-white/10 rounded-sm p-6 md:p-8 relative">
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />

                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-[#FFD700]" /> Order Summary
                                    </h2>

                                    <div className="p-5 bg-white/5 rounded-sm mb-6">
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-mono">Plan</span>
                                                <span className="text-white font-mono">{selectedPlan?.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-mono">Billing</span>
                                                <span className="text-white font-mono capitalize">{billingCycle}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-mono">Company</span>
                                                <span className="text-white font-mono">{companyInfo.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-mono">Team Size</span>
                                                <span className="text-white font-mono">{recruiters.filter(r => r.name && r.email).length + 1}</span>
                                            </div>
                                            <div className="border-t border-white/10 my-3" />
                                            <div className="flex justify-between text-lg font-bold">
                                                <span className="text-white">Total</span>
                                                <span className="text-[#FFD700] font-mono">
                                                    Rs {(billingCycle === 'yearly' ? selectedPlan?.yearlyPrice
                                                        : billingCycle === 'quarterly' ? selectedPlan?.quarterlyPrice
                                                            : selectedPlan?.monthlyPrice)?.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-sm mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-4 h-4 text-[#FFD700]" />
                                            <span className="text-white font-bold text-sm">Secure Payment</span>
                                        </div>
                                        <ul className="space-y-1 text-xs text-gray-500 font-mono">
                                            <li className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-[#00FF94]" /> Credit/Debit Cards
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-[#00FF94]" /> Bank Transfer
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-[#00FF94]" /> 30-day Money Back Guarantee
                                            </li>
                                        </ul>
                                    </div>

                                    <Button
                                        onClick={handlePayment}
                                        disabled={loading}
                                        className="w-full py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                                            </>
                                        ) : (
                                            <>
                                                Complete Registration
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-center text-gray-600 text-[10px] font-mono mt-4">
                                        By completing, you agree to our Terms of Service and Privacy Policy
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm uppercase tracking-wider text-xs"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                        </Button>

                        {currentStep < steps.length - 1 && (
                            <Button
                                onClick={nextStep}
                                className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider text-xs font-bold"
                            >
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminSignupFlow;
