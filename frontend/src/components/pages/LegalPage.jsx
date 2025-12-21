import React from "react";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";
import { Shield, FileText, Lock } from "lucide-react";

const LegalPage = ({ type }) => {
  const getContent = () => {
    switch (type) {
      case "privacy":
        return {
          title: "Privacy Protocol",
          subtitle:
            "Data protection standards and information handling procedures.",
          icon: Lock,
          sections: [
            {
              heading: "1. Data Collection",
              content:
                "We collect information you provide directly to us, including but not limited to your name, email address, professional history, and resume data. Our systems also automatically log telemetry data regarding your usage of the HIRE.OS platform.",
            },
            {
              heading: "2. Usage of Information",
              content:
                "Your data is used solely for the purpose of matching talent with opportunity. We do not sell personal data to third-party advertisers. All matching algorithms operate within strict ethical boundaries.",
            },
            {
              heading: "3. Data Security",
              content:
                "We implement industrial-grade encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Access controls are strictly enforced on a need-to-know basis.",
            },
          ],
        };
      case "terms":
        return {
          title: "Terms of Service",
          subtitle: "Operational agreement and usage guidelines.",
          icon: FileText,
          sections: [
            {
              heading: "1. Acceptance of Terms",
              content:
                "By accessing or using HIRE.OS, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this site.",
            },
            {
              heading: "2. User License",
              content:
                "Permission is granted to temporarily download one copy of the materials (information or software) on HIRE.OS for personal, non-commercial transitory viewing only.",
            },
            {
              heading: "3. Disclaimer",
              content:
                "The materials on HIRE.OS are provided on an 'as is' basis. HIRE.OS makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.",
            },
          ],
        };
      case "cookies":
        return {
          title: "Cookie Policy",
          subtitle: "Tracking technologies and session management.",
          icon: Shield,
          sections: [
            {
              heading: "1. What Are Cookies",
              content:
                "Cookies are small text files that are placed on your computer by websites that you visit. They are widely used in order to make websites work, or work more efficiently, as well as to provide information to the owners of the site.",
            },
            {
              heading: "2. How We Use Cookies",
              content:
                "We use cookies to authenticate users, prevent fraudulent use of user accounts, and improved website performance. We do not use cookies for behavioral advertising.",
            },
          ],
        };
      default:
        return {
          title: "Legal Document",
          subtitle: "System documentation.",
          icon: FileText,
          sections: [],
        };
    }
  };

  const content = getContent();

  return (
    <IndustrialPageLayout title={content.title} subtitle={content.subtitle}>
      <div className="flex gap-8 items-start">
        <div className="hidden lg:block w-64 flex-shrink-0 sticky top-32">
          <div className="bg-[#111111] p-6 border border-white/10 rounded-sm">
            <div className="w-12 h-12 bg-[#FFD700]/10 rounded-sm flex items-center justify-center text-[#FFD700] mb-4">
              <content.icon size={24} />
            </div>
            <h3 className="text-white font-bold mb-2 uppercase tracking-wide">
              Document Status
            </h3>
            <p className="text-xs font-mono text-[#00FF94] mb-4">
              ● EFFECTIVE: DEC 2024
            </p>
            <hr className="border-white/10 mb-4" />
            <ul className="space-y-2 text-xs font-mono text-gray-500">
              <li>REF: LEG-2024-001</li>
              <li>VER: 2.1.0</li>
              <li>AUTH: LEGAL_OPS</li>
            </ul>
          </div>
        </div>

        <div className="flex-1 max-w-3xl">
          <div className="space-y-12">
            {content.sections.map((section, idx) => (
              <div key={idx} className="group">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="text-[#FFD700] font-mono text-sm opacity-50 group-hover:opacity-100 transition-opacity">
                    {(idx + 1).toString().padStart(2, "0")} //
                  </span>
                  {section.heading}
                </h3>
                <div className="bg-[#111111] p-6 md:p-8 border border-white/10 rounded-sm group-hover:border-[#FFD700]/20 transition-colors">
                  <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-sm">
            <p className="text-gray-400 text-xs font-mono text-center">
              This document is legally binding. For specific inquiries, contact
              legal@hire.os.
            </p>
          </div>
        </div>
      </div>
    </IndustrialPageLayout>
  );
};

export default LegalPage;
