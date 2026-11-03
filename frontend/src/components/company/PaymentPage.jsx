import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Lock,
  Terminal,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Navbar from "../shared/Navbar";

const PaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentData, setPaymentData] = useState(null);

  const status = searchParams.get("status");
  const transactionId = searchParams.get("txn");
  const amount = searchParams.get("amount");
  const plan = searchParams.get("plan");

  useEffect(() => {
    const pendingData = sessionStorage.getItem("pendingRegistration");
    if (pendingData) setPaymentData(JSON.parse(pendingData));
  }, []);

  // Payment Cancelled State
  if (status === "cancelled") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Payment Cancelled
            </h1>
            <p className="text-gray-600 text-sm mb-8">
              Transaction aborted. No charges applied to your account.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm text-xs"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Home
              </Button>
              <Button
                onClick={() => navigate("/company/register")}
                className="bg-primary text-black hover:bg-[#FFE44D] rounded-sm text-xs font-bold"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Default Payment Info State
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <div className="text-center mb-8">
            <Badge className="mb-4 px-4 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs">
              <CreditCard className="w-3 h-3 mr-2" /> Secure Payment
            </Badge>
            <h1 className="text-2xl font-bold mb-2">
              Complete Payment
            </h1>
            <p className="text-gray-600 text-xs">
              Redirecting to secure payment gateway
            </p>
          </div>

          <div className="bg-card border border-white/10 rounded-sm p-6 mb-6 relative">

            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" /> Order Summary
            </h2>
            <div className="space-y-3 text-sm">
              {transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Transaction ID
                  </span>
                  <span className="text-white text-xs">
                    {transactionId}
                  </span>
                </div>
              )}
              {plan && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="text-white uppercase">{plan}</span>
                </div>
              )}
              {amount && (
                <>
                  <div className="border-t border-white/10 my-3" />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-primary">
                      Rs {parseInt(amount).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600 mb-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>256-BIT SSL</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent" />
              <span>SECURE</span>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => navigate("/company/register")}
              className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm text-xs"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Registration
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentPage;
