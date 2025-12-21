import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  X,
  RotateCcw,
  ChevronDown,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const filterData = [
  {
    filterType: "Location",
    icon: MapPin,
    options: [
      "Remote",
      "Delhi NCR",
      "Bangalore",
      "Hyderabad",
      "Pune",
      "Mumbai",
      "Chennai",
    ],
  },
  {
    filterType: "Job Type",
    icon: Clock,
    options: ["Full-time", "Part-time", "Contract", "Freelance", "Internship"],
  },
  {
    filterType: "Industry",
    icon: Briefcase,
    options: [
      "Technology",
      "Finance",
      "Healthcare",
      "Marketing",
      "Design",
      "Sales",
    ],
  },
  {
    filterType: "Salary Range",
    icon: DollarSign,
    options: ["0-5 LPA", "5-10 LPA", "10-20 LPA", "20-50 LPA", "50+ LPA"],
  },
];

const FilterCard = () => {
  const [selectedFilters, setSelectedFilters] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    Location: true,
    "Job Type": true,
    Industry: false,
    "Salary Range": false,
  });
  const dispatch = useDispatch();

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters((prev) => {
      const current = prev[filterType] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      return {
        ...prev,
        [filterType]: updated,
      };
    });
  };

  const clearFilters = () => {
    setSelectedFilters({});
  };

  const getTotalFiltersCount = () => {
    return Object.values(selectedFilters).reduce(
      (total, arr) => total + arr.length,
      0,
    );
  };

  useEffect(() => {
    const allFilters = Object.values(selectedFilters).flat();
    if (allFilters.length > 0) {
      dispatch(setSearchedQuery(allFilters[0]));
    } else {
      dispatch(setSearchedQuery(""));
    }
  }, [selectedFilters, dispatch]);

  return (
    <div className="bg-[#111111] border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#FFD700]" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              FILTERS
            </h2>
          </div>
          {getTotalFiltersCount() > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[10px] font-mono text-[#FFD700] hover:text-[#FFD700]/80 uppercase tracking-wider"
            >
              <RotateCcw size={12} />
              CLEAR
            </button>
          )}
        </div>

        {/* Active Filters */}
        <AnimatePresence>
          {getTotalFiltersCount() > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mt-3"
            >
              {Object.entries(selectedFilters).map(([type, values]) =>
                values.map((value) => (
                  <span
                    key={`${type}-${value}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 rounded-sm"
                  >
                    {value}
                    <button
                      onClick={() => handleFilterChange(type, value)}
                      className="hover:text-white transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Sections */}
      <div className="divide-y divide-white/5">
        {filterData.map((data, index) => {
          const Icon = data.icon;
          const isExpanded = expandedSections[data.filterType];
          const selectedCount = (selectedFilters[data.filterType] || []).length;

          return (
            <div key={index} className="p-4">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(data.filterType)}
                className="flex items-center justify-between w-full text-left group"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={14}
                    className="text-gray-500 group-hover:text-[#FFD700] transition-colors"
                  />
                  <span className="text-xs font-mono text-gray-400 group-hover:text-white transition-colors uppercase tracking-wider">
                    {data.filterType}
                  </span>
                  {selectedCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 rounded-sm">
                      {selectedCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {/* Options */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-1"
                  >
                    {data.options.map((option, idx) => {
                      const isSelected = (
                        selectedFilters[data.filterType] || []
                      ).includes(option);
                      return (
                        <label
                          key={idx}
                          className="flex items-center gap-3 cursor-pointer group py-1.5 px-2 rounded-sm hover:bg-white/5 transition-colors"
                        >
                          <div
                            className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-[#FFD700] border-[#FFD700]"
                                : "border-white/20 group-hover:border-[#FFD700]/50"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-black"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleFilterChange(data.filterType, option)
                            }
                            className="sr-only"
                          />
                          <span
                            className={`text-xs font-mono transition-colors ${
                              isSelected
                                ? "text-white"
                                : "text-gray-500 group-hover:text-gray-300"
                            }`}
                          >
                            {option}
                          </span>
                        </label>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilterCard;
