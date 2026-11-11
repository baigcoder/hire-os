import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Crown,
  Check,
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Users,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Camera,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import api from "@/utils/api";
import { setUser } from "@/redux/authSlice";
import Navbar from "../shared/Navbar";

// ========== STEP INDICATOR ==========
const StepIndicator = ({ currentStep, steps }) => (
  <div className="flex items-center justify-center mb-10 px-4 overflow-x-auto">
    {steps.map((step, index) => (
      <React.Fragment key={index}>
        <div className="flex flex-col items-center flex-shrink-0">
          <div
            className={`w-10 h-10 md:w-12 md:h-12 rounded-sm flex items-center justify-center font-bold text-sm transition-all border ${
              index < currentStep
                ? "bg-accent/20 border-accent/50 text-accent"
                : index === currentStep
                  ? "bg-primary border-primary text-black"
                  : "bg-white/5 border-white/10 text-gray-600"
            }`}
          >
            {index < currentStep ? (
              <Check className="w-4 h-4" />
            ) : (
              String(index + 1).padStart(2, "0")
            )}
          </div>
          <span
            className={`mt-2 text-xs md:text-xs text-center max-w-[80px] ${index <= currentStep ? "text-white" : "text-gray-600"}`}
          >
            {step}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div
            className={`w-8 md:w-16 h-px mx-1 md:mx-2 flex-shrink-0 ${index < currentStep ? "bg-accent" : "bg-white/10"}`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ========== RECRUITER FORM ==========
const RecruiterForm = ({ recruiter, index, onChange, onRemove, canRemove }) => (
  <div className="p-4 bg-white/5 border border-white/10 rounded-sm relative">
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
        <Label className="text-xs text-gray-500 mb-1 block">
          Name *
        </Label>
        <Input
          placeholder="John Doe"
          value={recruiter.name}
          onChange={(e) => onChange(index, "name", e.target.value)}
          className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">
          Email *
        </Label>
        <Input
          type="email"
          placeholder="john@company.com"
          value={recruiter.email}
          onChange={(e) => onChange(index, "email", e.target.value)}
          className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm h-9"
        />
      </div>
    </div>
  </div>
);

// ========== MAIN COMPONENT ==========
const AdminSignupFlow = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const isLoggedIn = !!user;

  // Free platform: no plan or payment steps. Logged-in owners can invite their team here;
  // new owners create the account first and invite from the dashboard afterwards.
  const steps = isLoggedIn
    ? ["Company Details", "Add Team"]
    : ["Create Account", "Company Details"];

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [adminInfo, setAdminInfo] = useState({
    fullname: user?.fullname || "",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    password: "",
    confirmPassword: "",
  });

  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    location: "",
    description: "",
    industry: "",
    size: "",
    tagline: "",
    logo: null,
    logoPreview: null,
  });

  const [recruiters, setRecruiters] = useState([]);

  // Handle admin info changes
  const handleAdminChange = (field, value) =>
    setAdminInfo((prev) => ({ ...prev, [field]: value }));

  // Handle company info changes
  const handleCompanyChange = (field, value) =>
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo must be less than 2MB");
        return;
      }
      setCompanyInfo((prev) => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      }));
    }
  };

  // Handle recruiter changes
  const handleRecruiterChange = (index, field, value) => {
    setRecruiters((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addRecruiter = () => {
    if (recruiters.length >= 10) {
      toast.error("You can invite up to 10 recruiters here; add more later from the dashboard");
      return;
    }
    setRecruiters((prev) => [...prev, { name: "", email: "" }]);
  };

  const removeRecruiter = (index) =>
    setRecruiters((prev) => prev.filter((_, i) => i !== index));

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
        toast.error("Please fill all required fields");
        return false;
      }
      if (adminInfo.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return false;
      }
      if (adminInfo.password !== adminInfo.confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
      return true;
    }

    // Company info
    const companyStepIndex = isLoggedIn ? 0 : 1;
    if (stepIndex === companyStepIndex) {
      if (!companyInfo.name || !companyInfo.location) {
        toast.error("Company name and location are required");
        return false;
      }
      return true;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  // Create the company (free: no payment step)
  const handleRegister = async () => {
    if (!companyInfo.name || !companyInfo.location) {
      toast.error("Company name and location are required");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/company/register", {
        companyName: companyInfo.name,
        email: companyInfo.email || adminInfo.email,
        phone: companyInfo.phone,
        description: companyInfo.description,
        website: companyInfo.website,
        location: companyInfo.location,
        industry: companyInfo.industry,
        companySize: companyInfo.size,
        adminName: adminInfo.fullname,
        adminEmail: adminInfo.email,
        adminPassword: adminInfo.password,
        adminPhone: adminInfo.phone,
        recruitersToInvite: recruiters.filter((r) => r.name && r.email),
      });
      if (!res.data.success) throw new Error(res.data.message);
      if (res.data.user) dispatch(setUser(res.data.user));
      toast.success("Your company is ready. Welcome to HIRE.OS!");
      navigate("/company/admin/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <Badge className="mb-3 px-3 py-1 bg-primary/10 text-primary border-primary/20 text-xs">
              <Building2 className="w-3 h-3 mr-1.5" /> Company Registration
            </Badge>
            <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-tight mb-2">
              Start <span className="text-primary">Hiring</span> Today
            </h1>
            <p className="text-gray-600 text-xs md:text-sm">
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
                <div className="bg-card border border-white/10 rounded-sm p-6 md:p-8 relative">

                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Create Admin Account
                  </h2>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Full Name *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          placeholder="Your full name"
                          value={adminInfo.fullname}
                          onChange={(e) =>
                            handleAdminChange("fullname", e.target.value)
                          }
                          className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Email *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          type="email"
                          placeholder="admin@company.com"
                          value={adminInfo.email}
                          onChange={(e) =>
                            handleAdminChange("email", e.target.value)
                          }
                          className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Phone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          type="tel"
                          placeholder="+92 300 1234567"
                          value={adminInfo.phone}
                          onChange={(e) =>
                            handleAdminChange("phone", e.target.value)
                          }
                          className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Password *
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 8 characters"
                          value={adminInfo.password}
                          onChange={(e) =>
                            handleAdminChange("password", e.target.value)
                          }
                          className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Confirm Password *
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Re-enter password"
                          value={adminInfo.confirmPassword}
                          onChange={(e) =>
                            handleAdminChange("confirmPassword", e.target.value)
                          }
                          className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-4">
                    Already have an account?{" "}
                    <a href="/login" className="text-primary hover:underline">
                      Login here
                    </a>
                  </p>
                </div>
              )}

              {/* Step: Company Info */}
              {((isLoggedIn && currentStep === 0) ||
                (!isLoggedIn && currentStep === 1)) && (
                <div className="bg-card border border-white/10 rounded-sm p-6 md:p-8 relative">

                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Company Details
                  </h2>

                  {/* Logo Upload */}
                  <div className="mb-6 flex items-center gap-4">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center overflow-hidden">
                      {companyInfo.logoPreview ? (
                        <img
                          src={companyInfo.logoPreview}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
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
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-sm text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors">
                          <Upload className="w-3 h-3" />
                          Upload Logo
                        </span>
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Max 2MB, JPG/PNG
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Company Name *
                      </Label>
                      <Input
                        placeholder="Acme Corporation"
                        value={companyInfo.name}
                        onChange={(e) =>
                          handleCompanyChange("name", e.target.value)
                        }
                        className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Website
                      </Label>
                      <Input
                        placeholder="https://company.com"
                        value={companyInfo.website}
                        onChange={(e) =>
                          handleCompanyChange("website", e.target.value)
                        }
                        className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Location *
                      </Label>
                      <Input
                        placeholder="Lahore, Pakistan"
                        value={companyInfo.location}
                        onChange={(e) =>
                          handleCompanyChange("location", e.target.value)
                        }
                        className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Industry
                      </Label>
                      <select
                        value={companyInfo.industry}
                        onChange={(e) =>
                          handleCompanyChange("industry", e.target.value)
                        }
                        className="w-full bg-white/5 border border-white/10 text-white rounded-sm px-4 py-2.5 text-sm focus:border-primary/50 focus:outline-none"
                      >
                        <option value="" className="bg-[#111]">
                          Select industry
                        </option>
                        <option value="Technology" className="bg-[#111]">
                          Technology
                        </option>
                        <option value="Finance" className="bg-[#111]">
                          Finance
                        </option>
                        <option value="Healthcare" className="bg-[#111]">
                          Healthcare
                        </option>
                        <option value="Education" className="bg-[#111]">
                          Education
                        </option>
                        <option value="E-commerce" className="bg-[#111]">
                          E-commerce
                        </option>
                        <option value="Manufacturing" className="bg-[#111]">
                          Manufacturing
                        </option>
                        <option value="Consulting" className="bg-[#111]">
                          Consulting
                        </option>
                        <option value="Other" className="bg-[#111]">
                          Other
                        </option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Company Size
                      </Label>
                      <select
                        value={companyInfo.size}
                        onChange={(e) =>
                          handleCompanyChange("size", e.target.value)
                        }
                        className="w-full bg-white/5 border border-white/10 text-white rounded-sm px-4 py-2.5 text-sm focus:border-primary/50 focus:outline-none"
                      >
                        <option value="" className="bg-[#111]">
                          Select size
                        </option>
                        <option value="1-10" className="bg-[#111]">
                          1-10 employees
                        </option>
                        <option value="11-50" className="bg-[#111]">
                          11-50 employees
                        </option>
                        <option value="51-200" className="bg-[#111]">
                          51-200 employees
                        </option>
                        <option value="201-500" className="bg-[#111]">
                          201-500 employees
                        </option>
                        <option value="501-1000" className="bg-[#111]">
                          501-1000 employees
                        </option>
                        <option value="1000+" className="bg-[#111]">
                          1000+ employees
                        </option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1.5 block">
                        Tagline
                      </Label>
                      <Input
                        placeholder="Your company tagline..."
                        value={companyInfo.tagline}
                        onChange={(e) =>
                          handleCompanyChange("tagline", e.target.value)
                        }
                        className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <Label className="text-xs text-gray-500 mb-1.5 block">
                      Description
                    </Label>
                    <Textarea
                      placeholder="Tell candidates about your company culture, mission, and values..."
                      value={companyInfo.description}
                      onChange={(e) =>
                        handleCompanyChange("description", e.target.value)
                      }
                      className="bg-white/5 border-white/10 text-white text-sm placeholder-gray-600 focus:border-primary/50 rounded-sm min-h-[100px]"
                    />
                  </div>
                </div>
              )}

              {/* Step: Add Team/Recruiters */}
              {isLoggedIn && currentStep === 1 && (
                <div className="space-y-6">
                  {/* Admin Preview */}
                  <div className="bg-card border border-white/10 rounded-sm p-5 relative">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" /> CEO / Admin
                      (You)
                    </h3>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="p-3 bg-white/5 rounded-sm">
                        <p className="text-xs text-gray-600 uppercase mb-0.5">
                          Name
                        </p>
                        <p className="text-white text-sm truncate">
                          {adminInfo.fullname || user?.fullname || "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-sm">
                        <p className="text-xs text-gray-600 uppercase mb-0.5">
                          Email
                        </p>
                        <p className="text-white text-sm truncate">
                          {adminInfo.email || user?.email || "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-sm">
                        <p className="text-xs text-gray-600 uppercase mb-0.5">
                          Role
                        </p>
                        <p className="text-primary text-sm">
                          Company Admin
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recruiters */}
                  <div className="bg-card border border-white/10 rounded-sm p-5 relative">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Invite Team
                      Members
                      <Badge className="ml-auto bg-white/10 text-gray-400 text-xs">
                        {recruiters.length}/10
                      </Badge>
                    </h3>
                    <p className="text-gray-600 text-xs mb-4">
                      Add recruiters who&apos;ll help manage job postings and
                      candidates
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

                    <p className="text-xs text-gray-600 mt-3 text-center">
                      💡 You can skip this and invite team members later
                    </p>
                  </div>
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
              className="border-white/20 text-gray-400 hover:bg-white/5 rounded-sm text-xs"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={nextStep}
                className="bg-primary text-black hover:bg-[#FFE44D] rounded-sm text-xs font-bold"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => validateStep() && handleRegister()}
                disabled={loading}
                className="bg-primary text-black hover:bg-[#FFE44D] rounded-sm text-xs font-bold"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <>Create my company <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminSignupFlow;
