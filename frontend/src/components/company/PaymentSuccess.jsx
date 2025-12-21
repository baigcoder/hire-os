import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Mail,
  Building2,
  CreditCard,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { COMPANY_API_END_POINT, PAYMENT_API_END_POINT } from "@/utils/constant";
import { setUser } from "@/redux/authSlice";
import Navbar from "../shared/Navbar";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [registrationResult, setRegistrationResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyAndComplete();
  }, []);

  const verifyAndComplete = async () => {
    try {
      const transactionId =
        searchParams.get("txn") ||
        sessionStorage.getItem("pendingTransactionId");
      const tracker = searchParams.get("tracker");
      const token = searchParams.get("token");
      const sig = searchParams.get("sig");

      if (!transactionId) throw new Error("No transaction found");

      const verifyResponse = await axios.get(
        `${PAYMENT_API_END_POINT}/verify/${transactionId}`,
        { params: { tracker, token, sig } },
      );
      if (!verifyResponse.data.success || !verifyResponse.data.verified)
        throw new Error("Payment verification failed");

      const pendingData = sessionStorage.getItem("pendingRegistration");
      if (!pendingData) {
        setStatus("success");
        setRegistrationResult({
          message: "Payment verified! Account ready.",
          transactionId,
        });
        return;
      }

      const registrationData = JSON.parse(pendingData);
      const registerResponse = await axios.post(
        `${COMPANY_API_END_POINT}/register`,
        {
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
          paymentToken: transactionId,
          recruitersToInvite: registrationData.recruiters,
        },
      );

      if (registerResponse.data.success) {
        sessionStorage.removeItem("pendingRegistration");
        sessionStorage.removeItem("pendingTransactionId");

        // Store token and log user in
        if (registerResponse.data.token) {
          localStorage.setItem("token", registerResponse.data.token);
          // Set axios default header for subsequent requests
          axios.defaults.headers.common["Authorization"] =
            `Bearer ${registerResponse.data.token}`;
        }

        // Update Redux state with user data
        if (registerResponse.data.user) {
          dispatch(setUser(registerResponse.data.user));
        }

        setRegistrationResult({
          ...registerResponse.data,
          company: registrationData.company,
          admin: registrationData.admin,
          plan: registrationData.plan,
        });
        setStatus("success");
        toast.success("Registration complete! Welcome to your dashboard.");
      } else {
        throw new Error(registerResponse.data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setError(error.message || "Something went wrong");
      setStatus("failed");
    }
  };

  // Verifying State
  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <Navbar />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 mx-auto mb-8 rounded-sm bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-4">
              Verifying Payment
            </h1>
            <p className="text-gray-600 font-mono text-xs">
              Processing transaction and initializing account...
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Failed State
  if (status === "failed") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <Navbar />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 mx-auto mb-8 rounded-sm bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-4">
              Payment Failed
            </h1>
            <p className="text-gray-600 font-mono text-xs mb-4">
              {error || "Verification unsuccessful. Please retry."}
            </p>
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-sm mb-8">
              <p className="text-red-400 text-xs font-mono flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> Contact support if funds
                were deducted
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/company/register")}
                className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm uppercase tracking-wider text-xs"
              >
                Retry
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider text-xs font-bold"
              >
                Home
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
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

          <h1 className="text-3xl font-bold uppercase tracking-wider mb-4">
            Payment <span className="text-[#00FF94]">Successful</span>
          </h1>
          <p className="text-gray-600 font-mono text-sm mb-8">
            Company registered. System initialized and ready.
          </p>

          <div className="bg-[#111111] border border-white/10 rounded-sm p-6 text-left mb-8 relative">
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#00FF94]/30" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#00FF94]/30" />

            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FFD700]" /> Account Details
            </h2>
            <div className="space-y-3">
              {registrationResult?.company && (
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-[10px] text-gray-600 uppercase font-mono mb-1">
                    Company
                  </p>
                  <p className="text-white font-mono">
                    {registrationResult.company.name}
                  </p>
                </div>
              )}
              {registrationResult?.admin && (
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-[10px] text-gray-600 uppercase font-mono mb-1">
                    Admin Email
                  </p>
                  <p className="text-white font-mono">
                    {registrationResult.admin.email}
                  </p>
                </div>
              )}
              {registrationResult?.plan && (
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-[10px] text-gray-600 uppercase font-mono mb-1">
                    Subscription
                  </p>
                  <p className="text-[#FFD700] font-mono">
                    {registrationResult.plan.name} - Rs{" "}
                    {registrationResult.plan.price}/mo
                  </p>
                </div>
              )}
              <div className="p-3 bg-[#00FF94]/5 border border-[#00FF94]/20 rounded-sm flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-[#00FF94]" />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase font-mono">
                    Payment
                  </p>
                  <p className="text-[#00FF94] font-bold text-sm uppercase">
                    Confirmed
                  </p>
                </div>
              </div>

              {registrationResult?.invitedRecruiters?.length > 0 && (
                <div className="p-4 bg-[#00FF94]/5 border border-[#00FF94]/20 rounded-sm">
                  <p className="text-xs text-[#00FF94] mb-2 flex items-center gap-2 font-mono uppercase">
                    <Mail className="w-4 h-4" /> Invitations Dispatched
                  </p>
                  <ul className="space-y-1">
                    {registrationResult.invitedRecruiters.map((r, idx) => (
                      <li key={idx} className="text-white text-xs font-mono">
                        • {r.name} ({r.email})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={() => navigate("/company/admin/dashboard")}
            className="px-8 py-5 text-sm font-bold bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]"
          >
            Access Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
