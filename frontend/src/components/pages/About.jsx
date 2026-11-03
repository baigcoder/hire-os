import React from "react";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";
import { Users, Target, Globe, Shield } from "lucide-react";

const About = () => {
  const stats = [
    { label: "Active Users", value: "50K+" },
    { label: "Companies", value: "2,000+" },
    { label: "Matches Made", value: "150K+" },
    { label: "Countries", value: "35+" },
  ];

  const values = [
    {
      icon: Target,
      title: "Precision Matching",
      desc: "Our AI algorithms don't just find keywords, they understand context, culture, and potential.",
    },
    {
      icon: Shield,
      title: "Trust & Security",
      desc: "Enterprise-grade security protocols ensuring your data remains private and protected.",
    },
    {
      icon: Globe,
      title: "Global Reach",
      desc: "Connecting talent and opportunities across borders with seamless compliance tools.",
    },
    {
      icon: Users,
      title: "Human First",
      desc: "Technology should empower human connections, not replace them. We build for people.",
    },
  ];

  return (
    <IndustrialPageLayout
      title="About HIRE.OS"
      subtitle="Redefining the future of talent acquisition through precision engineering and advanced intelligence."
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-card p-6 text-center border border-white/10 rounded-sm group hover:border-primary/30 transition-colors"
          >
            <h3 className="text-3xl font-black text-white mb-1 group-hover:text-primary transition-colors">
              {stat.value}
            </h3>
            <p className="text-gray-500 text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Mission Section */}
      <div className="bg-card p-8 md:p-12 border border-white/10 rounded-sm mb-20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-6">
            Our Mission
          </h2>
          <p className="text-gray-400 leading-relaxed text-lg max-w-3xl">
            HIRE.OS was born from a simple observation: the hiring process is
            broken. It's slow, biased, and inefficient. We set out to build an
            operating system for hiring—a platform that brings industrial-grade
            efficiency to the most important workflow in any company: building
            the team.
          </p>
        </div>
      </div>

      {/* Values Grid */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-white mb-8">
          Core Values
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((item, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-6 bg-card border border-white/10 rounded-sm hover:border-primary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-sm bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                <item.icon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team/Join CTA */}
      <div className="text-center py-20 border-t border-white/10">
        <h2 className="text-3xl font-bold text-white mb-6">
          Building formatting the Future Work?
        </h2>
        <div className="flex justify-center gap-4">
          <a
            href="/careers"
            className="px-8 py-4 bg-primary text-black font-bold rounded-sm hover:bg-[#FFE44D] transition-all"
          >
            View Open Positions
          </a>
        </div>
      </div>
    </IndustrialPageLayout>
  );
};

export default About;
