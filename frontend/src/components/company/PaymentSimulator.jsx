import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Lock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { toast } from "sonner";
import axios from "axios";
import { COMPANY_API_END_POINT } from "@/utils/constant";
import { setUser } from "@/redux/authSlice";
import Navbar from "../shared/Navbar";

const PaymentSimulator = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [error, setError] = useState(null);

  // Card form state
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });

  // Get transaction info from URL or session
  const transactionId =
    searchParams.get("txn") || sessionStorage.getItem("pendingTransactionId");
  const amount = searchParams.get("amount") || "15000";
  const planName = searchParams.get("plan") || "Professional";

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  // Format expiry date
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = (field, value) => {
    if (field === "number") {
      value = formatCardNumber(value);
      if (value.replace(/\s/g, "").length > 16) return;
    }
    if (field === "expiry") {
      value = formatExpiry(value.replace("/", ""));
      if (value.length > 5) return;
    }
    if (field === "cvv") {
      value = value.replace(/[^0-9]/g, "");
      if (value.length > 4) return;
    }
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  const validateCard = () => {
    const cardNumber = cardData.number.replace(/\s/g, "");

    if (cardNumber.length < 15) {
      toast.error("Please enter a valid card number");
      return false;
    }
    if (!cardData.name.trim()) {
      toast.error("Please enter cardholder name");
      return false;
    }
    if (cardData.expiry.length < 5) {
      toast.error("Please enter valid expiry date");
      return false;
    }
    if (cardData.cvv.length < 3) {
      toast.error("Please enter valid CVV");
      return false;
    }
    return true;
  };

  const processPayment = async () => {
    if (!validateCard()) return;

    setLoading(true);
    setError(null);

    try {
      // Simulate payment processing
      toast.info("Processing payment...", { duration: 2000 });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check for test card failure
      const cardNumber = cardData.number.replace(/\s/g, "");
      if (cardNumber === "4000000000000000") {
        throw new Error("Card declined. Please try a different card.");
      }

      // Get stored registration data
      const pendingData = sessionStorage.getItem("pendingRegistration");
      if (!pendingData) {
        throw new Error("Registration data not found. Please start again.");
      }

      const registrationData = JSON.parse(pendingData);

      // Complete registration with payment
      const registerResponse = await axios.post(
        `${COMPANY_API_END_POINT}/register`,
        {
          // Company details
          companyName: registrationData.company.name,
          website: registrationData.company.website,
          location: registrationData.company.location,
          description: registrationData.company.description,
          industry: registrationData.company.industry,
          companySize: registrationData.company.size,

          // Admin details
          adminName: registrationData.admin.fullname,
          adminEmail: registrationData.admin.email,
          adminPhone: registrationData.admin.phoneNumber,
          adminPassword: registrationData.admin.password,

          // Subscription
          planId: registrationData.plan.id,
          billingCycle: "monthly",
          paymentToken: transactionId || `PAY_${Date.now()}`,

          // Recruiters to invite
          recruitersToInvite: registrationData.recruiters || [],
        },
      );

      if (registerResponse.data.success) {
        // Clear stored data
        sessionStorage.removeItem("pendingRegistration");
        sessionStorage.removeItem("pendingTransactionId");

        // Store token and log user in
        if (registerResponse.data.token) {
          localStorage.setItem("token", registerResponse.data.token);
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
        setPaymentSuccess(true);
        toast.success("Payment successful! Company registered.");
      } else {
        throw new Error(registerResponse.data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.response?.data?.message || err.message || "Payment failed");
      toast.error(
        err.response?.data?.message || err.message || "Payment failed",
      );
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (paymentSuccess && registrationResult) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-14 h-14 text-green-400" />
            </div>

            <h1 className="text-4xl font-bold text-white mb-4">
              Payment Successful! 🎉
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Your company has been registered and emails have been sent.
            </p>

            <Card className="bg-zinc-900/50 border-zinc-800 text-left mb-8">
              <CardHeader>
                <CardTitle className="text-white">Account Details</CardTitle>
                <CardDescription>
                  Save these credentials securely
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="text-white font-semibold">
                    {registrationResult.company?.name}
                  </p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <p className="text-sm text-gray-500">Admin Email</p>
                  <p className="text-white font-semibold">
                    {registrationResult.admin?.email}
                  </p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <p className="text-sm text-gray-500">Subscription</p>
                  <p className="text-yellow-500 font-semibold">
                    {registrationResult.plan?.name} - Rs{" "}
                    {registrationResult.plan?.price?.toLocaleString()}/month
                  </p>
                </div>

                {registrationResult.invitedRecruiters?.length > 0 && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-green-400 text-sm mb-2">
                      📧 Invitation emails sent to:
                    </p>
                    <ul className="space-y-1">
                      {registrationResult.invitedRecruiters.map((r, idx) => (
                        <li key={idx} className="text-white text-sm">
                          • {r.name} ({r.email})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={() => navigate("/company/admin/dashboard")}
              className="px-8 py-6 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold"
            >
              Go to Dashboard →
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          {/* Back Button */}
          <button
            onClick={() => navigate("/company/register")}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Registration
          </button>

          {/* Payment Card */}
          <Card className="bg-zinc-900/80 border-zinc-800 backdrop-blur-xl">
            <CardHeader className="text-center border-b border-zinc-800 pb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl text-white">
                Secure Payment
              </CardTitle>
              <CardDescription>
                Complete your subscription payment
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Amount Display */}
              <div className="text-center p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
                <p className="text-gray-400 text-sm">Total Amount</p>
                <p className="text-4xl font-bold text-white">
                  Rs {parseInt(amount).toLocaleString()}
                </p>
                <p className="text-yellow-500 text-sm mt-1">
                  {planName} Plan - Monthly
                </p>
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                  >
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Card Form */}
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Card Number</Label>
                  <div className="relative mt-2">
                    <Input
                      placeholder="4242 4242 4242 4242"
                      value={cardData.number}
                      onChange={(e) =>
                        handleInputChange("number", e.target.value)
                      }
                      className="bg-zinc-800 border-zinc-700 text-white pl-12 h-12 text-lg tracking-wider"
                    />
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Cardholder Name</Label>
                  <Input
                    placeholder="JOHN DOE"
                    value={cardData.name}
                    onChange={(e) =>
                      handleInputChange("name", e.target.value.toUpperCase())
                    }
                    className="mt-2 bg-zinc-800 border-zinc-700 text-white h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Expiry Date</Label>
                    <Input
                      placeholder="MM/YY"
                      value={cardData.expiry}
                      onChange={(e) =>
                        handleInputChange("expiry", e.target.value)
                      }
                      className="mt-2 bg-zinc-800 border-zinc-700 text-white h-12 text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">CVV</Label>
                    <Input
                      type="password"
                      placeholder="•••"
                      value={cardData.cvv}
                      onChange={(e) => handleInputChange("cvv", e.target.value)}
                      className="mt-2 bg-zinc-800 border-zinc-700 text-white h-12 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Test Cards Info */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-400 text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Test Mode - Use these cards:
                </p>
                <ul className="text-gray-400 text-xs space-y-1">
                  <li>
                    ✅ Success:{" "}
                    <code className="text-blue-300">4242 4242 4242 4242</code>
                  </li>
                  <li>
                    ❌ Decline:{" "}
                    <code className="text-blue-300">4000 0000 0000 0000</code>
                  </li>
                  <li>Any expiry (future) • Any CVV (3 digits)</li>
                </ul>
              </div>

              {/* Pay Button */}
              <Button
                onClick={processPayment}
                disabled={loading}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Pay Rs {parseInt(amount).toLocaleString()}
                  </>
                )}
              </Button>

              {/* Security Footer */}
              <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                <Shield className="w-4 h-4" />
                <span>Secured with 256-bit SSL encryption</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSimulator;
