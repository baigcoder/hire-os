import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api";
import axios from "axios";
import { toast } from "sonner";
import { setUser } from "@/redux/authSlice";
import Navbar from "../shared/Navbar";
import Footer from "../shared/Footer";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
    Settings,
    User,
    Bell,
    Shield,
    Palette,
    Lock,
    Mail,
    Eye,
    EyeOff,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Moon,
    Sun,
    Trash2,
    LogOut,
    Building2,
    Briefcase,
    Globe,
    MapPin,
    RefreshCw,
} from "lucide-react";
import {
    USER_API_END_POINT,
    COMPANY_API_END_POINT,
} from "@/utils/constant";

const CompanyAdminSettingsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((store) => store.auth);

    const [activeTab, setActiveTab] = useState("company");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [updatingProfile, setUpdatingProfile] = useState(false);

    // Company Profile State
    const [companyProfile, setCompanyProfile] = useState({
        name: "",
        description: "",
        website: "",
        location: "",
        logo: "",
    });

    // Settings state
    const [settings, setSettings] = useState({
        // Account
        email: user?.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        // Notifications
        emailNotifications: true,
        pushNotifications: true,
        applicationUpdates: true,
        // Appearance
        theme: "dark",
        language: "en",
    });

    const accentColor = "#00BFFF"; // Company Admin Blue

    const tabs = [
        { id: "company", label: "Company Profile", icon: Building2 },
        { id: "account", label: "Account", icon: User },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "security", label: "Security", icon: Lock },
    ];

    useEffect(() => {
        fetchCompanyData();
    }, []);

    const fetchCompanyData = async () => {
        try {
            const response = await axios.get(`${COMPANY_API_END_POINT}/dashboard`, {
                withCredentials: true,
            });
            if (response.data.success) {
                const company = response.data.company;
                setCompanyProfile({
                    name: company.name || "",
                    description: company.description || "",
                    website: company.website || "",
                    location: company.location || "",
                    logo: company.logo || "",
                });
            }
        } catch (error) {
            console.error("Failed to fetch company data:", error);
            toast.error("Failed to load company profile");
        }
    };

    const updateCompanyProfile = async () => {
        setUpdatingProfile(true);
        try {
            const response = await axios.put(
                `${COMPANY_API_END_POINT}/profile`,
                companyProfile,
                { withCredentials: true },
            );
            if (response.data.success) {
                toast.success("Company profile updated successfully");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleSettingChange = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handlePasswordChange = async () => {
        if (settings.newPassword !== settings.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (settings.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        try {
            setLoading(true);
            const res = await api.post(
                `${USER_API_END_POINT}/change-password`,
                {
                    currentPassword: settings.currentPassword,
                    newPassword: settings.newPassword,
                },
            );

            if (res.data.success) {
                toast.success("Password updated successfully");
                setSettings((prev) => ({
                    ...prev,
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.get(`${USER_API_END_POINT}/logout`);
            dispatch(setUser(null));
            navigate("/login");
            toast.success("Logged out successfully");
        } catch (error) {
            toast.error("Logout failed");
        }
    };

    const SettingRow = ({ icon: Icon, title, description, children }) => (
        <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center">
                    <Icon size={18} className="text-gray-400" />
                </div>
                <div>
                    <p className="text-sm text-white font-medium">{title}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
            </div>
            <div>{children}</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] selection:bg-[#00BFFF]/30">
            {/* Industrial Grid Background */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="fixed inset-0 pointer-events-none">
                <div
                    className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[200px]"
                    style={{ backgroundColor: `${accentColor}10` }}
                />
            </div>

            <Navbar />

            <main className="max-w-5xl mx-auto px-4 pt-28 pb-12 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-sm flex items-center justify-center border"
                            style={{
                                backgroundColor: `${accentColor}10`,
                                borderColor: `${accentColor}30`,
                            }}
                        >
                            <Settings size={24} style={{ color: accentColor }} />
                        </div>
                        Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-mono">
                        Manage your company profile and account settings
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Sidebar Tabs */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <div className="bg-[#111111] border border-white/10 rounded-md p-2 space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-all ${activeTab === tab.id
                                            ? "bg-white/10 text-white"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }`}
                                    style={
                                        activeTab === tab.id
                                            ? { borderLeft: `2px solid ${accentColor}` }
                                            : {}
                                    }
                                >
                                    <tab.icon
                                        size={16}
                                        style={activeTab === tab.id ? { color: accentColor } : {}}
                                    />
                                    {tab.label}
                                </button>
                            ))}

                            <div className="pt-4 mt-4 border-t border-white/5">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Content Area */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-3"
                    >
                        <div className="bg-[#111111] border border-white/10 rounded-md p-6 relative overflow-hidden">
                            {/* Corner Accent */}
                            <div
                                className="absolute top-0 right-0 w-8 h-8 border-t border-r"
                                style={{ borderColor: `${accentColor}30` }}
                            />

                            <AnimatePresence mode="wait">
                                {/* Company Profile Tab */}
                                {activeTab === "company" && (
                                    <motion.div
                                        key="company"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <h2
                                            className="text-sm font-bold uppercase tracking-wider mb-6"
                                            style={{ color: accentColor }}
                                        >
                                            Company Profile
                                        </h2>

                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="c_name" className="text-gray-400 text-xs uppercase tracking-wider font-mono">
                                                    Company Name
                                                </Label>
                                                <Input
                                                    id="c_name"
                                                    value={companyProfile.name}
                                                    onChange={(e) =>
                                                        setCompanyProfile({ ...companyProfile, name: e.target.value })
                                                    }
                                                    className="bg-[#0A0A0A] border-white/10 text-white rounded-sm font-mono"
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="c_desc" className="text-gray-400 text-xs uppercase tracking-wider font-mono">
                                                    Description
                                                </Label>
                                                <Textarea
                                                    id="c_desc"
                                                    value={companyProfile.description}
                                                    onChange={(e) =>
                                                        setCompanyProfile({
                                                            ...companyProfile,
                                                            description: e.target.value,
                                                        })
                                                    }
                                                    className="bg-[#0A0A0A] border-white/10 text-white rounded-sm font-mono min-h-[120px]"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="c_web" className="text-gray-400 text-xs uppercase tracking-wider font-mono">
                                                        Website
                                                    </Label>
                                                    <div className="relative">
                                                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                                        <Input
                                                            id="c_web"
                                                            value={companyProfile.website}
                                                            onChange={(e) =>
                                                                setCompanyProfile({
                                                                    ...companyProfile,
                                                                    website: e.target.value,
                                                                })
                                                            }
                                                            className="bg-[#0A0A0A] border-white/10 text-white rounded-sm font-mono pl-10"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="c_loc" className="text-gray-400 text-xs uppercase tracking-wider font-mono">
                                                        Location
                                                    </Label>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                                        <Input
                                                            id="c_loc"
                                                            value={companyProfile.location}
                                                            onChange={(e) =>
                                                                setCompanyProfile({
                                                                    ...companyProfile,
                                                                    location: e.target.value,
                                                                })
                                                            }
                                                            className="bg-[#0A0A0A] border-white/10 text-white rounded-sm font-mono pl-10"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5 flex justify-end">
                                            <Button
                                                onClick={updateCompanyProfile}
                                                disabled={updatingProfile}
                                                className="rounded-sm font-bold text-xs uppercase tracking-wider"
                                                style={{ backgroundColor: accentColor, color: "#000" }}
                                            >
                                                {updatingProfile ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    "Save Changes"
                                                )}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Account Tab */}
                                {activeTab === "account" && (
                                    <motion.div
                                        key="account"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <div>
                                            <h2
                                                className="text-sm font-bold uppercase tracking-wider mb-4"
                                                style={{ color: accentColor }}
                                            >
                                                Account Information
                                            </h2>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                                                        Email Address
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="email"
                                                            value={settings.email}
                                                            disabled
                                                            className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-gray-400 font-mono text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                                                Change Password
                                            </h3>
                                            <div className="space-y-3">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Current Password"
                                                    value={settings.currentPassword}
                                                    onChange={(e) =>
                                                        handleSettingChange(
                                                            "currentPassword",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                                                />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="New Password"
                                                    value={settings.newPassword}
                                                    onChange={(e) =>
                                                        handleSettingChange("newPassword", e.target.value)
                                                    }
                                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                                                />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Confirm New Password"
                                                    value={settings.confirmPassword}
                                                    onChange={(e) =>
                                                        handleSettingChange(
                                                            "confirmPassword",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-300"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff size={14} />
                                                        ) : (
                                                            <Eye size={14} />
                                                        )}
                                                        {showPassword ? "Hide" : "Show"} password
                                                    </button>
                                                    <Button
                                                        onClick={handlePasswordChange}
                                                        disabled={loading || !settings.newPassword}
                                                        className="rounded-sm font-bold text-xs uppercase tracking-wider"
                                                        style={{
                                                            backgroundColor: accentColor,
                                                            color: "#000",
                                                        }}
                                                    >
                                                        {loading && (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        )}
                                                        Update Password
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Notifications Tab */}
                                {activeTab === "notifications" && (
                                    <motion.div
                                        key="notifications"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2
                                            className="text-sm font-bold uppercase tracking-wider mb-6"
                                            style={{ color: accentColor }}
                                        >
                                            Notification Preferences
                                        </h2>

                                        <SettingRow
                                            icon={Mail}
                                            title="Email Notifications"
                                            description="Receive updates via email"
                                        >
                                            <Switch
                                                checked={settings.emailNotifications}
                                                onCheckedChange={(v) =>
                                                    handleSettingChange("emailNotifications", v)
                                                }
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Bell}
                                            title="Push Notifications"
                                            description="Get notifications in browser"
                                        >
                                            <Switch
                                                checked={settings.pushNotifications}
                                                onCheckedChange={(v) =>
                                                    handleSettingChange("pushNotifications", v)
                                                }
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Briefcase}
                                            title="Application Updates"
                                            description="Get notified about application status changes"
                                        >
                                            <Switch
                                                checked={settings.applicationUpdates}
                                                onCheckedChange={(v) =>
                                                    handleSettingChange("applicationUpdates", v)
                                                }
                                            />
                                        </SettingRow>
                                    </motion.div>
                                )}

                                {/* Appearance Tab */}
                                {activeTab === "appearance" && (
                                    <motion.div
                                        key="appearance"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2
                                            className="text-sm font-bold uppercase tracking-wider mb-6"
                                            style={{ color: accentColor }}
                                        >
                                            Appearance Settings
                                        </h2>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-3 block">
                                                    Theme
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {["dark", "light"].map((theme) => (
                                                        <button
                                                            key={theme}
                                                            onClick={() =>
                                                                handleSettingChange("theme", theme)
                                                            }
                                                            className={`p-4 rounded-sm border transition-all flex items-center gap-3 ${settings.theme === theme
                                                                    ? "bg-white/10 border-white/30"
                                                                    : "bg-[#0A0A0A] border-white/10 hover:border-white/20"
                                                                }`}
                                                        >
                                                            {theme === "dark" ? (
                                                                <Moon
                                                                    size={20}
                                                                    className={
                                                                        settings.theme === theme
                                                                            ? "text-white"
                                                                            : "text-gray-500"
                                                                    }
                                                                />
                                                            ) : (
                                                                <Sun
                                                                    size={20}
                                                                    className={
                                                                        settings.theme === theme
                                                                            ? "text-white"
                                                                            : "text-gray-500"
                                                                    }
                                                                />
                                                            )}
                                                            <span
                                                                className={`text-sm capitalize ${settings.theme === theme ? "text-white" : "text-gray-500"
                                                                    }`}
                                                            >
                                                                {theme} Mode
                                                            </span>
                                                            {settings.theme === theme && (
                                                                <CheckCircle
                                                                    size={16}
                                                                    style={{ color: accentColor }}
                                                                    className="ml-auto"
                                                                />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Security Tab (Simplified) */}
                                {activeTab === "security" && (
                                    <motion.div
                                        key="security"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2
                                            className="text-sm font-bold uppercase tracking-wider mb-6"
                                            style={{ color: accentColor }}
                                        >
                                            Security Settings
                                        </h2>
                                        <div className="p-4 bg-[#0A0A0A] border border-white/10 rounded-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center">
                                                    <Shield size={18} className="text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-medium">Coming Soon</p>
                                                    <p className="text-xs text-gray-500">Advanced security features are under development.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default CompanyAdminSettingsPage;
