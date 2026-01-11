import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { toast } from "sonner";
import {
    DollarSign,
    Search,
    TrendingUp,
    Briefcase,
    MapPin,
    Info,
    Plus,
    BarChart2,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const EXPERIENCE_LEVELS = [
    { value: "entry", label: "Entry Level (0-2 years)" },
    { value: "junior", label: "Junior (2-4 years)" },
    { value: "mid", label: "Mid-Level (4-6 years)" },
    { value: "senior", label: "Senior (6-10 years)" },
    { value: "lead", label: "Lead (10-15 years)" },
    { value: "executive", label: "Executive (15+ years)" },
];

const SalaryBenchmark = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [experienceLevel, setExperienceLevel] = useState("mid");
    const [benchmark, setBenchmark] = useState(null);
    const [distribution, setDistribution] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitData, setSubmitData] = useState({
        jobTitle: "",
        salary: { base: 0, bonus: 0, currency: "PKR" },
        experienceLevel: "mid",
        yearsOfExperience: 0,
    });

    useEffect(() => {
        fetchTrending();
    }, []);

    const fetchTrending = async () => {
        try {
            const res = await api.get("/salaries/trending");
            setTrending(res.data.trending || []);
        } catch (error) {
            console.error("Fetch trending error:", error);
        }
    };

    const searchBenchmark = async () => {
        if (!searchQuery.trim()) {
            toast.error("Enter a job title");
            return;
        }

        try {
            setLoading(true);
            const res = await api.get("/salaries/benchmark", {
                params: { jobTitle: searchQuery, experienceLevel },
            });
            setBenchmark(res.data.benchmark);
            setDistribution(res.data.distribution || []);
        } catch (error) {
            toast.error("Failed to fetch benchmark");
        } finally {
            setLoading(false);
        }
    };

    const submitSalary = async () => {
        if (!submitData.jobTitle || !submitData.salary.base) {
            toast.error("Fill required fields");
            return;
        }

        try {
            await api.post("/salaries", submitData);
            toast.success("Salary submitted for review");
            setShowSubmitModal(false);
            setSubmitData({
                jobTitle: "",
                salary: { base: 0, bonus: 0, currency: "PKR" },
                experienceLevel: "mid",
                yearsOfExperience: 0,
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit");
        }
    };

    const formatSalary = (amount) => {
        if (!amount) return "N/A";
        return `PKR ${Math.round(amount).toLocaleString()}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-primary" />
                        Salary Benchmarking
                    </h2>
                    <p className="text-muted-foreground">
                        Compare salaries and understand market rates
                    </p>
                </div>
                <Button onClick={() => setShowSubmitModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your Salary
                </Button>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search job title (e.g., Software Engineer)"
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && searchBenchmark()}
                            />
                        </div>
                        <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {EXPERIENCE_LEVELS.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                        {level.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={searchBenchmark} disabled={loading}>
                            {loading ? "Searching..." : "Search"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {benchmark && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Average Base</p>
                            <p className="text-lg sm:text-2xl font-bold text-primary">
                                {formatSalary(benchmark.avgBase)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Based on {benchmark.count} reports
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-xs text-muted-foreground mb-1">25th Percentile</p>
                            <p className="text-lg sm:text-2xl font-bold">{formatSalary(benchmark.p25?.[0])}</p>
                            <p className="text-xs text-muted-foreground">Low end</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Median (50th)</p>
                            <p className="text-lg sm:text-2xl font-bold text-green-600">
                                {formatSalary(benchmark.p50?.[0])}
                            </p>
                            <p className="text-xs text-muted-foreground">Typical</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-xs text-muted-foreground mb-1">75th Percentile</p>
                            <p className="text-lg sm:text-2xl font-bold">{formatSalary(benchmark.p75?.[0])}</p>
                            <p className="text-xs text-muted-foreground">High end</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Distribution by Experience */}
            {distribution.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">By Experience Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {distribution.map((item) => (
                                <div key={item._id} className="flex items-center gap-4">
                                    <Badge variant="outline" className="w-20 sm:w-24 justify-center capitalize text-xs">
                                        {item._id}
                                    </Badge>
                                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                                        <div
                                            className="bg-primary h-full flex items-center justify-end pr-2"
                                            style={{
                                                width: `${Math.min(100, (item.avgSalary / (distribution[distribution.length - 1]?.avgSalary || 1)) * 100)}%`,
                                            }}
                                        >
                                            <span className="text-xs text-primary-foreground font-medium">
                                                {formatSalary(item.avgSalary)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground w-16 text-right">
                                        {item.count} reports
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trending Jobs */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Highest Paying Roles
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {trending.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                            No data available yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {trending.map((job, idx) => (
                                <div
                                    key={job._id}
                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-muted/50 rounded-md gap-2"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-muted-foreground">
                                            #{idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium capitalize">{job._id}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {job.count} salary reports
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-primary">
                                            {formatSalary(job.avgSalary)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">avg/month</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submit Modal */}
            <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Your Salary</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Job Title *</Label>
                            <Input
                                placeholder="e.g., Software Engineer"
                                value={submitData.jobTitle}
                                onChange={(e) =>
                                    setSubmitData({ ...submitData, jobTitle: e.target.value })
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Salary (PKR/month) *</Label>
                                <Input
                                    type="number"
                                    placeholder="150000"
                                    value={submitData.salary.base || ""}
                                    onChange={(e) =>
                                        setSubmitData({
                                            ...submitData,
                                            salary: {
                                                ...submitData.salary,
                                                base: parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bonus (optional)</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={submitData.salary.bonus || ""}
                                    onChange={(e) =>
                                        setSubmitData({
                                            ...submitData,
                                            salary: {
                                                ...submitData.salary,
                                                bonus: parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Experience Level</Label>
                                <Select
                                    value={submitData.experienceLevel}
                                    onValueChange={(v) =>
                                        setSubmitData({ ...submitData, experienceLevel: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPERIENCE_LEVELS.map((l) => (
                                            <SelectItem key={l.value} value={l.value}>
                                                {l.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Years of Experience</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={submitData.yearsOfExperience}
                                    onChange={(e) =>
                                        setSubmitData({
                                            ...submitData,
                                            yearsOfExperience: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Your data is anonymous. It helps others understand market rates.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitSalary}>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalaryBenchmark;
