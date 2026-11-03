import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "../shared/Navbar";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import CompaniesTable from "./CompaniesTable";
import { useNavigate } from "react-router-dom";
import useGetAllCompanies from "@/hooks/useGetAllCompanies";
import { useDispatch, useSelector } from "react-redux";
import { setSearchCompanyByText } from "@/redux/companySlice";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Building,
  Terminal,
  Users,
  Briefcase,
} from "lucide-react";

// Live Indicator Component
const LiveIndicator = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-sm">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
    </span>
    <span className="text-accent text-xs">
      Active
    </span>
  </div>
);

// Stats Card
const StatCard = ({ label, value, icon: Icon, color = "#FFD700" }) => (
  <div className="relative p-4 bg-card border border-white/10 rounded-sm group hover:border-primary/30 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center border"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
  </div>
);

const Companies = () => {
  useGetAllCompanies();
  const [input, setInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { companies } = useSelector((store) => store.company);

  useEffect(() => {
    dispatch(setSearchCompanyByText(input));
  }, [input]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate stats
  const totalCompanies = companies?.length || 0;
  const activeCompanies = companies?.filter(c => c.status !== 'inactive')?.length || totalCompanies;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      {/* Background Pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none">
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center">
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight">
                Companies
              </h1>
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                Registered Organizations
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LiveIndicator />
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/5 text-white hover:bg-white/10 h-10 px-4 rounded-sm border border-white/10"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </Button>
            <Button
              onClick={() => navigate("/admin/companies/create")}
              className="bg-primary hover:bg-[#FFE44D] text-black font-bold h-10 px-6 rounded-sm text-xs"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Company
            </Button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            label="Total Companies"
            value={totalCompanies}
            icon={Building}
            color="#FFD700"
          />
          <StatCard
            label="Active"
            value={activeCompanies}
            icon={Building2}
            color="#00FF94"
          />
          <StatCard
            label="Team Members"
            value={companies?.reduce((acc, c) => acc + (c.recruiters?.length || 0), 0) || 0}
            icon={Users}
            color="#3B82F6"
          />
          <StatCard
            label="Open Positions"
            value={companies?.reduce((acc, c) => acc + (c.openJobs || 0), 0) || 0}
            icon={Briefcase}
            color="#8B5CF6"
          />
        </motion.div>

        {/* Search & Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-white/10 rounded-sm p-4 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                className="pl-10 bg-white/5 border-white/10 text-white h-10 rounded-sm placeholder:text-gray-600 focus:border-primary/50 focus:ring-primary/20"
                placeholder="Search companies..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="uppercase">Showing</span>
              <span className="text-primary font-bold">{totalCompanies}</span>
              <span className="uppercase">companies</span>
            </div>
          </div>
        </motion.div>

        {/* Companies Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-white/10 rounded-sm overflow-hidden"
        >
          <CompaniesTable />
        </motion.div>
      </div>
    </div>
  );
};

export default Companies;
