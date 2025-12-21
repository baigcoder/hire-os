/**
 * useSubscription - Hook for managing subscription state and feature access
 * Hire.iOS Subscription System
 */

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { setUser } from "@/redux/authSlice";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Subscription plan features mapping
const PLAN_FEATURES = {
  basic: {
    maxJobPostings: 5,
    maxRecruiters: 2,
    aiInterviews: false,
    advancedAnalytics: false,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
  },
  professional: {
    maxJobPostings: 25,
    maxRecruiters: 10,
    aiInterviews: true,
    advancedAnalytics: true,
    apiAccess: false,
    prioritySupport: true,
    customBranding: false,
  },
  enterprise: {
    maxJobPostings: -1, // Unlimited
    maxRecruiters: -1,
    aiInterviews: true,
    advancedAnalytics: true,
    apiAccess: true,
    prioritySupport: true,
    customBranding: true,
  },
};

export const useSubscription = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch subscription status
  const fetchSubscription = useCallback(async () => {
    if (!user || user.role === "student") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use /current endpoint which works for both company_admin and recruiters
      const res = await axios.get(`${API_BASE}/subscription/current`, {
        withCredentials: true,
      });

      if (res.data.success) {
        // Merge subscription data with features and usage from response
        setSubscription({
          ...res.data.subscription,
          features: res.data.features,
          usage: res.data.usage,
          company: res.data.company,
        });
      }
    } catch (err) {
      // Handle expired subscription
      if (err.response?.data?.expired) {
        handleExpiredSubscription(err.response.data);
      } else {
        setError(err.response?.data?.message || "Failed to fetch subscription");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Handle expired subscription - auto-logout
  const handleExpiredSubscription = useCallback(
    (data) => {
      toast.error(data.message || "Your subscription has expired", {
        duration: 5000,
        description: "Please contact your administrator to renew.",
      });

      // Clear auth state after a delay
      setTimeout(() => {
        dispatch(setUser(null));
        localStorage.removeItem("user");
        navigate("/login?reason=subscription_expired");
      }, 2000);
    },
    [dispatch, navigate],
  );

  // Check if a specific feature is available
  const hasFeature = useCallback(
    (featureName) => {
      if (!subscription) return false;

      const plan = subscription.plan || "basic";
      const planFeatures = PLAN_FEATURES[plan];

      if (!planFeatures) return false;
      return (
        planFeatures[featureName] === true || planFeatures[featureName] === -1
      );
    },
    [subscription],
  );

  // Check if user has reached a limit
  const isLimitReached = useCallback(
    (limitType) => {
      if (!subscription) return true;

      const { features, usage } = subscription;
      if (!features || !usage) return false;

      switch (limitType) {
        case "jobs":
          return (
            features.maxJobPostings !== -1 &&
            usage.activeJobs >= features.maxJobPostings
          );
        case "recruiters":
          return (
            features.maxRecruiters !== -1 &&
            usage.activeRecruiters >= features.maxRecruiters
          );
        default:
          return false;
      }
    },
    [subscription],
  );

  // Get usage percentage for a limit
  const getUsagePercent = useCallback(
    (limitType) => {
      if (!subscription?.features || !subscription?.usage) return 0;

      const { features, usage } = subscription;

      switch (limitType) {
        case "jobs":
          if (features.maxJobPostings === -1) return 0; // Unlimited
          return Math.round((usage.activeJobs / features.maxJobPostings) * 100);
        case "recruiters":
          if (features.maxRecruiters === -1) return 0;
          return Math.round(
            (usage.activeRecruiters / features.maxRecruiters) * 100,
          );
        default:
          return 0;
      }
    },
    [subscription],
  );

  // Get days until expiry
  const getDaysRemaining = useCallback(() => {
    if (!subscription?.endDate) return null;

    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }, [subscription]);

  // Check if subscription is expiring soon (within 7 days)
  const isExpiringSoon = useCallback(() => {
    const days = getDaysRemaining();
    return days !== null && days <= 7 && days > 0;
  }, [getDaysRemaining]);

  // Check if subscription is expired
  const isExpired = useCallback(() => {
    if (!subscription) return false;
    return subscription.status === "expired" || getDaysRemaining() <= 0;
  }, [subscription, getDaysRemaining]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    hasFeature,
    isLimitReached,
    getUsagePercent,
    getDaysRemaining,
    isExpiringSoon,
    isExpired,
    refresh: fetchSubscription,
    planFeatures: PLAN_FEATURES,
  };
};

/**
 * Setup Axios interceptor for handling subscription expiry
 */
export const setupSubscriptionInterceptor = (store, navigate) => {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const { response } = error;

      // Handle subscription expired (403 with expired flag)
      if (response?.status === 403 && response?.data?.expired) {
        const message = response.data.message || "Subscription expired";

        toast.error(message, {
          duration: 5000,
          description: "You will be logged out shortly.",
        });

        // Auto-logout after delay
        setTimeout(() => {
          store.dispatch(setUser(null));
          localStorage.removeItem("user");

          if (response.data.trialExpired) {
            navigate("/login?reason=trial_expired");
          } else if (response.data.companyExpired) {
            navigate("/login?reason=company_subscription_expired");
          } else {
            navigate("/login?reason=subscription_expired");
          }
        }, 2000);
      }

      return Promise.reject(error);
    },
  );
};

export default useSubscription;
