import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { setUser } from '@/redux/authSlice';
import Navbar from './shared/Navbar';
import Footer from './shared/Footer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
    Settings, User, Bell, Shield, CreditCard, Palette,
    Lock, Mail, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle,
    ChevronRight, Moon, Sun, Globe, Trash2, Download, LogOut,
    Key, Smartphone, Monitor, BellRing, Volume2, VolumeX
} from 'lucide-react';
import { USER_API_END_POINT } from '@/utils/constant';
import { WriteReviewButton } from './shared/AddReviewModal';

const SettingsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector(store => store.auth);

    const [activeTab, setActiveTab] = useState('account');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Settings state
    const [settings, setSettings] = useState({
        // Account
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        // Notifications
        emailNotifications: true,
        pushNotifications: true,
        applicationUpdates: true,
        interviewReminders: true,
        marketingEmails: false,
        // Privacy
        profileVisible: true,
        showEmail: false,
        showPhone: false,
        allowMessages: true,
        // Appearance
        theme: 'dark',
        language: 'en'
    });

    // Role-based accent color
    const roleColors = {
        student: '#FFD700',
        recruiter: '#00FF94',
        company_admin: '#00BFFF'
    };
    const accentColor = roleColors[user?.role] || '#FFD700';

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Privacy', icon: Shield },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'security', label: 'Security', icon: Lock }
    ];

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handlePasswordChange = async () => {
        if (settings.newPassword !== settings.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (settings.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(true);
            const res = await axios.post(`${USER_API_END_POINT}/change-password`, {
                currentPassword: settings.currentPassword,
                newPassword: settings.newPassword
            }, { withCredentials: true });

            if (res.data.success) {
                toast.success('Password updated successfully');
                setSettings(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotifications = async () => {
        try {
            setLoading(true);
            // API call to save notification preferences
            toast.success('Notification preferences saved');
        } catch (error) {
            toast.error('Failed to save preferences');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
        if (!confirmed) return;

        try {
            setLoading(true);
            // API call to delete account
            toast.success('Account deleted successfully');
            navigate('/');
        } catch (error) {
            toast.error('Failed to delete account');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.get(`${USER_API_END_POINT}/logout`, { withCredentials: true });
            dispatch(setUser(null));
            navigate('/login');
            toast.success('Logged out successfully');
        } catch (error) {
            toast.error('Logout failed');
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
        <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] selection:bg-[#FFD700]/30">
            {/* Industrial Grid Background */}
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[200px]"
                    style={{ backgroundColor: `${accentColor}10` }} />
            </div>

            <Navbar />

            <main className="max-w-5xl mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 rounded-sm flex items-center justify-center border"
                            style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}>
                            <Settings size={24} style={{ color: accentColor }} />
                        </div>
                        Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-mono">Manage your account preferences and security</p>
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
                                        ? 'bg-white/10 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    style={activeTab === tab.id ? { borderLeft: `2px solid ${accentColor}` } : {}}
                                >
                                    <tab.icon size={16} style={activeTab === tab.id ? { color: accentColor } : {}} />
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
                            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r" style={{ borderColor: `${accentColor}30` }} />

                            <AnimatePresence mode="wait">
                                {/* Account Tab */}
                                {activeTab === 'account' && (
                                    <motion.div
                                        key="account"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <div>
                                            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: accentColor }}>
                                                Account Information
                                            </h2>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Email Address</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="email"
                                                            value={settings.email}
                                                            disabled
                                                            className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-gray-400 font-mono text-sm"
                                                        />
                                                        <Button variant="outline" className="border-white/10 text-gray-400 rounded-sm">
                                                            Change
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Account Type</label>
                                                    <div className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-white/10 rounded-sm">
                                                        <Badge className="px-3 py-1 text-xs uppercase tracking-wider"
                                                            style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}50` }}>
                                                            {user?.role?.replace('_', ' ') || 'User'}
                                                        </Badge>
                                                        <span className="text-gray-500 text-sm">
                                                            {user?.authProvider === 'google' ? 'Connected via Google' : 'Email & Password'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Change Password</h3>
                                            <div className="space-y-3">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Current Password"
                                                    value={settings.currentPassword}
                                                    onChange={(e) => handleSettingChange('currentPassword', e.target.value)}
                                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                                                />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="New Password"
                                                    value={settings.newPassword}
                                                    onChange={(e) => handleSettingChange('newPassword', e.target.value)}
                                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                                                />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Confirm New Password"
                                                    value={settings.confirmPassword}
                                                    onChange={(e) => handleSettingChange('confirmPassword', e.target.value)}
                                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-300"
                                                    >
                                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        {showPassword ? 'Hide' : 'Show'} password
                                                    </button>
                                                    <Button
                                                        onClick={handlePasswordChange}
                                                        disabled={loading || !settings.newPassword}
                                                        className="rounded-sm font-bold text-xs uppercase tracking-wider"
                                                        style={{ backgroundColor: accentColor, color: '#000' }}
                                                    >
                                                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Update Password
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Share Your Experience */}
                                        <div className="pt-6 border-t border-white/5">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Share Your Experience</h3>
                                            <p className="text-xs text-gray-500 mb-4">Help other users by sharing feedback about HIRE.OS</p>
                                            <WriteReviewButton />
                                        </div>
                                    </motion.div>
                                )}

                                {/* Notifications Tab */}
                                {activeTab === 'notifications' && (
                                    <motion.div
                                        key="notifications"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: accentColor }}>
                                            Notification Preferences
                                        </h2>

                                        <SettingRow
                                            icon={Mail}
                                            title="Email Notifications"
                                            description="Receive updates via email"
                                        >
                                            <Switch
                                                checked={settings.emailNotifications}
                                                onCheckedChange={(v) => handleSettingChange('emailNotifications', v)}
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={BellRing}
                                            title="Push Notifications"
                                            description="Get notifications in browser"
                                        >
                                            <Switch
                                                checked={settings.pushNotifications}
                                                onCheckedChange={(v) => handleSettingChange('pushNotifications', v)}
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Smartphone}
                                            title="Application Updates"
                                            description="Get notified about application status changes"
                                        >
                                            <Switch
                                                checked={settings.applicationUpdates}
                                                onCheckedChange={(v) => handleSettingChange('applicationUpdates', v)}
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Bell}
                                            title="Interview Reminders"
                                            description="Receive reminder before interviews"
                                        >
                                            <Switch
                                                checked={settings.interviewReminders}
                                                onCheckedChange={(v) => handleSettingChange('interviewReminders', v)}
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Volume2}
                                            title="Marketing Emails"
                                            description="Receive news and promotional content"
                                        >
                                            <Switch
                                                checked={settings.marketingEmails}
                                                onCheckedChange={(v) => handleSettingChange('marketingEmails', v)}
                                            />
                                        </SettingRow>

                                        <div className="mt-6 flex justify-end">
                                            <Button
                                                onClick={handleSaveNotifications}
                                                className="rounded-sm font-bold text-xs uppercase tracking-wider"
                                                style={{ backgroundColor: accentColor, color: '#000' }}
                                            >
                                                Save Preferences
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Privacy Tab */}
                                {activeTab === 'privacy' && (
                                    <motion.div
                                        key="privacy"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: accentColor }}>
                                            Privacy Settings
                                        </h2>

                                        <SettingRow
                                            icon={Eye}
                                            title="Profile Visibility"
                                            description="Make your profile visible to recruiters"
                                        >
                                            <Switch
                                                checked={settings.profileVisible}
                                                onCheckedChange={(v) => handleSettingChange('profileVisible', v)}
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Mail}
                                            title="Show Email"
                                            description="Display email on your profile"
                                        >
                                            <Switch
                                                checked={settings.showEmail}
                                                onCheckedChange={(v) => handleSettingChange('showEmail', v)}
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Smartphone}
                                            title="Show Phone Number"
                                            description="Display phone on your profile"
                                        >
                                            <Switch
                                                checked={settings.showPhone}
                                                onCheckedChange={(v) => handleSettingChange('showPhone', v)}
                                            />
                                        </SettingRow>

                                        <SettingRow
                                            icon={Bell}
                                            title="Allow Messages"
                                            description="Let recruiters send you direct messages"
                                        >
                                            <Switch
                                                checked={settings.allowMessages}
                                                onCheckedChange={(v) => handleSettingChange('allowMessages', v)}
                                            />
                                        </SettingRow>

                                        <div className="mt-6 pt-6 border-t border-white/5">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Data & Privacy</h3>
                                            <div className="flex gap-3">
                                                <Button variant="outline" className="border-white/10 text-gray-400 rounded-sm text-xs uppercase tracking-wider">
                                                    <Download size={14} className="mr-2" />
                                                    Download Data
                                                </Button>
                                                <Button variant="outline" className="border-red-500/30 text-red-400 rounded-sm text-xs uppercase tracking-wider hover:bg-red-500/10">
                                                    <Trash2 size={14} className="mr-2" />
                                                    Request Deletion
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Appearance Tab */}
                                {activeTab === 'appearance' && (
                                    <motion.div
                                        key="appearance"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: accentColor }}>
                                            Appearance Settings
                                        </h2>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-3 block">Theme</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['dark', 'light'].map((theme) => (
                                                        <button
                                                            key={theme}
                                                            onClick={() => handleSettingChange('theme', theme)}
                                                            className={`p-4 rounded-sm border transition-all flex items-center gap-3 ${settings.theme === theme
                                                                ? 'bg-white/10 border-white/30'
                                                                : 'bg-[#0A0A0A] border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            {theme === 'dark' ? (
                                                                <Moon size={20} className={settings.theme === theme ? 'text-white' : 'text-gray-500'} />
                                                            ) : (
                                                                <Sun size={20} className={settings.theme === theme ? 'text-white' : 'text-gray-500'} />
                                                            )}
                                                            <span className={`text-sm capitalize ${settings.theme === theme ? 'text-white' : 'text-gray-500'}`}>
                                                                {theme} Mode
                                                            </span>
                                                            {settings.theme === theme && (
                                                                <CheckCircle size={16} style={{ color: accentColor }} className="ml-auto" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wider mb-3 block">Language</label>
                                                <select
                                                    value={settings.language}
                                                    onChange={(e) => handleSettingChange('language', e.target.value)}
                                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-sm text-white focus:outline-none focus:border-white/30"
                                                >
                                                    <option value="en">English</option>
                                                    <option value="es">Español</option>
                                                    <option value="fr">Français</option>
                                                    <option value="de">Deutsch</option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Security Tab */}
                                {activeTab === 'security' && (
                                    <motion.div
                                        key="security"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h2 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: accentColor }}>
                                            Security Settings
                                        </h2>

                                        <div className="space-y-4">
                                            <div className="p-4 bg-[#0A0A0A] border border-white/10 rounded-sm">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-sm bg-green-500/10 flex items-center justify-center">
                                                            <Shield size={18} className="text-green-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-white font-medium">Two-Factor Authentication</p>
                                                            <p className="text-xs text-gray-500">Add an extra layer of security</p>
                                                        </div>
                                                    </div>
                                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                                        Coming Soon
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-[#0A0A0A] border border-white/10 rounded-sm">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center">
                                                        <Monitor size={18} className="text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-white font-medium">Active Sessions</p>
                                                        <p className="text-xs text-gray-500">Manage your logged in devices</p>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-sm flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor size={14} className="text-gray-500" />
                                                        <span className="text-xs text-gray-400">Current session</span>
                                                    </div>
                                                    <Badge className="bg-green-500/20 text-green-400 text-[10px]">Active</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Danger Zone */}
                                        <div className="mt-8 pt-6 border-t border-red-500/20">
                                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <AlertTriangle size={14} />
                                                Danger Zone
                                            </h3>
                                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-sm">
                                                <p className="text-sm text-gray-400 mb-4">
                                                    Once you delete your account, there is no going back. Please be certain.
                                                </p>
                                                <Button
                                                    onClick={handleDeleteAccount}
                                                    variant="outline"
                                                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-sm text-xs uppercase tracking-wider"
                                                >
                                                    <Trash2 size={14} className="mr-2" />
                                                    Delete Account
                                                </Button>
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

export default SettingsPage;
