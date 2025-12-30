import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "@/utils/api";
import { toast } from "sonner";
import {
    Share2,
    Copy,
    Mail,
    Users,
    TrendingUp,
    Gift,
    Award,
    ChevronRight,
    MousePointerClick,
    UserPlus,
    Briefcase,
    CheckCircle,
    Clock,
    Send,
    Link2,
    Trophy,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const ReferralDashboard = () => {
    const { user } = useSelector((store) => store.auth);
    const [referralCode, setReferralCode] = useState(null);
    const [referrals, setReferrals] = useState([]);
    const [stats, setStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteMessage, setInviteMessage] = useState("");
    const [sendingInvite, setSendingInvite] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            setLoading(true);
            const [codeRes, referralsRes, statsRes] = await Promise.all([
                api.post("/referral/generate", {}),
                api.get("/referral/my-referrals"),
                api.get("/referral/stats"),
            ]);

            setReferralCode(codeRes.data.referral);
            setReferrals(referralsRes.data.referrals || []);
            setStats(statsRes.data.stats);
            setLeaderboard(statsRes.data.leaderboard || []);
        } catch (error) {
            console.error("Error fetching referral data:", error);
            toast.error("Failed to load referral data");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const shareReferral = () => {
        const shareUrl = `${window.location.origin}/signup?ref=${referralCode?.code}`;
        if (navigator.share) {
            navigator.share({
                title: "Join HIRE.OS",
                text: `${user?.fullname} invited you to join HIRE.OS - the smartest job portal!`,
                url: shareUrl,
            });
        } else {
            copyToClipboard(shareUrl);
        }
    };

    const sendEmailInvite = async () => {
        if (!inviteEmail) {
            toast.error("Please enter an email address");
            return;
        }

        try {
            setSendingInvite(true);
            await api.post("/referral/invite", {
                email: inviteEmail,
                message: inviteMessage,
            });

            toast.success("Invitation sent successfully!");
            setInviteEmail("");
            setInviteMessage("");
            setShowInviteModal(false);
            fetchReferralData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send invitation");
        } finally {
            setSendingInvite(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: "bg-yellow-500/10 text-yellow-500",
            signed_up: "bg-blue-500/10 text-blue-500",
            applied: "bg-purple-500/10 text-purple-500",
            hired: "bg-green-500/10 text-green-500",
            rewarded: "bg-emerald-500/10 text-emerald-500",
            expired: "bg-gray-500/10 text-gray-500",
        };
        return colors[status] || "bg-gray-500/10 text-gray-500";
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: Clock,
            signed_up: UserPlus,
            applied: Briefcase,
            hired: CheckCircle,
            rewarded: Gift,
        };
        const Icon = icons[status] || Clock;
        return <Icon className="h-4 w-4" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Gift className="h-8 w-8 text-primary" />
                        Referral Program
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Invite friends and earn rewards when they get hired!
                    </p>
                </div>
                <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="gap-2">
                            <Mail className="h-5 w-5" />
                            Invite via Email
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Send Invitation</DialogTitle>
                            <DialogDescription>
                                Invite a friend to join HIRE.OS with your personal referral link
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <label className="text-sm font-medium">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="friend@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Personal Message (Optional)</label>
                                <Textarea
                                    placeholder="Hey! I've been using HIRE.OS and thought you might find it useful..."
                                    value={inviteMessage}
                                    onChange={(e) => setInviteMessage(e.target.value)}
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>
                            <Button
                                onClick={sendEmailInvite}
                                disabled={sendingInvite}
                                className="w-full gap-2"
                            >
                                {sendingInvite ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Send Invitation
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Referral Link Card */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium text-muted-foreground">
                                Your Referral Link
                            </label>
                            <div className="flex mt-1 gap-2">
                                <div className="flex-1 bg-background border rounded-lg px-4 py-3 font-mono text-sm truncate">
                                    {`${window.location.origin}/signup?ref=${referralCode?.code || "..."}`}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        copyToClipboard(
                                            `${window.location.origin}/signup?ref=${referralCode?.code}`
                                        )
                                    }
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button onClick={shareReferral} className="gap-2">
                                    <Share2 className="h-4 w-4" />
                                    Share
                                </Button>
                            </div>
                        </div>
                        <div className="text-center px-6 py-4 bg-primary/10 rounded-xl">
                            <div className="text-2xl font-bold text-primary">
                                {referralCode?.code || "---"}
                            </div>
                            <div className="text-xs text-muted-foreground">Your Code</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Referrals</p>
                                <p className="text-3xl font-bold">{stats?.totalReferrals || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Signed Up</p>
                                <p className="text-3xl font-bold">{stats?.signedUp || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <UserPlus className="h-6 w-6 text-purple-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Got Hired</p>
                                <p className="text-3xl font-bold text-green-500">
                                    {stats?.hired || 0}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                <p className="text-3xl font-bold">{stats?.conversionRate || 0}%</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Rewards & Link Clicks */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-primary" />
                            Rewards Earned
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
                                <Sparkles className="h-10 w-10 text-primary" />
                            </div>
                            <p className="text-4xl font-bold">{stats?.totalRewards || 0}</p>
                            <p className="text-muted-foreground">Credits Earned</p>
                            <p className="text-sm text-muted-foreground mt-4">
                                Earn 100 credits for each friend who signs up, and 500 credits when they get hired!
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MousePointerClick className="h-5 w-5 text-primary" />
                            Link Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total Clicks</span>
                                <span className="text-2xl font-bold">{stats?.totalClicks || 0}</span>
                            </div>
                            <Progress
                                value={
                                    stats?.totalReferrals
                                        ? (stats?.signedUp / stats?.totalClicks) * 100
                                        : 0
                                }
                                className="h-2"
                            />
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Click to Signup Rate</span>
                                <span>
                                    {stats?.totalClicks
                                        ? ((stats?.signedUp / stats?.totalClicks) * 100).toFixed(1)
                                        : 0}
                                    %
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Referrals & Leaderboard */}
            <Tabs defaultValue="referrals" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="referrals">My Referrals</TabsTrigger>
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                </TabsList>

                <TabsContent value="referrals" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Referrals</CardTitle>
                            <CardDescription>
                                Track the status of people you've referred
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {referrals.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No referrals yet</p>
                                    <p className="text-sm text-muted-foreground">
                                        Share your link to start earning rewards!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {referrals.map((referral) => (
                                        <div
                                            key={referral._id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={referral.referee?.profile?.profilePhoto}
                                                    />
                                                    <AvatarFallback>
                                                        {referral.refereeEmail?.[0]?.toUpperCase() ||
                                                            referral.referee?.fullname?.[0] ||
                                                            "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">
                                                        {referral.referee?.fullname ||
                                                            referral.refereeEmail ||
                                                            "Invited User"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {referral.refereeEmail || referral.referee?.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge
                                                    variant="secondary"
                                                    className={getStatusColor(referral.status)}
                                                >
                                                    {getStatusIcon(referral.status)}
                                                    <span className="ml-1 capitalize">
                                                        {referral.status.replace("_", " ")}
                                                    </span>
                                                </Badge>
                                                {referral.reward?.amount > 0 && (
                                                    <Badge variant="outline" className="text-green-500">
                                                        +{referral.reward.amount} credits
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leaderboard" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                Top Referrers This Month
                            </CardTitle>
                            <CardDescription>
                                See who's crushing it with referrals
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {leaderboard.length === 0 ? (
                                <div className="text-center py-12">
                                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No leaderboard data yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {leaderboard.map((entry, index) => (
                                        <div
                                            key={entry._id}
                                            className={`flex items-center justify-between p-4 rounded-lg ${index === 0
                                                ? "bg-yellow-500/10 border border-yellow-500/20"
                                                : index === 1
                                                    ? "bg-gray-400/10 border border-gray-400/20"
                                                    : index === 2
                                                        ? "bg-orange-600/10 border border-orange-600/20"
                                                        : "bg-muted/50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${index === 0
                                                        ? "bg-yellow-500 text-yellow-950"
                                                        : index === 1
                                                            ? "bg-gray-400 text-gray-950"
                                                            : index === 2
                                                                ? "bg-orange-600 text-white"
                                                                : "bg-muted-foreground/20"
                                                        }`}
                                                >
                                                    {index + 1}
                                                </div>
                                                <Avatar>
                                                    <AvatarImage
                                                        src={entry.user?.profile?.profilePhoto}
                                                    />
                                                    <AvatarFallback>
                                                        {entry.user?.fullname?.[0] || "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">
                                                    {entry.user?.fullname}
                                                </span>
                                            </div>
                                            <Badge variant="secondary" className="text-lg px-3">
                                                {entry.count} referrals
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* How It Works */}
            <Card>
                <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Link2 className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">1. Share Your Link</h3>
                            <p className="text-sm text-muted-foreground">
                                Share your unique referral link with friends via email, social media, or messaging
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <UserPlus className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">2. They Sign Up</h3>
                            <p className="text-sm text-muted-foreground">
                                When your friend signs up using your link, they become part of your referral network
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Gift className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">3. Earn Rewards</h3>
                            <p className="text-sm text-muted-foreground">
                                Get 100 credits when they sign up, and 500 credits when they land a job!
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReferralDashboard;
