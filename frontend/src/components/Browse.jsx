import { useEffect } from "react";
import Navbar from "./shared/Navbar";
import Job from "./Job";
import { useDispatch, useSelector } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";
import useGetAllJobs from "@/hooks/useGetAllJobs";
import { Search, Sparkles, Terminal, Grid3x3 } from "lucide-react";
import { motion } from "framer-motion";

const Browse = () => {
  useGetAllJobs();
  const { allJobs } = useSelector((store) => store.job);
  const dispatch = useDispatch();

  useEffect(() => {
    return () => {
      dispatch(setSearchedQuery(""));
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <Navbar />

      {/* Header Section */}
      <div className="pt-20 sm:pt-32 pb-8 sm:pb-12 border-b border-white/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700] text-[10px] font-bold tracking-widest uppercase mb-6"
          >
            <Terminal size={12} />
            <span>Browse Jobs</span>
          </motion.div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 sm:mb-4 uppercase tracking-tight">
            Available <span className="text-[#FFD700]">Positions</span>
          </h1>

          <p className="text-sm text-gray-500 font-mono max-w-xl">
            Explore curated opportunities. AI-matched positions for precision
            career moves.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 my-8 sm:my-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <h2 className="font-bold text-sm text-gray-400 flex items-center gap-3 uppercase tracking-wider">
            <Grid3x3 size={14} />
            Search Results
            <span className="px-2 py-0.5 bg-[#FFD700]/10 text-[#FFD700] text-xs rounded-sm border border-[#FFD700]/30 font-mono">
              {allJobs.length}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {allJobs.map((job) => {
            return (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Job job={job} />
              </motion.div>
            );
          })}

          {allJobs.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-600 bg-[#111111] rounded-sm border border-white/10">
              <Search className="mx-auto mb-4 opacity-30" size={48} />
              <p className="text-sm font-medium uppercase tracking-wider">
                No results found
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Try different search parameters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;
