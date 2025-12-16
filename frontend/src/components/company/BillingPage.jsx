import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Crown, CreditCard, Calendar, Clock, Download, RefreshCw,
    ArrowUpRight, CheckCircle, XCircle, AlertTriangle, Receipt,
    Building2, Zap, FileText, ExternalLink, History
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';
import axios from 'axios';
import { SUBSCRIPTION_API_END_POINT } from '@/utils/constant';
import { useSubscription } from '@/hooks/useSubscription';
import Navbar from '../shared/Navbar';

const BillingPage = () => {
    const navigate = useNavigate();
    const {
        subscription,
        loading: subLoading,
        getDaysRemaining,
        isExpiringSoon,
        isExpired,
        refresh
    } = useSubscription();

    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchPaymentHistory();
    }, []);

    const fetchPaymentHistory = async () => {
        try {
            const response = await axios.get(`${SUBSCRIPTION_API_END_POINT}/history`, {
                withCredentials: true
            });
            if (response.data.success) {
                setPaymentHistory(response.data.payments || []);
            }
        } catch (error) {
            console.error('Failed to fetch payment history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refresh(), fetchPaymentHistory()]);
        setRefreshing(false);
        toast.success('Billing data refreshed');
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0
        }).format(price);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusColor = () => {
        if (isExpired()) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (isExpiringSoon()) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        return 'bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]/30';
    };

    const daysRemaining = getDaysRemaining();

    // Calculate subscription progress
    const calculateProgress = () => {
        if (!subscription?.startDate || !subscription?.endDate) return 0;
        const start = new Date(subscription.startDate).getTime();
        const end = new Date(subscription.endDate).getTime();
        const now = Date.now();
        const total = end - start;
        const elapsed = now - start;
        return Math.max(0, Math.min(100, (elapsed / total) * 100));
    };

    if (subLoading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-2 border-[#FFD700]/30 rounded-sm" />
                        <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] rounded-sm animate-spin" />
                    </div>
                    <p className="text-[#FFD700]/70 font-mono text-sm uppercase tracking-wider">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
            <Navbar />

            {/* Industrial Grid Background */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
            </div>

            <div className="container mx-auto px-4 py-8 pt-24 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4"
                >
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight uppercase">
                            Billing & Subscription
                        </h1>
                        <p className="text-gray-500 text-sm font-mono mt-1">
                            Manage your subscription and payment history
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="border-white/10 text-gray-400 hover:bg-white/5 rounded-sm"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => navigate('/company/pricing')}
                            className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold text-xs uppercase tracking-wider"
                        >
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Upgrade Plan
                        </Button>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Subscription Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 relative bg-[#111111] border border-white/10 rounded-sm overflow-hidden"
                    >
                        {/* Corner accents */}
                        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#FFD700]/30" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#FFD700]/30" />

                        {/* Expiry Warning Banner */}
                        {isExpiringSoon() && !isExpired() && (
                            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <span className="text-amber-400 text-xs font-mono">
                                    Subscription expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} - Renew now to avoid interruption
                                </span>
                            </div>
                        )}

                        {isExpired() && (
                            <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
                                <XCircle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 text-xs font-mono">
                                    Your subscription has expired - Renew to restore access
                                </span>
                            </div>
                        )}

                        <div className="p-6">
                            {/* Plan Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-[#FFD700] rounded-sm flex items-center justify-center">
                                        <Crown className="w-7 h-7 text-black" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                                            {subscription?.plan || 'Basic'} Plan
                                        </h2>
                                        <p className="text-gray-500 text-xs font-mono uppercase">
                                            {subscription?.type || 'Monthly'} Billing
                                        </p>
                                    </div>
                                </div>
                                <Badge className={`${getStatusColor()} text-xs px-3 py-1 rounded-sm uppercase tracking-wider font-mono`}>
                                    {isExpired() ? 'Expired' : subscription?.status || 'Active'}
                                </Badge>
                            </div>

                            {/* Subscription Dates */}
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-white/5 rounded-sm border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-4 h-4 text-[#FFD700]" />
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Start Date</span>
                                    </div>
                                    <p className="text-lg font-bold text-white font-mono">
                                        {subscription?.startDate ? formatDate(subscription.startDate) : '-'}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-sm border ${daysRemaining <= 7 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-4 h-4 text-[#FFD700]" />
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Expiry Date</span>
                                    </div>
                                    <p className={`text-lg font-bold font-mono ${daysRemaining <= 7 ? 'text-amber-400' : 'text-white'}`}>
                                        {subscription?.endDate ? formatDate(subscription.endDate) : '-'}
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-sm border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-[#FFD700]" />
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Days Left</span>
                                    </div>
                                    <p className={`text-lg font-bold font-mono ${daysRemaining <= 7 ? 'text-amber-400' : daysRemaining <= 0 ? 'text-red-400' : 'text-[#00FF94]'}`}>
                                        {daysRemaining !== null ? (daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days`) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Subscription Progress */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">Subscription Period</span>
                                    <span className="text-xs text-gray-400 font-mono">{Math.round(calculateProgress())}% elapsed</span>
                                </div>
                                <Progress value={calculateProgress()} className="h-2 bg-white/10" />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                                {isExpired() ? (
                                    <Button
                                        onClick={() => navigate('/company/pricing')}
                                        className="bg-red-500 hover:bg-red-600 text-white rounded-sm font-bold text-xs uppercase tracking-wider"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Renew Subscription
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() => navigate('/company/pricing')}
                                            className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold text-xs uppercase tracking-wider"
                                        >
                                            <ArrowUpRight className="w-4 h-4 mr-2" />
                                            Upgrade Plan
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-white/10 text-gray-400 hover:bg-white/5 rounded-sm text-xs uppercase tracking-wider"
                                        >
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Update Payment
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4"
                    >
                        {/* Plan Features */}
                        <div className="relative bg-[#111111] border border-white/10 rounded-sm p-5">
                            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10" />
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#FFD700]" />
                                Plan Features
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 font-mono">Job Postings</span>
                                    <span className="text-sm text-white font-mono">
                                        {subscription?.features?.maxJobPostings === -1 ? '∞' : subscription?.features?.maxJobPostings || 5}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 font-mono">Team Members</span>
                                    <span className="text-sm text-white font-mono">
                                        {subscription?.features?.maxRecruiters === -1 ? '∞' : subscription?.features?.maxRecruiters || 1}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 font-mono">AI Interviews</span>
                                    {subscription?.features?.aiInterviews ? (
                                        <CheckCircle className="w-4 h-4 text-[#00FF94]" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-gray-600" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 font-mono">Analytics</span>
                                    {subscription?.features?.advancedAnalytics ? (
                                        <CheckCircle className="w-4 h-4 text-[#00FF94]" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-gray-600" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Support */}
                        <div className="relative bg-[#111111] border border-white/10 rounded-sm p-5">
                            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10" />
                            <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Need Help?</h3>
                            <p className="text-xs text-gray-500 mb-4 font-mono">
                                Contact our support team for billing inquiries
                            </p>
                            <Button
                                variant="outline"
                                className="w-full border-white/10 text-gray-400 hover:bg-white/5 rounded-sm text-xs uppercase tracking-wider"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Contact Support
                            </Button>
                        </div>
                    </motion.div>
                </div>

                {/* Payment History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 relative bg-[#111111] border border-white/10 rounded-sm overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/10" />

                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <History className="w-4 h-4 text-[#FFD700]" />
                            Payment History
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        {loadingHistory ? (
                            <div className="p-8 text-center">
                                <div className="w-8 h-8 border-2 border-transparent border-t-[#FFD700] rounded-full animate-spin mx-auto" />
                            </div>
                        ) : paymentHistory.length === 0 ? (
                            <div className="p-12 text-center">
                                <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                                <p className="text-gray-500 font-mono">No payment history</p>
                                <p className="text-gray-600 text-sm mt-1">Transactions will appear here</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction</th>
                                        <th className="text-left py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="text-left py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="text-left py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="text-left py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="text-right py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paymentHistory.map((payment, index) => (
                                        <tr key={payment._id || index} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-5">
                                                <span className="text-sm text-gray-300 font-mono">
                                                    {payment.transactionId?.substring(0, 12)}...
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className="text-sm text-gray-400 font-mono">
                                                    {formatDate(payment.paymentDate)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <Badge className="bg-white/5 text-gray-300 border-white/10 rounded-sm text-[10px] uppercase">
                                                    {payment.plan} / {payment.duration}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className="text-sm text-white font-mono font-bold">
                                                    {formatPrice(payment.amount)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <Badge className={`rounded-sm text-[10px] uppercase ${payment.status === 'completed'
                                                        ? 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30'
                                                        : payment.status === 'pending'
                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                    }`}>
                                                    {payment.status}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                {payment.invoiceUrl ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-[#FFD700] hover:bg-[#FFD700]/10"
                                                        onClick={() => window.open(payment.invoiceUrl, '_blank')}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-gray-600">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default BillingPage;
