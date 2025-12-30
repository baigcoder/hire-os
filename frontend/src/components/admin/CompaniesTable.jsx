import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Edit2,
  MoreHorizontal,
  ExternalLink,
  Users,
  Briefcase,
  Building2,
  Calendar,
  Eye,
  Trash2,
  Settings,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const CompaniesTable = () => {
  const { companies, searchCompanyByText } = useSelector(
    (store) => store.company,
  );
  const [filterCompany, setFilterCompany] = useState(companies);
  const navigate = useNavigate();

  useEffect(() => {
    const filteredCompany =
      companies?.length >= 0 &&
      companies.filter((company) => {
        if (!searchCompanyByText) {
          return true;
        }
        return company?.name
          ?.toLowerCase()
          .includes(searchCompanyByText.toLowerCase());
      });
    setFilterCompany(filteredCompany);
  }, [companies, searchCompanyByText]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (!filterCompany || filterCompany.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-sm bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-[#FFD700]/50" />
        </div>
        <p className="text-gray-400 font-mono text-sm mb-2">No companies found</p>
        <p className="text-gray-600 text-xs mb-6">
          {searchCompanyByText
            ? "Try adjusting your search"
            : "Register your first company to get started"}
        </p>
        {!searchCompanyByText && (
          <Button
            onClick={() => navigate("/admin/companies/create")}
            className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm text-xs font-bold uppercase tracking-wider"
          >
            Add Company
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="col-span-4 text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Company
        </div>
        <div className="col-span-2 text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Status
        </div>
        <div className="col-span-2 text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Team
        </div>
        <div className="col-span-2 text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Registered
        </div>
        <div className="col-span-2 text-[10px] text-gray-500 uppercase tracking-wider font-mono text-right">
          Actions
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-white/5">
        {filterCompany?.map((company, idx) => (
          <motion.div
            key={company._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group"
          >
            {/* Company Info */}
            <div className="col-span-4 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-12 w-12 rounded-sm border-2 border-[#FFD700]/20 group-hover:border-[#FFD700]/50 transition-colors">
                  {company.logo ? (
                    <AvatarImage src={company.logo} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-[#FFD700]/10 text-[#FFD700] font-bold text-lg rounded-sm">
                    {company.name?.charAt(0)?.toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00FF94] rounded-full border-2 border-[#0A0A0A] flex items-center justify-center">
                  <span className="w-2 h-2 bg-[#00FF94] rounded-full animate-pulse" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium truncate text-sm group-hover:text-[#FFD700] transition-colors">
                  {company.name}
                </p>
                <p className="text-gray-500 text-xs font-mono truncate">
                  {company.website || company.location || "No details"}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="col-span-2 flex items-center">
              <Badge
                className="rounded-sm text-[10px] font-mono px-2 py-1 bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30 uppercase"
              >
                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF94] opacity-50"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00FF94]"></span>
                </span>
                Active
              </Badge>
            </div>

            {/* Team Count */}
            <div className="col-span-2 flex items-center">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-sm font-mono">
                  {company.recruiters?.length || company.teamSize || 1}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="col-span-2 flex items-center">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
                <Calendar className="w-3 h-3" />
                {formatDate(company.createdAt)}
              </div>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/admin/companies/${company._id}`)}
                className="h-8 px-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm text-xs"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                View
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-gray-500 hover:text-white hover:bg-white/5 rounded-sm"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#111111] border-white/10 rounded-sm w-48"
                >
                  <DropdownMenuItem
                    onClick={() => navigate(`/admin/companies/${company._id}`)}
                    className="text-gray-300 hover:bg-white/5 focus:bg-white/5 rounded-sm cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 mr-2 text-[#FFD700]" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-gray-300 hover:bg-white/5 focus:bg-white/5 rounded-sm cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 mr-2 text-[#3B82F6]" />
                    View Jobs
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-gray-300 hover:bg-white/5 focus:bg-white/5 rounded-sm cursor-pointer"
                  >
                    <Users className="w-4 h-4 mr-2 text-[#8B5CF6]" />
                    Manage Team
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-gray-300 hover:bg-white/5 focus:bg-white/5 rounded-sm cursor-pointer"
                  >
                    <Settings className="w-4 h-4 mr-2 text-gray-400" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 rounded-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Company
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/[0.01]">
        <p className="text-[10px] text-gray-600 font-mono uppercase">
          Showing {filterCompany?.length || 0} of {companies?.length || 0} companies
        </p>
        <div className="flex items-center gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-white/10 text-gray-500 rounded-sm text-xs h-7 px-3"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-white/10 text-gray-500 rounded-sm text-xs h-7 px-3"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompaniesTable;
