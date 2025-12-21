import React from "react";
import Navbar from "../shared/Navbar";
import Footer from "../shared/Footer";
import { motion } from "framer-motion";

const IndustrialPageLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif] relative overflow-hidden flex flex-col">
      <Navbar />

      {/* Industrial Background Grid */}
      <div
        className="fixed inset-0 opacity-20 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Ambient Glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#FFD700]/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#00FF94]/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header Section */}
          {(title || subtitle) && (
            <div className="mb-12 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-white/5 border border-white/10 rounded-full"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse" />
                <span className="text-xs font-mono text-[#FFD700] uppercase tracking-widest">
                  System Page // {title?.toUpperCase()}
                </span>
              </motion.div>

              {title && (
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tight"
                >
                  {title}
                </motion.h1>
              )}

              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-gray-400 max-w-2xl leading-relaxed"
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          )}

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default IndustrialPageLayout;
