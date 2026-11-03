import IndustrialPageLayout from "../layout/IndustrialPageLayout";
import {
  HelpCircle,
  FileText,
  BadgeDollarSign,
  BookOpen,
  Search,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { Button } from "../ui/button";

const ResourcePage = ({ type }) => {
  const getContent = () => {
    switch (type) {
      case "help":
        return {
          title: "Help Center",
          subtitle: "Knowledge base and support documentation.",
          icon: HelpCircle,
          categories: [
            {
              title: "Account Management",
              desc: "Login, security, and profile settings.",
            },
            {
              title: "For Candidates",
              desc: "Application tracking and profile optimization.",
            },
            {
              title: "For Recruiters",
              desc: "Job posting, candidate search, and billing.",
            },
            {
              title: "Technical Support",
              desc: "Platform issues and bug reporting.",
            },
          ],
        };
      case "resume":
        return {
          title: "Resume Builder",
          subtitle: "Generate ATS-optimized resumes with AI.",
          icon: FileText,
          categories: [
            {
              title: "ATS Optimization",
              desc: "Ensure your resume passes automated filters.",
            },
            {
              title: "AI Content Writer",
              desc: "Generate professional summaries and bullet points.",
            },
            {
              title: "Smart Templates",
              desc: "Industry-standard formats that recruiters love.",
            },
            {
              title: "Export Options",
              desc: "Download in PDF, Word, or plain text formats.",
            },
          ],
        };
      case "salary":
        return {
          title: "Salary Guide",
          subtitle: "Real-time market compensation data.",
          icon: BadgeDollarSign,
          categories: [
            {
              title: "Software Engineering",
              desc: "Backend, Frontend, Fullstack, DevOps.",
            },
            {
              title: "Data Science",
              desc: "AI/ML, Data Engineering, Analytics.",
            },
            {
              title: "Product Management",
              desc: "Technical PM, Group PM, Head of Product.",
            },
            { title: "Design", desc: "UI/UX, Product Design, Research." },
          ],
        };
      case "tips":
        return {
          title: "Interview Tips",
          subtitle: "Master the technical and behavioral interview.",
          icon: Lightbulb,
          categories: [
            {
              title: "System Design",
              desc: "Architecting scalable distributed systems.",
            },
            {
              title: "Algorithms",
              desc: "Data structures and algorithmic problem solving.",
            },
            {
              title: "Behavioral",
              desc: "STAR method and soft skill demonstration.",
            },
            { title: "Mock Interviews", desc: "Practice with AI or peers." },
          ],
        };
      default:
        return {
          title: "Resource Hub",
          subtitle: "Access platform resources.",
          icon: BookOpen,
          categories: [],
        };
    }
  };

  const content = getContent();

  return (
    <IndustrialPageLayout title={content.title} subtitle={content.subtitle}>
      {/* Search (if help center) */}
      {type === "help" && (
        <div className="max-w-2xl mx-auto mb-16 relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search usage protocols..."
            className="w-full pl-12 pr-4 py-4 bg-card border border-white/10 rounded-sm text-white focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {content.categories.map((cat, idx) => (
          <div
            key={idx}
            className="bg-card p-8 border border-white/10 rounded-sm group hover:border-primary/30 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-sm text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <content.icon size={24} />
              </div>
              <ArrowRight
                size={20}
                className="text-gray-600 group-hover:text-primary transition-colors"
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
              {cat.title}
            </h3>
            <p className="text-gray-400 leading-relaxed text-sm">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 border border-primary/10 rounded-sm p-8 text-center">
        <h3 className="text-white font-bold mb-2">
          Need escalated assistance?
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          Our support engineers are online 24/7/365.
        </p>
        <Button className="bg-transparent border border-primary text-primary hover:bg-primary hover:text-black transition-all text-xs font-bold">
          Contact Support
        </Button>
      </div>
    </IndustrialPageLayout>
  );
};

export default ResourcePage;
