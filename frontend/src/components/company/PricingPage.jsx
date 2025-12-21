import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  X,
  Zap,
  Building2,
  Users,
  Briefcase,
  Video,
  Brain,
  BarChart3,
  Shield,
  Star,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { SUBSCRIPTION_API_END_POINT } from "@/utils/constant";
import Navbar from "../shared/Navbar";

const PricingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${SUBSCRIPTION_API_END_POINT}/plans`);
      if (response.data.success) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      // Fallback to default plans
      setPlans([
        {
          id: "basic",
          name: "BASIC",
          description: "Small Teams",
          prices: { monthly: 5000, quarterly: 13500, yearly: 48000 },
          features: {
            maxJobPostings: 5,
            maxRecruiters: 1,
            advancedAnalytics: false,
            prioritySupport: false,
            videoInterviews: false,
            mcqTests: false,
            aiRecommendations: false,
          },
        },
        {
          id: "professional",
          name: "PROFESSIONAL",
          description: "Growing Companies",
          popular: true,
          prices: { monthly: 15000, quarterly: 40500, yearly: 144000 },
          features: {
            maxJobPostings: 20,
            maxRecruiters: 5,
            advancedAnalytics: true,
            prioritySupport: true,
            videoInterviews: true,
            mcqTests: true,
            aiRecommendations: true,
          },
        },
        {
          id: "enterprise",
          name: "ENTERPRISE",
          description: "Large Organizations",
          prices: { monthly: 40000, quarterly: 108000, yearly: 384000 },
          features: {
            maxJobPostings: "Unlimited",
            maxRecruiters: "Unlimited",
            advancedAnalytics: true,
            prioritySupport: true,
            videoInterviews: true,
            mcqTests: true,
            aiRecommendations: true,
            apiAccess: true,
            dedicatedSupport: true,
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    navigate("/admin/signup", {
      state: { plan: plan.id, billing: billingCycle },
    });
  };

  const featuresList = [
    { key: "maxJobPostings", label: "Job Postings", icon: Briefcase },
    { key: "maxRecruiters", label: "Team Members", icon: Users },
    { key: "videoInterviews", label: "Video Interviews", icon: Video },
    { key: "mcqTests", label: "MCQ Tests", icon: Brain },
    { key: "advancedAnalytics", label: "Analytics", icon: BarChart3 },
    { key: "aiRecommendations", label: "AI Matching", icon: Sparkles },
    { key: "prioritySupport", label: "Priority Support", icon: Shield },
    { key: "apiAccess", label: "API Access", icon: Zap },
  ];

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculateDiscount = (monthly, current) => {
    const monthlyTotal = monthly * (billingCycle === "quarterly" ? 3 : 12);
    const discount = ((monthlyTotal - current) / monthlyTotal) * 100;
    return Math.round(discount);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <Badge className="mb-6 px-3 py-1 bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 rounded-sm text-[10px] uppercase tracking-wider font-mono">
              <Crown className="w-3 h-3 mr-1" />
              Subscription Plans
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
              Select Your
              <span className="text-[#FFD700]"> Plan</span>
            </h1>
            <p className="text-gray-500 text-sm font-mono">
              Industrial-grade recruitment tools for every scale
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-2 mb-12"
          >
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-sm font-medium text-xs uppercase tracking-wider transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#FFD700] text-black"
                  : "bg-[#111111] text-gray-500 hover:bg-white/10 border border-white/10"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-sm font-medium text-xs uppercase tracking-wider transition-all ${
                billingCycle === "yearly"
                  ? "bg-[#FFD700] text-black"
                  : "bg-[#111111] text-gray-500 hover:bg-white/10 border border-white/10"
              }`}
            >
              Yearly
            </button>
            {billingCycle === "yearly" && (
              <Badge className="bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30 rounded-sm text-[10px] uppercase tracking-wider font-mono">
                Save 20%
              </Badge>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-[#FFD700] text-black px-3 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-bold">
                      <Star className="w-3 h-3 mr-1" /> Recommended
                    </Badge>
                  </div>
                )}

                <div
                  className={`h-full transition-all duration-300 rounded-sm border overflow-hidden ${
                    plan.popular
                      ? "bg-[#111111] border-[#FFD700]/50 shadow-[0_0_30px_rgba(255,215,0,0.1)]"
                      : "bg-[#111111] border-white/10 hover:border-[#FFD700]/30"
                  }`}
                >
                  {/* HUD Corner Accents */}
                  <div
                    className={`absolute top-0 right-0 w-4 h-4 border-t border-r ${plan.popular ? "border-[#FFD700]/50" : "border-white/10"}`}
                  />
                  <div
                    className={`absolute bottom-0 left-0 w-4 h-4 border-b border-l ${plan.popular ? "border-[#FFD700]/50" : "border-white/10"}`}
                  />

                  {/* Header */}
                  <div className="text-center p-6 border-b border-white/5">
                    <div
                      className={`w-12 h-12 mx-auto mb-3 rounded-sm flex items-center justify-center ${
                        plan.popular
                          ? "bg-[#FFD700]"
                          : "bg-white/5 border border-white/10"
                      }`}
                    >
                      {plan.id === "basic" && (
                        <Building2
                          className={`w-6 h-6 ${plan.popular ? "text-black" : "text-[#FFD700]"}`}
                        />
                      )}
                      {plan.id === "professional" && (
                        <Crown
                          className={`w-6 h-6 ${plan.popular ? "text-black" : "text-[#FFD700]"}`}
                        />
                      )}
                      {plan.id === "enterprise" && (
                        <Zap
                          className={`w-6 h-6 ${plan.popular ? "text-black" : "text-[#FFD700]"}`}
                        />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 text-xs font-mono uppercase">
                      {plan.description}
                    </p>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-white font-mono">
                          {formatPrice(plan.prices[billingCycle])}
                        </span>
                      </div>
                      <span className="text-gray-600 text-xs font-mono">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                      {billingCycle === "yearly" && (
                        <p className="text-[10px] text-[#00FF94] mt-1 font-mono">
                          SAVE{" "}
                          {calculateDiscount(
                            plan.prices.monthly,
                            plan.prices.yearly,
                          )}
                          %
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-6 space-y-3">
                    {featuresList.map((feature) => {
                      const value = plan.features[feature.key];
                      const hasFeature =
                        value === true ||
                        typeof value === "number" ||
                        value === "Unlimited";

                      return (
                        <div
                          key={feature.key}
                          className={`flex items-center gap-2 ${hasFeature ? "text-gray-400" : "text-gray-700"}`}
                        >
                          {hasFeature ? (
                            <div className="w-4 h-4 rounded-sm bg-[#00FF94]/10 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-[#00FF94]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-sm bg-white/5 flex items-center justify-center">
                              <X className="w-2.5 h-2.5 text-gray-700" />
                            </div>
                          )}
                          <feature.icon className="w-3 h-3" />
                          <span className="text-xs">
                            {typeof value === "number" || value === "Unlimited"
                              ? `${value} ${feature.label}`
                              : feature.label}
                          </span>
                        </div>
                      );
                    })}

                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full mt-6 py-5 font-bold text-xs uppercase tracking-wider rounded-sm transition-all ${
                        plan.popular
                          ? "bg-[#FFD700] hover:bg-[#FFE44D] text-black shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                          : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                      }`}
                    >
                      Initialize
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-center"
          >
            <div className="flex items-center justify-center gap-6 text-gray-600 text-xs font-mono uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00FF94]" />
                <span>Secure</span>
              </div>
              <span className="text-gray-800">|</span>
              <span>Cancel Anytime</span>
              <span className="text-gray-800">|</span>
              <span>24/7 Support</span>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
