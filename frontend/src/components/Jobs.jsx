import { useEffect, useState, useMemo } from "react";
import Navbar from "./shared/Navbar";
import { useInShell } from "./app/shellContext";
import Footer from "./shared/Footer";
import FilterCard from "./FilterCard";
import Job from "./Job";
import { useSelector } from "react-redux";
import useGetAllJobs from "@/hooks/useGetAllJobs";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  Briefcase,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "./ui/button";

const Jobs = () => {
  useGetAllJobs(); // Fetch job data when page loads
  const { allJobs, searchedQuery } = useSelector((store) => store.job);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [, setIsSearching] = useState(false);

  // Debounce search input to prevent excessive filtering
  useEffect(() => {
    if (searchInput !== debouncedSearch) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Memoized filter logic for better performance
  const filterJobs = useMemo(() => {
    let filtered = allJobs;

    const query = debouncedSearch || searchedQuery;
    if (query) {
      const searchLower = query.toLowerCase();
      filtered = allJobs.filter((job) => (
        job.title?.toLowerCase().includes(searchLower) ||
        job.description?.toLowerCase().includes(searchLower) ||
        job.location?.toLowerCase().includes(searchLower) ||
        job.company?.name?.toLowerCase().includes(searchLower) ||
        job.skills?.some((skill) => skill.toLowerCase().includes(searchLower))
      ));
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "salary-high":
          return (b.salary || 0) - (a.salary || 0);
        case "salary-low":
          return (a.salary || 0) - (b.salary || 0);
        default:
          return 0;
      }
    });
  }, [allJobs, searchedQuery, debouncedSearch, sortBy]);

  const inShell = useInShell();

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      {/* Header Section */}
      <div className={inShell ? "" : "pt-16"}>
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <h1 className="app-h1">Jobs</h1>

            {/* Search Bar */}
            <div className="flex items-center gap-3 w-full md:flex-1 md:max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search jobs by title, skills, location..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-background border border-white/10 rounded-sm text-white text-xs sm:text-sm focus:border-primary/50 focus:outline-none transition-all placeholder-gray-600"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <FilterCard />
            </div>
          </aside>

          {/* Jobs Grid */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-card border border-white/10 rounded-sm">
              <div className="flex items-center gap-3">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`lg:hidden flex items-center gap-2 px-3 py-2 rounded-sm text-xs transition-all ${showFilters ? "bg-primary text-black" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10" }`}
                >
                  <SlidersHorizontal size={14} />
                  Filters
                </button>

                {/* Sort */}
                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 bg-background border border-white/10 rounded-sm text-gray-300 text-xs sm:text-xs focus:border-primary/50 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="salary-high">Highest salary</option>
                    <option value="salary-low">Lowest salary</option>
                  </select>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-sm transition-all ${viewMode === "grid" ? "bg-primary text-black" : "text-gray-500 hover:text-white" }`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-sm transition-all ${viewMode === "list" ? "bg-primary text-black" : "text-gray-500 hover:text-white" }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Mobile Filters */}
            {showFilters && (
              <div
               
               
               
                className="lg:hidden mb-6"
              >
                <FilterCard />
              </div>
            )}

            {/* Jobs List */}
            {filterJobs.length <= 0 ? (
              <div
               
               
                className="flex flex-col items-center justify-center py-20 bg-card border border-white/10 rounded-sm"
              >
                <div className="w-16 h-16 rounded-sm bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                  <Briefcase size={32} className="text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  No jobs match
                </h3>
                <p className="text-gray-500 text-center max-w-md mb-6 text-sm">
                  We couldn&apos;t find any jobs matching your criteria. Try
                  adjusting your search or filters.
                </p>
                <Button
                  onClick={() => {
                    setSearchInput("");
                    setSortBy("newest");
                  }}
                  className="bg-primary text-black hover:bg-primary/90 text-xs"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div
                className={`${viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4" : "flex flex-col gap-3" }`}
              >
                {filterJobs.map((job, index) => (
                  <div
                    key={job?._id}
                   
                   
                   
                  >
                    <Job job={job} viewMode={viewMode} />
                  </div>
                ))}
              </div>
            )}

            {/* Results Count */}
            {filterJobs.length > 0 && (
              <div className="flex items-center justify-center mt-10 pt-6 border-t border-white/10">
                <p className="text-gray-500 text-xs">
                  {filterJobs.length} of {allJobs.length} jobs
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Jobs;
