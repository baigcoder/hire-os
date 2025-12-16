import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Crown, Check, ArrowRight, ArrowLeft, CreditCard,
    User, Mail, Phone, Lock, Eye, EyeOff, Briefcase, Users,
    Sparkles, Shield, Video, Brain, BarChart3, Upload, Plus,
    Trash2, Send, CheckCircle, Loader2, Globe, MapPin, Terminal
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { COMPANY_API_END_POINT, PAYMENT_API_END_POINT } from '@/utils/constant';
import Navbar from '../shared/Navbar';

// ========== INDUSTRIAL STEP INDICATOR ==========
const StepIndicator = ({ currentStep, steps }) => (
    <div className="flex items-center justify-center mb-12">
        {steps.map((step, index) => (
            <React.Fragment key={index}>
                <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-sm flex items-center justify-center font-mono font-bold text-sm transition-all border ${index < currentStep
                        ? 'bg-[#00FF94]/20 border-[#00FF94]/50 text-[#00FF94]'
                        : index === currentStep
                            ? 'bg-[#FFD700] border-[#FFD700] text-black'
                            : 'bg-white/5 border-white/10 text-gray-600'
                        }`}>
                        {index < currentStep ? <Check className="w-5 h-5" /> : String(index + 1).padStart(2, '0')}
                    </div>
                    <span className={`mt-2 text-xs font-mono uppercase tracking-wider ${index <= currentStep ? 'text-white' : 'text-gray-600'}`}>
                        {step}
                    </span>
                </div>
                {index < steps.length - 1 && (
                    <div className={`w-16 md:w-24 h-px mx-2 ${index < currentStep ? 'bg-[#00FF94]' : 'bg-white/10'}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

// ========== INDUSTRIAL PLAN CARD ==========
const PlanCard = ({ plan, selected, onSelect }) => (
    <div
        onClick={() => onSelect(plan)}
        className={`relative p-6 rounded-sm cursor-pointer transition-all border ${selected
            ? 'border-[#FFD700] bg-[#FFD700]/5 shadow-[0_0_30px_rgba(255,215,0,0.1)]'
            : 'border-white/10 bg-[#111111] hover:border-white/20'
            }`}
    >
        {/* HUD corners */}
        <div className={`absolute top-0 right-0 w-6 h-6 border-t border-r ${selected ? 'border-[#FFD700]/50' : 'border-white/10'}`} />
        <div className={`absolute bottom-0 left-0 w-6 h-6 border-b border-l ${selected ? 'border-[#FFD700]/50' : 'border-white/10'}`} />

        {plan.popular && (
            <Badge className="absolute -top-px right-4 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded-b-sm rounded-t-none uppercase tracking-wider">
                Popular
            </Badge>
        )}
        <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">{plan.name}</h3>
        <p className="text-gray-600 text-xs font-mono mb-4">{plan.description}</p>
        <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-bold text-white font-mono">Rs {plan.price.toLocaleString()}</span>
            <span className="text-gray-600 text-xs font-mono">/month</span>
        </div>
        <ul className="space-y-2">
            {plan.features.slice(0, 4).map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-500 text-xs font-mono">
                    <Check className="w-3 h-3 text-[#00FF94]" />
                    {feature}
                </li>
            ))}
        </ul>
    </div>
);

// ========== INDUSTRIAL RECRUITER FORM ==========
const RecruiterForm = ({ recruiter, index, onChange, onRemove, canRemove }) => (
    <div className="p-5 bg-white/5 border border-white/10 rounded-sm relative">
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10" />
        {canRemove && (
            <button
                onClick={() => onRemove(index)}
                className="absolute top-3 right-3 p-1.5 text-red-400 hover:bg-red-500/10 rounded-sm"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
        <div className="grid md:grid-cols-2 gap-4">
            <div>
                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Full Name *</Label>
                <Input
                    placeholder="John Doe"
                    value={recruiter.name}
                    onChange={(e) => onChange(index, 'name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                />
            </div>
            <div>
                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Email *</Label>
                <Input
                    type="email"
                    placeholder="john@company.com"
                    value={recruiter.email}
                    onChange={(e) => onChange(index, 'email', e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                />
            </div>
            <div>
                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Phone</Label>
                <Input
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={recruiter.phone}
                    onChange={(e) => onChange(index, 'phone', e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                />
            </div>
            <div>
                <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Job Title</Label>
                <Input
                    placeholder="HR Manager"
                    value={recruiter.role}
                    onChange={(e) => onChange(index, 'role', e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono"
                />
            </div>
        </div>
    </div>
);

// ========== MAIN COMPONENT ==========
const CompanyRegistration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const preSelectedPlan = location.state?.plan;

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    const steps = ['Select Plan', 'Company Info', 'Add Recruiters', 'Payment'];

    const { user } = useSelector(state => state.auth);

    // Plan data with Paddle Price IDs
    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            description: 'For startups getting started',
            price: 5000,
            priceUSD: 18,
            paddlePriceId: 'pri_01kc2k2hnr4re5yn3fevrkj9ty',
            features: ['5 Job Postings', '1 Recruiter Account', 'Basic Analytics', 'Email Support'],
            maxRecruiters: 1
        },
        {
            id: 'professional',
            name: 'Professional',
            description: 'For growing companies',
            price: 15000,
            priceUSD: 54,
            paddlePriceId: 'pri_01kc2k3tyv04ysgqjqbwk7z46f',
            popular: true,
            features: ['20 Job Postings', '5 Recruiter Accounts', 'Video Interviews', 'MCQ Tests', 'AI Recommendations', 'Priority Support'],
            maxRecruiters: 5
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'For large organizations',
            price: 40000,
            priceUSD: 143,
            paddlePriceId: 'pri_01kc2k4xnpav2hmzd5h8vncxfm',
            features: ['Unlimited Job Postings', 'Unlimited Recruiters', 'API Access', 'Dedicated Manager', 'Custom Integrations'],
            maxRecruiters: -1
        }
    ];

    const [selectedPlan, setSelectedPlan] = useState(plans.find(p => p.id === preSelectedPlan) || null);

    const [companyInfo, setCompanyInfo] = useState({
        name: '', website: '', location: '', description: '', industry: '', size: ''
    });

    const adminInfo = {
        fullname: user?.fullname || '',
        email: user?.email || '',
        phoneNumber: user?.phoneNumber || '',
        userId: user?._id || user?.id
    };

    const [recruiters, setRecruiters] = useState([{ name: '', email: '', phone: '', role: '' }]);
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [registrationResult, setRegistrationResult] = useState(null);

    const handleCompanyChange = (field, value) => setCompanyInfo(prev => ({ ...prev, [field]: value }));
    const handleRecruiterChange = (index, field, value) => {
        setRecruiters(prev => { const updated = [...prev]; updated[index] = { ...updated[index], [field]: value }; return updated; });
    };
    const addRecruiter = () => {
        const maxAllowed = selectedPlan?.maxRecruiters || 1;
        if (maxAllowed !== -1 && recruiters.length >= maxAllowed - 1) {
            toast.error(`Plan allows max ${maxAllowed} recruiters`);
            return;
        }
        setRecruiters(prev => [...prev, { name: '', email: '', phone: '', role: '' }]);
    };
    const removeRecruiter = (index) => setRecruiters(prev => prev.filter((_, i) => i !== index));

    const validateStep = () => {
        switch (currentStep) {
            case 0: if (!selectedPlan) { toast.error('Select a plan'); return false; } return true;
            case 1: if (!companyInfo.name || !companyInfo.location) { toast.error('Company name and location required'); return false; } return true;
            case 2: return true;
            default: return true;
        }
    };

    const nextStep = () => { if (validateStep()) setCurrentStep(prev => Math.min(prev + 1, steps.length - 1)); };
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const handlePayment = async () => {
        setLoading(true);
        try {
            const validRecruiters = recruiters.filter(r => r.name && r.email);
            const paymentResponse = await axios.post(`${PAYMENT_API_END_POINT}/initiate`, {
                planId: selectedPlan.id,
                billingCycle: 'monthly',
                amount: selectedPlan.price,
                companyData: { name: companyInfo.name, adminEmail: adminInfo.email }
            });
            if (!paymentResponse.data.success) throw new Error(paymentResponse.data.message);
            const { transactionId } = paymentResponse.data;

            const registrationData = {
                company: companyInfo,
                admin: adminInfo,
                plan: selectedPlan,
                recruiters: validRecruiters.map(r => ({ name: r.name, email: r.email, phone: r.phone, jobTitle: r.role }))
            };
            sessionStorage.setItem('pendingRegistration', JSON.stringify(registrationData));
            sessionStorage.setItem('pendingTransactionId', transactionId);

            window.location.href = `/company/payment/paddle?ref=${transactionId}&amount=${selectedPlan.price}&plan=${selectedPlan.name}&priceId=${selectedPlan.paddlePriceId}`;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // Success Screen
    if (registrationComplete && registrationResult) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
                <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
                <Navbar />
                <div className="container mx-auto px-4 py-16 relative z-10">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
                        <div className="w-20 h-20 mx-auto mb-8 rounded-sm bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-[#00FF94]" />
                        </div>
                        <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-4">Registration Complete</h1>
                        <p className="text-gray-500 font-mono mb-8">Company successfully initialized in the system.</p>
                        <Button onClick={() => navigate('/login')} className="px-8 py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider">
                            Access Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <Navbar />

            <div className="container mx-auto px-4 py-12 relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <Badge className="mb-4 px-4 py-1.5 bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20 text-xs font-mono uppercase tracking-widest">
                            <Building2 className="w-3 h-3 mr-2" /> Company Registration
                        </Badge>
                        <h1 className="text-4xl font-bold uppercase tracking-tight mb-4">
                            Register <span className="text-[#FFD700]">Organization</span>
                        </h1>
                        <p className="text-gray-600 font-mono text-sm">Complete setup to deploy your recruitment infrastructure</p>
                    </div>

                    <StepIndicator currentStep={currentStep} steps={steps} />

                    <AnimatePresence mode="wait">
                        <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="min-h-[400px]">

                            {/* Step 1: Plan Selection */}
                            {currentStep === 0 && (
                                <div>
                                    <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-6 text-center">Select Subscription Tier</h2>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        {plans.map(plan => <PlanCard key={plan.id} plan={plan} selected={selectedPlan?.id === plan.id} onSelect={setSelectedPlan} />)}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Company Info */}
                            {currentStep === 1 && (
                                <div className="bg-[#111111] border border-white/10 rounded-sm p-8 relative">
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />
                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Company Information</h2>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Company Name *</Label>
                                            <Input placeholder="Acme Corporation" value={companyInfo.name} onChange={(e) => handleCompanyChange('name', e.target.value)} className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Website</Label>
                                            <Input placeholder="https://company.com" value={companyInfo.website} onChange={(e) => handleCompanyChange('website', e.target.value)} className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Location *</Label>
                                            <Input placeholder="Lahore, Pakistan" value={companyInfo.location} onChange={(e) => handleCompanyChange('location', e.target.value)} className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Industry</Label>
                                            <Input placeholder="Technology" value={companyInfo.industry} onChange={(e) => handleCompanyChange('industry', e.target.value)} className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Company Size</Label>
                                            <select value={companyInfo.size} onChange={(e) => handleCompanyChange('size', e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-sm px-4 py-2.5 text-sm font-mono focus:border-[#FFD700]/50 focus:outline-none">
                                                <option value="" className="bg-[#111]">Select size</option>
                                                <option value="1-10" className="bg-[#111]">1-10</option>
                                                <option value="11-50" className="bg-[#111]">11-50</option>
                                                <option value="51-200" className="bg-[#111]">51-200</option>
                                                <option value="201-500" className="bg-[#111]">201-500</option>
                                                <option value="500+" className="bg-[#111]">500+</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <Label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 block">Description</Label>
                                        <Textarea placeholder="Tell candidates about your company..." value={companyInfo.description} onChange={(e) => handleCompanyChange('description', e.target.value)} className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FFD700]/50 rounded-sm font-mono min-h-[100px]" />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Add Recruiters */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    {/* Admin Info (Read-only) */}
                                    <div className="bg-[#111111] border border-white/10 rounded-sm p-6 relative">
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#FFD700]/30" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-[#FFD700]" /> Admin Account
                                        </h3>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="p-3 bg-white/5 rounded-sm">
                                                <p className="text-[10px] text-gray-600 uppercase font-mono mb-1">Name</p>
                                                <p className="text-white text-sm font-mono">{adminInfo.fullname || 'Not set'}</p>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-sm">
                                                <p className="text-[10px] text-gray-600 uppercase font-mono mb-1">Email</p>
                                                <p className="text-white text-sm font-mono">{adminInfo.email || 'Not set'}</p>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-sm">
                                                <p className="text-[10px] text-gray-600 uppercase font-mono mb-1">Phone</p>
                                                <p className="text-white text-sm font-mono">{adminInfo.phoneNumber || 'Not set'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recruiters */}
                                    <div className="bg-[#111111] border border-white/10 rounded-sm p-6 relative">
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-[#FFD700]" /> Invite Recruiters
                                        </h3>
                                        <p className="text-gray-600 text-xs font-mono mb-4">Add team members. They'll receive email invitations with login credentials.</p>
                                        <div className="space-y-4">
                                            {recruiters.map((recruiter, index) => (
                                                <RecruiterForm key={index} recruiter={recruiter} index={index} onChange={handleRecruiterChange} onRemove={removeRecruiter} canRemove={recruiters.length > 1} />
                                            ))}
                                        </div>
                                        <Button type="button" onClick={addRecruiter} variant="outline" className="mt-4 w-full border-dashed border-white/20 text-gray-500 hover:text-white hover:border-white/40 rounded-sm">
                                            <Plus className="w-4 h-4 mr-2" /> Add Recruiter
                                        </Button>
                                        <p className="text-xs text-gray-600 font-mono mt-3">💡 You can skip this and add recruiters later from dashboard.</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Payment */}
                            {currentStep === 3 && (
                                <div className="bg-[#111111] border border-white/10 rounded-sm p-8 relative">
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />
                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-[#FFD700]" /> Payment Summary
                                    </h2>

                                    <div className="p-6 bg-white/5 rounded-sm mb-6">
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-500 font-mono">Plan</span><span className="text-white font-mono">{selectedPlan?.name}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500 font-mono">Billing</span><span className="text-white font-mono">Monthly</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500 font-mono">Company</span><span className="text-white font-mono">{companyInfo.name}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-500 font-mono">Recruiters</span><span className="text-white font-mono">{recruiters.filter(r => r.name && r.email).length}</span></div>
                                            <div className="border-t border-white/10 my-4" />
                                            <div className="flex justify-between text-lg font-bold">
                                                <span className="text-white">Total</span>
                                                <span className="text-[#FFD700] font-mono">Rs {selectedPlan?.price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-sm mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Shield className="w-5 h-5 text-[#FFD700]" />
                                            <span className="text-white font-bold text-sm">Secure Payment via Paddle</span>
                                        </div>
                                        <ul className="space-y-1 text-xs text-gray-500 font-mono">
                                            <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00FF94]" /> Credit/Debit Cards</li>
                                            <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00FF94]" /> Bank Transfer</li>
                                            <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[#00FF94]" /> Mobile Wallets</li>
                                        </ul>
                                    </div>

                                    <Button onClick={handlePayment} disabled={loading} className="w-full py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><CreditCard className="w-4 h-4 mr-2" /> Pay Rs {selectedPlan?.price.toLocaleString()}</>}
                                    </Button>
                                    <p className="text-center text-gray-600 text-[10px] font-mono mt-4 uppercase tracking-wider">By completing purchase, you agree to our Terms of Service</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    {currentStep < 4 && (
                        <div className="flex justify-between mt-8">
                            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0} className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm uppercase tracking-wider text-xs">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                            </Button>
                            <Button onClick={nextStep} className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider text-xs font-bold">
                                {currentStep === 3 ? 'Continue to Payment' : 'Next Step'} <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default CompanyRegistration;
