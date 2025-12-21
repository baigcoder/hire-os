import React from "react";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";
import { Mail, Phone, MapPin, MessageSquare, Send } from "lucide-react";
import { Button } from "../ui/button";

const Contact = () => {
  return (
    <IndustrialPageLayout
      title="Contact Base"
      subtitle="Initiate communication protocol. Direct channels open."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div>
          <div className="space-y-8">
            <div className="p-6 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-sm text-[#FFD700]">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                    Headquarters
                  </h3>
                  <p className="text-gray-400 font-mono text-sm">
                    Level 14, High Tech Plaza
                    <br />
                    Gulberg III, Lahore
                    <br />
                    Pakistan, 54000
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-sm text-[#FFD700]">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                    Direct Line
                  </h3>
                  <p className="text-gray-400 font-mono text-sm mb-1">
                    General: hello@hire.os
                  </p>
                  <p className="text-gray-400 font-mono text-sm">
                    Support: help@hire.os
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-sm text-[#FFD700]">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                    Voice Comms
                  </h3>
                  <p className="text-gray-400 font-mono text-sm">
                    +92 300 1234567
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Mon-Fri, 9am - 6pm PKT
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-[#111111] p-8 border border-white/10 rounded-sm relative">
          <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-[#FFD700]/20 rounded-tr-sm" />
          <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-[#FFD700]/20 rounded-bl-sm" />

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageSquare size={20} className="text-[#FFD700]" />
            SEND TRANSMISSION
          </h3>

          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">
                  First Name
                </label>
                <input
                  type="text"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm p-3 text-white focus:border-[#FFD700] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">
                  Last Name
                </label>
                <input
                  type="text"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm p-3 text-white focus:border-[#FFD700] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">
                Email Address
              </label>
              <input
                type="email"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm p-3 text-white focus:border-[#FFD700] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">
                Subject
              </label>
              <select className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm p-3 text-white focus:border-[#FFD700] focus:outline-none transition-colors">
                <option>General Inquiry</option>
                <option>Support Request</option>
                <option>Partnership Proposal</option>
                <option>Press/Media</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">
                Message
              </label>
              <textarea
                rows="4"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm p-3 text-white focus:border-[#FFD700] focus:outline-none transition-colors"
              ></textarea>
            </div>

            <Button className="w-full bg-[#FFD700] text-black font-bold uppercase tracking-wider hover:bg-[#FFE44D] mt-4 py-6">
              Transmit Message <Send size={16} className="ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </IndustrialPageLayout>
  );
};

export default Contact;
