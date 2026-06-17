import React from 'react';
import { useSEO } from '../../hooks/useSEO';
import { FileText } from 'lucide-react';

export const TermsOfService = () => {
  useSEO({
    title: 'Terms of Service | Nine Dashboard',
    description: 'Terms of Service for Nine Agency and Poppo Live.'
  });

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <FileText size={14} />
            Legal Documentation
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Service</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            Please read these terms carefully before using our services.
          </p>
        </div>

        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.1)] prose prose-invert max-w-none">
          <p className="text-[#A09E9A] text-sm mb-8 italic">Last Updated: June 2026</p>
          
          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">1. Introduction</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            Welcome to Nine Agency. By accessing our platform or registering as an agent/host, you agree to be bound by these Terms of Service and our official platform policies. We operate as an independent recruitment agency for Poppo Live.
          </p>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">2. Independent Entity Status</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            Nine Agency is an independent recruitment and management entity. We are not legally integrated with Poppo Live's corporate ownership. We provide management, training, and recruitment services. Technical issues regarding the Poppo app must be directed to official customer service.
          </p>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">3. User Obligations</h2>
          <ul className="list-disc list-inside text-[#A09E9A] leading-relaxed space-y-2 mb-8">
            <li>You must provide accurate information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree to comply with all streaming guidelines and community standards.</li>
            <li>Fraudulent activity, including false data reporting, will result in immediate termination.</li>
          </ul>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">4. Payment and Commissions</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            Commissions and base salaries are calculated based on performance metrics tracked by the official Poppo Live application. Nine Agency distributes bonuses and tier pay according to our internal matrix, which is subject to change. Payment schedules are strictly enforced and require timely data submission.
          </p>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">5. Limitation of Liability</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            Nine Agency shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services or the Poppo Live platform.
          </p>
        </div>
      </div>
    </div>
  );
};
