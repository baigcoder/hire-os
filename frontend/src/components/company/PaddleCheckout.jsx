import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  CreditCard,
  Building2,
  Shield,
  Terminal,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { COMPANY_API_END_POINT } from "@/utils/constant";
import api from "@/utils/api";
import Navbar from "../shared/Navbar";
import { setUser } from "@/redux/authSlice";


const PaddleCheckout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paddleReady, setPaddleReady] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Prevent duplicate registration calls

  const transactionRef = searchParams.get("ref");
  const amount = searchParams.get("amount") || "15000";
  const planName = searchParams.get("plan") || "Professional";
  const priceId = searchParams.get("priceId");

  useEffect(() => {
    initializePaddle();
  }, []);

  const initializePaddle = async () => {
    try {
      const configResponse = await api.get("/paddle/config");
      const { clientToken, environment } = configResponse.data;

      if (!clientToken || clientToken === "your_client_token_here") {
        setError("Paddle not configured");
        setLoading(false);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.onload = () => {
        if (window.Paddle) {
          if (environment === "sandbox")
            window.Paddle.Environment.set("sandbox");
          window.Paddle.Initialize({
            token: clientToken,
            eventCallback: handlePaddleEvent,
          });
          setPaddleReady(true);
          setLoading(false);
        }
      };
      script.onerror = () => {
        setError("Failed to load Paddle");
        setLoading(false);
      };
      document.head.appendChild(script);
    } catch (err) {
      setError("Failed to initialize payment");
      setLoading(false);
    }
  };

  const handlePaddleEvent = (event) => {
    switch (event.name) {
      case "checkout.completed":
        handlePaymentComplete(event.data);
        break;
      case "checkout.error":
        setError("Payment failed");
        break;
    }
  };

  const handlePaymentComplete = async (data) => {
    // Prevent duplicate processing from multiple Paddle events
    if (isProcessing) {
      console.log("⚠️ Already processing registration, skipping duplicate call");
      return;
    }
    setIsProcessing(true);

    try {
      setLoading(true);
      toast.success("Payment successful!");
      const pendingData = sessionStorage.getItem("pendingRegistration");
      if (!pendingData) throw new Error("Registration data not found");

      const registrationData = JSON.parse(pendingData);
      const registerResponse = await api.post("/company/register", {
        companyName: registrationData.company.name,
        website: registrationData.company.website,
        location: registrationData.company.location,
        description: registrationData.company.description,
        industry: registrationData.company.industry,
        companySize: registrationData.company.size,
        adminName: registrationData.admin.fullname,
        adminEmail: registrationData.admin.email,
        adminPhone: registrationData.admin.phoneNumber,
        adminPassword: registrationData.admin.password,
        planId: registrationData.plan.id,
        billingCycle: "monthly",
        paymentToken: data?.transaction_id || `PADDLE_${Date.now()}`,
        recruitersToInvite: registrationData.recruiters || [],
      },
      );

      if (registerResponse.data.success) {
        sessionStorage.removeItem("pendingRegistration");
        sessionStorage.removeItem("pendingTransactionRef");

        // Handle both new and existing registrations (idempotent behavior)
        if (registerResponse.data.isExisting) {
          console.log("ℹ️ Company was already registered - continuing to dashboard");
        }

        // ========== SET USER AUTH FOR DASHBOARD ACCESS ==========
        // Backend returns user and token - use them!
        const { user: registeredUser, token } = registerResponse.data;

        if (registeredUser) {
          // Update Redux state with user data
          dispatch(setUser(registeredUser));
          console.log("✅ User set in Redux:", registeredUser.email);
        }

        if (token) {
          // Store token in localStorage for API calls
          localStorage.setItem("token", token);
          console.log("✅ Token stored in localStorage");
        }

        setRegistrationResult({
          ...registerResponse.data,
          company: registrationData.company,
          admin: registrationData.admin,
          plan: registrationData.plan,
        });
        setPaymentSuccess(true);
        toast.success(registerResponse.data.isExisting
          ? "Company already registered! Redirecting to dashboard..."
          : "Registration complete! Redirecting to dashboard...");

        // Auto-redirect to dashboard after a short delay
        setTimeout(() => {
          navigate("/company/admin/dashboard", { replace: true });
        }, 2000);
      } else {
        throw new Error(registerResponse.data.message || "Registration failed");
      }
    } catch (err) {
      setIsProcessing(false); // Reset on error to allow retry
      setError(err.response?.data?.message || err.message);
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const openPaddleCheckout = () => {
    if (!window.Paddle || !priceId) return toast.error("Paddle not ready");
    const pendingData = sessionStorage.getItem("pendingRegistration");
    const registrationData = pendingData ? JSON.parse(pendingData) : {};
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: registrationData.admin?.email || "" },
      customData: {
        transactionRef,
        companyName: registrationData.company?.name,
      },
    });
  };

  // Success State
  if (paymentSuccess && registrationResult) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
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
              Registration <span className="text-[#00FF94]">Complete</span>
            </h1>
            <p className="text-gray-600 font-mono text-sm mb-8">
              Company initialized. Invitations dispatched.
            </p>

            <div className="bg-[#111111] border border-white/10 rounded-sm p-6 text-left mb-8 relative">
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#00FF94]/30" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FFD700]" /> Account Details
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-[10px] text-gray-600 font-mono uppercase mb-1">
                    Company
                  </p>
                  <p className="text-white font-mono">
                    {registrationResult.company?.name}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-[10px] text-gray-600 font-mono uppercase mb-1">
                    Admin
                  </p>
                  <p className="text-white font-mono">
                    {registrationResult.admin?.email}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-[10px] text-gray-600 font-mono uppercase mb-1">
                    Plan
                  </p>
                  <p className="text-[#FFD700] font-mono">
                    {registrationResult.plan?.name}
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate("/company/admin/dashboard")}
              className="px-8 py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            >
              Access Dashboard →
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin relative z-10" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <Navbar />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-8 rounded-sm bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-4">
              Payment Error
            </h1>
            <p className="text-gray-600 font-mono text-xs mb-8">{error}</p>
            <Button
              variant="outline"
              onClick={() => navigate("/company/register")}
              className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm uppercase tracking-wider text-xs"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Checkout Ready State
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <Navbar />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <button
            onClick={() => navigate("/company/register")}
            className="flex items-center gap-2 text-gray-600 hover:text-white text-xs font-mono uppercase tracking-wider mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="bg-[#111111] border border-white/10 rounded-sm p-8 relative">
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/30" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/30" />

            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-sm bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-[#FFD700]" />
              </div>
              <h1 className="text-xl font-bold uppercase tracking-wider mb-2">
                Complete Payment
              </h1>
              <p className="text-gray-600 font-mono text-xs">
                Secure payment via Paddle
              </p>
            </div>

            <div className="text-center p-5 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-sm mb-6">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-1">
                Total Amount
              </p>
              <p className="text-4xl font-bold text-white font-mono">
                Rs {parseInt(amount).toLocaleString()}
              </p>
              <p className="text-[#FFD700] text-xs font-mono mt-1 uppercase">
                {planName} Plan - Monthly
              </p>
            </div>

            <Button
              onClick={openPaddleCheckout}
              disabled={!paddleReady}
              className="w-full py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            >
              {paddleReady ? "Proceed to Payment" : "Loading..."}
            </Button>

            <div className="flex items-center justify-center gap-2 text-gray-600 text-[10px] font-mono uppercase tracking-wider mt-4">
              <Shield className="w-3 h-3 text-[#00FF94]" />
              <span>Paddle Payment Protection</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaddleCheckout;
