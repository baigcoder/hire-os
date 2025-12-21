import React from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Twitter,
  Github,
  Facebook,
} from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: "Find Jobs", path: "/jobs" },
      { label: "Browse Companies", path: "/browse" },
      { label: "Post a Job", path: "/admin/jobs" },
      { label: "Pricing", path: "/company/pricing" },
    ],
    company: [
      { label: "About Us", path: "/about" },
      { label: "Careers", path: "/careers" },
      { label: "Press", path: "/press" },
      { label: "Contact", path: "/contact" },
    ],
    resources: [
      { label: "Help Center", path: "/help" },
      { label: "Resume Builder", path: "/resume" },
      { label: "Salary Guide", path: "/salary" },
      { label: "Interview Tips", path: "/tips" },
    ],
    legal: [
      { label: "Privacy", path: "/privacy" },
      { label: "Terms", path: "/terms" },
      { label: "Cookies", path: "/cookies" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Github, href: "https://github.com", label: "GitHub" },
  ];

  return (
    <footer className="bg-[#0A0A0A] border-t border-white/5 pt-16 pb-8 font-['Space_Grotesk',sans-serif]">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-6 group">
              <div className="w-9 h-9 rounded-md bg-[#FFD700] flex items-center justify-center text-black font-black text-sm tracking-tighter shadow-[0_0_20px_rgba(255,215,0,0.2)] group-hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all duration-300">
                H.
              </div>
              <span className="text-lg font-bold text-white tracking-tight group-hover:text-[#FFD700] transition-colors">
                HIRE<span className="text-[#FFD700]">.OS</span>
              </span>
            </Link>
            <p className="text-gray-500 leading-relaxed mb-8 max-w-sm text-sm">
              Industrial grade talent acquisition. Precision matching. Real-time
              analytics. The operating system for modern hiring.
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  className="w-9 h-9 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:bg-[#FFD700] hover:text-black hover:border-[#FFD700] transition-all duration-200"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    className="text-gray-500 hover:text-[#FFD700] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    className="text-gray-500 hover:text-[#FFD700] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-500 group">
                <MapPin
                  size={16}
                  className="flex-shrink-0 mt-0.5 text-[#FFD700]/70"
                />
                <span className="text-sm">Lahore, Pakistan</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500 group">
                <Phone size={16} className="flex-shrink-0 text-[#FFD700]/70" />
                <span className="text-sm font-mono">+92 300 1234567</span>
              </li>
              <li className="flex items-center gap-3 text-gray-500 group">
                <Mail size={16} className="flex-shrink-0 text-[#FFD700]/70" />
                <span className="text-sm font-mono">support@hire.os</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs font-mono">
            © {currentYear} HIRE.OS · Industrial Grade Talent Acquisition
          </p>
          <ul className="flex flex-wrap gap-6 text-xs">
            {footerLinks.legal.map((link, idx) => (
              <li key={idx}>
                <Link
                  to={link.path}
                  className="text-gray-600 hover:text-[#FFD700] transition-colors font-mono uppercase tracking-wider"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
