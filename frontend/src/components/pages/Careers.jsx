import React from "react";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";
import {
  ArrowRight,
  Code,
  Terminal,
  Database,
  Shield,
  Cpu,
} from "lucide-react";
import { Button } from "../ui/button";

const Careers = () => {
  const openings = [
    {
      role: "Senior Full Stack Engineer",
      dept: "Product Engineering",
      loc: "Remote / Lahore",
      type: "Full-time",
      icon: Code,
    },
    {
      role: "AI Research Scientist",
      dept: "Artificial Intelligence",
      loc: "Remote",
      type: "Full-time",
      icon: Cpu,
    },
    {
      role: "DevOps Engineer",
      dept: "Infrastructure",
      loc: "Lahore",
      type: "Full-time",
      icon: Terminal,
    },
    {
      role: "Security Analyst",
      dept: "Security",
      loc: "Remote",
      type: "Contract",
      icon: Shield,
    },
  ];

  const benefits = [
    "Competitive Equity Packages",
    "Remote-First Culture",
    "Premium Hardware Setup",
    "Learning Stipend",
    "Health & Wellness",
    "Annual Retreats",
  ];

  return (
    <IndustrialPageLayout
      title="Join the Crew"
      subtitle="Help us build the operating system for the global workforce."
    >
      {/* Openings List */}
      <div className="mb-20">
        <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
            Open Positions
          </h2>
          <span className="text-sm font-mono text-[#FFD700]">
            {openings.length} POSITIONS ACTIVE
          </span>
        </div>

        <div className="space-y-4">
          {openings.map((job, idx) => (
            <div
              key={idx}
              className="group relative bg-[#111111] p-6 border border-white/10 rounded-sm hover:border-[#FFD700]/50 transition-all cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-0 h-full bg-[#FFD700]/5 group-hover:w-full transition-all duration-300" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-sm flex items-center justify-center text-gray-400 group-hover:text-[#FFD700] group-hover:bg-[#FFD700]/10 transition-colors">
                    <job.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#FFD700] transition-colors">
                      {job.role}
                    </h3>
                    <div className="flex gap-3 text-xs font-mono text-gray-500 uppercase">
                      <span>{job.dept}</span>
                      <span className="text-white/20">|</span>
                      <span>{job.loc}</span>
                      <span className="text-white/20">|</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                </div>

                <Button className="bg-transparent border border-white/20 text-white hover:bg-[#FFD700] hover:text-black hover:border-transparent transition-all uppercase text-xs font-bold tracking-wider">
                  Apply Now <ArrowRight size={14} className="ml-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-12">
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">
            Why HIRE.OS?
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            We are a team of builders, dreamers, and doers. We don't just write
            code; we architect solutions to complex human problems. Join us and
            do the best work of your career.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm text-gray-300 font-mono"
              >
                <div className="w-1.5 h-1.5 bg-[#00FF94] rounded-full" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
        <div className="h-64 bg-[#111111] border border-white/10 rounded-sm relative overflow-hidden group">
          {/* Abstract Visual */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 grayscale group-hover:opacity-30 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
          <div className="absolute bottom-6 left-6">
            <p className="text-[#FFD700] font-mono text-xs mb-1">CULTURE.SYS</p>
            <h3 className="text-white font-bold text-xl uppercase">
              Success is a Team Sport
            </h3>
          </div>
        </div>
      </div>
    </IndustrialPageLayout>
  );
};

export default Careers;
