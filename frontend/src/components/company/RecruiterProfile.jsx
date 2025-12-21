import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "@/redux/authSlice";
import { toast } from "sonner";
import axios from "axios";
import Navbar from "../shared/Navbar";
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
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Crown,
  Shield,
  Camera,
  Save,
  Edit3,
  Loader2,
  CheckCircle,
  X,
  CreditCard,
  Users,
  Clock,
  Star,
} from "lucide-react";
import { USER_API_END_POINT, COMPANY_API_END_POINT } from "@/utils/constant";

const USER_API = USER_API_END_POINT;
const COMPANY_API = COMPANY_API_END_POINT;

const RecruiterProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profile, setProfile] = useState({
    fullname: "",
    email: "",
    phoneNumber: "",
    role: "",
    profilePhoto: "",
    companyId: null,
    company: null,
  });

  const [editedProfile, setEditedProfile] = useState({});
  const [companyInfo, setCompanyInfo] = useState(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      navigate("/login");
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Load user profile
      const userResponse = await axios.get(`${USER_API}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (userResponse.data.success) {
        const userData = userResponse.data.user;
        setProfile({
          fullname: userData.fullname || "",
          email: userData.email || "",
          phoneNumber: userData.phoneNumber || "",
          role: userData.role || "",
          profilePhoto:
            userData.profile?.profilePhoto || userData.profilePhoto || "",
          companyId: userData.companyId,
        });
        setEditedProfile({
          fullname: userData.fullname || "",
          phoneNumber: userData.phoneNumber || "",
        });

        // Load company info if user has companyId
        if (userData.companyId) {
          try {
            const companyResponse = await axios.get(
              `${COMPANY_API}/get/${userData.companyId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              },
            );
            if (companyResponse.data.success) {
              setCompanyInfo(companyResponse.data.company);
            }
          } catch (err) {
            console.log("Could not load company info:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      setUploadingPhoto(true);

      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const response = await axios.post(`${USER_API}/profile/photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      if (response.data.success) {
        const photoUrl = response.data.profilePhoto;
        setProfile((prev) => ({ ...prev, profilePhoto: photoUrl }));
        dispatch(
          setUser({
            ...user,
            profile: {
              ...(user?.profile || {}),
              profilePhoto: photoUrl,
            },
          }),
        );
        toast.success("Profile photo updated!");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const updateResponse = await axios.put(
        `${USER_API}/profile/update`,
        editedProfile,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );

      if (updateResponse.data.success) {
        setProfile((prev) => ({ ...prev, ...editedProfile }));
        dispatch(setUser({ ...user, ...editedProfile }));
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "company_admin":
        return "Company Admin / CEO";
      case "recruiter":
        return "Recruiter";
      case "student":
        return "Job Seeker";
      default:
        return role;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "company_admin":
        return Crown;
      case "recruiter":
        return Briefcase;
      default:
        return User;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-mono text-xs uppercase tracking-wider">
            Loading Profile...
          </p>
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(profile.role);

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <Navbar />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          {/* Industrial Header */}
          <div className="relative mb-8 rounded-md overflow-hidden border border-white/10">
            {/* Industrial Banner */}
            <div className="h-28 bg-gradient-to-r from-[#FFD700]/20 via-[#FFD700]/10 to-transparent relative overflow-hidden">
              <div className="absolute inset-0 bg-grid opacity-50" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#FFD700]/40" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FFD700]/40" />
            </div>

            {/* Profile Quick Info */}
            <div className="bg-[#111111] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4 -mt-10">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-sm overflow-hidden border-2 border-[#FFD700]/50 bg-[#0A0A0A] shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                    {profile.profilePhoto ? (
                      <img
                        src={profile.profilePhoto}
                        alt={profile.fullname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#FFD700]">
                        <span className="text-xl font-bold text-black">
                          {profile.fullname
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) || "U"}
                        </span>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                    {uploadingPhoto ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </label>
                </div>
                <div className="mt-6">
                  <h1 className="text-xl font-bold text-white uppercase tracking-tight">
                    {profile.fullname}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#FFD700]/10 text-[#FFD700] text-xs font-bold uppercase tracking-wider border border-[#FFD700]/30">
                      <RoleIcon className="w-3 h-3" />
                      {getRoleDisplayName(profile.role)}
                    </span>
                    {companyInfo && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white/5 text-gray-400 text-xs border border-white/10">
                        <Building2 className="w-3 h-3 text-[#FFD700]" />
                        {companyInfo.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              <div className="mt-6">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold rounded-sm text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="border-white/10 hover:bg-white/5 text-gray-400 rounded-sm text-xs uppercase tracking-wider"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-[#00FF94] text-black hover:bg-[#00FF94]/80 font-bold rounded-sm text-xs uppercase tracking-wider"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Profile Card */}
            <Card className="lg:col-span-1 bg-[#111111] border-white/10 rounded-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  {/* Profile Photo */}
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-sm overflow-hidden border-2 border-[#FFD700]/30 bg-[#0A0A0A]">
                      {profile.profilePhoto ? (
                        <img
                          src={profile.profilePhoto}
                          alt={profile.fullname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                      {uploadingPhoto ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </label>
                  </div>

                  <h2 className="text-lg font-bold text-white mt-4 uppercase tracking-tight">
                    {profile.fullname}
                  </h2>
                  <p className="text-gray-500 text-xs font-mono">
                    {profile.email}
                  </p>

                  {/* Role Badge */}
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30">
                    <RoleIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {getRoleDisplayName(profile.role)}
                    </span>
                  </div>

                  {/* Company */}
                  {companyInfo && (
                    <div className="mt-4 p-3 bg-white/5 rounded-sm w-full border border-white/5">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building2 className="w-3.5 h-3.5 text-[#FFD700]" />
                        <span className="text-xs font-mono">
                          {companyInfo.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card className="lg:col-span-2 bg-[#111111] border-white/10 rounded-md">
              <CardHeader>
                <CardTitle className="text-white text-sm uppercase tracking-wider">
                  Account Details
                </CardTitle>
                <CardDescription className="text-gray-500 text-xs font-mono">
                  Personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.fullname}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({
                          ...prev,
                          fullname: e.target.value,
                        }))
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white rounded-sm font-mono"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                      <User className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-white text-sm font-mono">
                        {profile.fullname}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Email Address
                  </Label>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                    <Mail className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-white text-sm font-mono">
                      {profile.email}
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-[#00FF94] ml-auto" />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.phoneNumber}
                      onChange={(e) =>
                        setEditedProfile((prev) => ({
                          ...prev,
                          phoneNumber: e.target.value,
                        }))
                      }
                      className="bg-[#0A0A0A] border-white/10 text-white rounded-sm font-mono"
                      placeholder="+92 300 1234567"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                      <Phone className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-white text-sm font-mono">
                        {profile.phoneNumber || "Not set"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Role
                  </Label>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                    <RoleIcon className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-white text-sm font-mono">
                      {getRoleDisplayName(profile.role)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card (for company_admin) */}
            {profile.role === "company_admin" && companyInfo?.subscription && (
              <Card className="lg:col-span-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Subscription Details
                  </CardTitle>
                  <CardDescription>
                    Your company's subscription plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Plan */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Star className="w-4 h-4" />
                        <span className="text-sm">Current Plan</span>
                      </div>
                      <p className="text-xl font-bold text-yellow-500 capitalize">
                        {companyInfo.subscription.plan || "Free"}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Status</span>
                      </div>
                      <p
                        className={`text-xl font-bold ${companyInfo.subscription.status === "active" ? "text-green-500" : "text-red-500"}`}
                      >
                        {companyInfo.subscription.status || "Inactive"}
                      </p>
                    </div>

                    {/* Expires */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Valid Until</span>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {companyInfo.subscription.endDate
                          ? new Date(
                              companyInfo.subscription.endDate,
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>

                    {/* Recruiter Slots */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Recruiter Slots</span>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {companyInfo.recruiterCount || 0} /{" "}
                        {companyInfo.subscription.maxRecruiters || "∞"}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  {companyInfo.subscription.features &&
                    companyInfo.subscription.features.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold mb-3">
                          Plan Features
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {companyInfo.subscription.features.map(
                            (feature, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-gray-300"
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm">{feature}</span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Company Info Card (for recruiters) */}
            {profile.role === "recruiter" && companyInfo && (
              <Card className="lg:col-span-3 bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-yellow-500" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    You are a recruiter at this company
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <p className="text-gray-400 text-sm mb-1">Company Name</p>
                      <p className="text-white font-semibold">
                        {companyInfo.name}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <p className="text-gray-400 text-sm mb-1">Industry</p>
                      <p className="text-white font-semibold">
                        {companyInfo.industry || "Not specified"}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <p className="text-gray-400 text-sm mb-1">Location</p>
                      <p className="text-white font-semibold">
                        {companyInfo.location || "Not specified"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RecruiterProfile;
