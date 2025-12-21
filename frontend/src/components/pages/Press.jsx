import React from "react";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";
import { Newspaper, Download, ExternalLink, Award } from "lucide-react";
import { Button } from "../ui/button";

const Press = () => {
  const pressMentions = [
    {
      source: "TechCrunch",
      date: "Nov 15, 2024",
      title:
        "HIRE.OS raises $50M Series B to revolutionize enterprise hiring with AI.",
      link: "#",
    },
    {
      source: "Forbes",
      date: "Oct 22, 2024",
      title:
        "The Future of Work is precise, data-driven, and powered by HIRE.OS.",
      link: "#",
    },
    {
      source: "Wired",
      date: "Sep 10, 2024",
      title:
        "How one startup is eliminating bias from the recruitment process.",
      link: "#",
    },
  ];

  const assets = [
    { label: "Brand Guidelines", type: "PDF", size: "2.4 MB" },
    { label: "Logo Pack (Light/Dark)", type: "ZIP", size: "15 MB" },
    { label: "Executive Headshots", type: "ZIP", size: "45 MB" },
    { label: "Product Screenshots", type: "ZIP", size: "32 MB" },
  ];

  return (
    <IndustrialPageLayout
      title="Press Room"
      subtitle="Latest transmissions, media assets, and company announcements."
    >
      {/* Featured Mentions */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-white mb-8 uppercase tracking-wider flex items-center gap-2">
          <Newspaper size={20} className="text-[#FFD700]" />
          In the News
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pressMentions.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#111111] p-6 border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-all flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[#FFD700] text-xs font-bold uppercase tracking-wider">
                    {item.source}
                  </span>
                  <span className="text-gray-600 text-xs font-mono">
                    {item.date}
                  </span>
                </div>
                <h3 className="text-white font-bold leading-relaxed mb-4 group-hover:text-gray-200 transition-colors">
                  {item.title}
                </h3>
              </div>
              <a
                href={item.link}
                className="inline-flex items-center text-xs font-mono text-gray-500 hover:text-[#FFD700] transition-colors uppercase tracking-wider mt-4"
              >
                Read Article <ExternalLink size={12} className="ml-2" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Media Kit / Downloads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-white/10 pt-12">
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">
            Media Assets
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            Official logos, product screenshots, and executive team photos for
            media use. Please adhere to our brand guidelines when using these
            materials.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assets.map((asset, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-[#111111] border border-white/10 rounded-sm hover:border-[#FFD700]/30 transition-colors cursor-pointer group"
              >
                <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                  {asset.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-600 font-mono uppercase">
                    {asset.type}
                  </span>
                  <Download
                    size={14}
                    className="text-gray-500 group-hover:text-[#FFD700] transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111111] p-8 border border-white/10 rounded-sm">
          <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <Award size={20} className="text-[#FFD700]" />
            Recognition
          </h2>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-white/10">01</div>
              <div>
                <h4 className="text-white font-bold">
                  Best Enterprise SaaS 2024
                </h4>
                <p className="text-gray-500 text-xs font-mono">
                  Cloud Awards International
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-white/10">02</div>
              <div>
                <h4 className="text-white font-bold">Top AI Innovation</h4>
                <p className="text-gray-500 text-xs font-mono">
                  Future of Work Summit
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-white/10">03</div>
              <div>
                <h4 className="text-white font-bold">
                  Fastest Growing Startup
                </h4>
                <p className="text-gray-500 text-xs font-mono">Tech 500 Asia</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </IndustrialPageLayout>
  );
};

export default Press;
