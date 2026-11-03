import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Brain,
  Video,
  FileText,
  Shield,
  BarChart3,
  Users,
  Gift,
  Zap,
  Target,
  Sparkles,
  Crown,
  CheckCircle2,
  ArrowRight,
  Clock,
  Globe,
  Lock,
  MessageSquare,
  Bell,
  Cpu,
  Award,
  Rocket,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import Navbar from "./shared/Navbar";
import Footer from "./shared/Footer";

// Feature Card Component
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  benefits,
  isPro = false,
  index,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className="group relative p-6 bg-card border border-white/10 hover:border-primary/30 rounded-sm transition-all"
  >

    {/* Icon */}
    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-sm flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
      <Icon className="w-6 h-6 text-primary" />
    </div>

    {/* Pro badge */}
    {isPro && (
      <Badge className="absolute top-4 right-4 bg-primary/10 text-primary text-xs px-2 py-0.5">
        PRO
      </Badge>
    )}

    {/* Content */}
    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">
      {title}
    </h3>
    <p className="text-gray-500 text-sm mb-4 leading-relaxed">
      {description}
    </p>

    {/* Benefits */}
    {benefits && (
      <ul className="space-y-2">
        {benefits.map((benefit, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    )}
  </motion.div>
);

// Category Section Component
const CategorySection = ({ title, subtitle, badge, features, gradient }) => (
  <section className={`py-20 relative ${gradient || "bg-background"}`}>
    <div className="absolute inset-0 opacity-20" />

    <div className="container mx-auto px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-3xl mx-auto mb-14"
      >
        <Badge className="mb-4 px-4 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs">
          {badge}
        </Badge>
        <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight text-white">
          {title}
        </h2>
        <p className="text-gray-500 text-sm">{subtitle}</p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} index={index} />
        ))}
      </div>
    </div>
  </section>
);

const FeaturesPage = () => {
  // Candidate Features
  const candidateFeatures = [
    {
      icon: Brain,
      title: "AI Resume Builder",
      description:
        "Generate ATS-optimized resumes with AI-powered suggestions and formatting.",
      benefits: [
        "Smart keyword optimization",
        "Multiple template options",
        "Real-time scoring feedback",
        "Export to PDF/Word",
      ],
    },
    {
      icon: Target,
      title: "Smart Job Matching",
      description:
        "Get matched to jobs based on your skills, experience, and preferences.",
      benefits: [
        "Skill-based matching algorithm",
        "Personalized recommendations",
        "Salary range predictions",
        "Match percentage scoring",
      ],
    },
    {
      icon: Video,
      title: "Interview Preparation",
      description:
        "Practice with AI-powered mock interviews and get instant feedback.",
      benefits: [
        "Role-specific questions",
        "Video response analysis",
        "Performance scoring",
        "Improvement suggestions",
      ],
    },
    {
      icon: Bell,
      title: "Job Alerts",
      description:
        "Get notified instantly when jobs matching your criteria are posted.",
      benefits: [
        "Email & push notifications",
        "Custom alert criteria",
        "Daily/weekly digests",
        "One-click apply",
      ],
    },
    {
      icon: BarChart3,
      title: "Application Tracker",
      description: "Track all your applications in one organized dashboard.",
      benefits: [
        "Status tracking",
        "Interview scheduling",
        "Company research notes",
        "Follow-up reminders",
      ],
    },
    {
      icon: Award,
      title: "Skills Assessment",
      description: "Validate your skills with verified assessments and badges.",
      benefits: [
        "Industry-standard tests",
        "Verified skill badges",
        "LinkedIn integration",
        "Certificate downloads",
      ],
    },
  ];

  // Recruiter Features
  const recruiterFeatures = [
    {
      icon: Video,
      title: "Live Video Interviews",
      description:
        "Conduct HD video interviews with recording and AI transcription.",
      benefits: [
        "HD video conferencing",
        "Auto-transcription",
        "Interview playback",
        "Note syncing",
      ],
      isPro: true,
    },
    {
      icon: FileText,
      title: "MCQ Assessment Engine",
      description:
        "Create custom tests with auto-grading and detailed analytics.",
      benefits: [
        "Question bank library",
        "Timer & proctoring",
        "Auto-grading",
        "Performance analytics",
      ],
      isPro: true,
    },
    {
      icon: Shield,
      title: "Fraud Detection",
      description: "Behavioral analysis and proctoring for test integrity.",
      benefits: [
        "Tab-switch detection",
        "Webcam monitoring",
        "Plagiarism check",
        "Anomaly alerts",
      ],
      isPro: true,
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Multi-recruiter access with role-based permissions.",
      benefits: [
        "Shared pipelines",
        "Comment threads",
        "Assignment workflow",
        "Activity logs",
      ],
      isPro: true,
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time pipeline metrics and conversion tracking.",
      benefits: [
        "Funnel visualization",
        "Source tracking",
        "Time-to-hire metrics",
        "Custom reports",
      ],
      isPro: true,
    },
    {
      icon: Gift,
      title: "Offer Management",
      description: "Digital offer letters with e-signature integration.",
      benefits: [
        "Template library",
        "E-signature support",
        "Expiry tracking",
        "Acceptance analytics",
      ],
      isPro: true,
    },
  ];

  // Platform Features
  const platformFeatures = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed with sub-second response times.",
      benefits: ["Global CDN", "Edge caching", "Optimized queries"],
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-grade encryption and SOC 2 compliance.",
      benefits: ["256-bit encryption", "2FA authentication", "Audit logging"],
    },
    {
      icon: Globe,
      title: "Multi-language Support",
      description: "Platform available in 10+ languages.",
      benefits: ["Auto-translation", "Localized content", "Regional settings"],
    },
    {
      icon: Cpu,
      title: "AI-Powered",
      description: "Machine learning algorithms for smart matching.",
      benefits: [
        "NLP processing",
        "Predictive analytics",
        "Continuous learning",
      ],
    },
    {
      icon: MessageSquare,
      title: "24/7 Support",
      description: "Round-the-clock support via chat and email.",
      benefits: ["Live chat", "Help center", "Priority support"],
    },
    {
      icon: Clock,
      title: "99.9% Uptime",
      description:
        "Enterprise-grade reliability with redundant infrastructure.",
      benefits: ["Auto-scaling", "Load balancing", "Disaster recovery"],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-6 px-4 py-1.5 bg-accent/10 text-accent border-accent/20 text-xs">
              <Sparkles className="w-3 h-3 mr-2" />
              Full Platform Features
            </Badge>

            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              Powerful Features for
              <br />
              <span className="text-primary">Modern Hiring</span>
            </h1>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Everything you need to find, assess, and hire top talent. Built
              for speed, designed for scale.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button className="px-8 py-5 text-sm font-bold bg-primary text-black hover:bg-[#FFE44D] rounded-sm">
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started Free
                </Button>
              </Link>
              <Link to="/company/pricing">
                <Button
                  variant="outline"
                  className="px-8 py-5 text-sm font-bold border-white/20 text-white hover:bg-white/5 rounded-sm"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  View Pricing
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Candidate Features */}
      <CategorySection
        badge="For Candidates"
        title="Land Your Dream Job"
        subtitle="Tools to help you stand out and get hired faster"
        features={candidateFeatures}
      />

      {/* Recruiter Features */}
      <CategorySection
        badge="For Recruiters"
        title="Enterprise Hiring Tools"
        subtitle="Powerful features to streamline your recruitment workflow"
        features={recruiterFeatures}
        gradient="bg-card"
      />

      {/* Platform Features */}
      <CategorySection
        badge="Platform"
        title="Built for Enterprise"
        subtitle="Security, reliability, and performance you can trust"
        features={platformFeatures}
      />

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              Ready to <span className="text-primary">Get Started?</span>
            </h2>
            <p className="text-gray-400 mb-10">
              Join thousands of companies using HIRE.OS to build exceptional
              teams
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button className="px-10 py-6 text-sm font-bold bg-primary text-black hover:bg-[#FFE44D] rounded-sm">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/browse">
                <Button
                  variant="outline"
                  className="px-10 py-6 text-sm font-bold border-white/20 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm"
                >
                  Browse Jobs
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
