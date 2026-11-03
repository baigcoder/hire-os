import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "../ui/button";
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-20 h-20 mx-auto mb-8 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Verifying Payment
            </h1>
            <p className="text-gray-600 text-xs">
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
      <div className="min-h-screen bg-background">
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
            <h1 className="text-2xl font-bold text-white mb-4">
              Payment Failed
            </h1>
            <p className="text-gray-600 text-xs mb-4">
              {error || "Verification unsuccessful. Please retry."}
            </p>
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-sm mb-8">
              <p className="text-red-400 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> Contact support if funds
                were deducted
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/company/register")}
                className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm text-xs"
              >
                Retry
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="bg-primary text-black hover:bg-[#FFE44D] rounded-sm text-xs font-bold"
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
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="w-20 h-20 mx-auto mb-8 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>

          <h1 className="text-3xl font-bold mb-4">
            Payment <span className="text-accent">Successful</span>
          </h1>
          <p className="text-gray-600 text-sm mb-8">
            Company registered. System initialized and ready.
          </p>

          <div className="bg-card border border-white/10 rounded-sm p-6 text-left mb-8 relative">

            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Account Details
            </h2>
            <div className="space-y-3">
              {registrationResult?.company && (
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-xs text-gray-600 uppercase mb-1">
                    Company
                  </p>
                  <p className="text-white">
                    {registrationResult.company.name}
                  </p>
                </div>
              )}
              {registrationResult?.admin && (
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-xs text-gray-600 uppercase mb-1">
                    Admin Email
                  </p>
                  <p className="text-white">
                    {registrationResult.admin.email}
                  </p>
                </div>
              )}
              {registrationResult?.plan && (
                <div className="p-3 bg-white/5 rounded-sm">
                  <p className="text-xs text-gray-600 uppercase mb-1">
                    Subscription
                  </p>
                  <p className="text-primary">
                    {registrationResult.plan.name} - Rs{" "}
                    {registrationResult.plan.price}/mo
                  </p>
                </div>
              )}
              <div className="p-3 bg-accent/5 border border-accent/20 rounded-sm flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs text-gray-600 uppercase">
                    Payment
                  </p>
                  <p className="text-accent font-bold text-sm uppercase">
                    Confirmed
                  </p>
                </div>
              </div>

              {registrationResult?.invitedRecruiters?.length > 0 && (
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-sm">
                  <p className="text-xs text-accent mb-2 flex items-center gap-2 uppercase">
                    <Mail className="w-4 h-4" /> Invitations Dispatched
                  </p>
                  <ul className="space-y-1">
                    {registrationResult.invitedRecruiters.map((r, idx) => (
                      <li key={idx} className="text-white text-xs">
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
            className="px-8 py-5 text-sm font-bold bg-primary text-black hover:bg-[#FFE44D] rounded-sm"
          >
            Access Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
