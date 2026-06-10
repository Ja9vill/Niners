import React from 'react';
import { useSEO } from '../../hooks/useSEO';
import { Shield } from 'lucide-react';

export const PrivacyPolicy = () => {
  useSEO({
    title: 'Privacy Policy | Nine Dashboard',
    description: 'Privacy Policy for Nine Agency and our data collection practices.'
  });

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <Shield size={14} />
            Data Protection
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Policy</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            How we collect, use, and protect your information.
          </p>
        </div>

        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.1)] prose prose-invert max-w-none">
          <p className="text-[#A09E9A] text-sm mb-8 italic">Last Updated: June 2026</p>
          
          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">1. Information We Collect</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            When you register with Nine Agency, we collect certain personal information to facilitate your agency management and payroll. This includes your Name, Poppo ID, Email Address, and performance data submitted through our reporting tools.
          </p>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">2. How We Use Your Data</h2>
          <ul className="list-disc list-inside text-[#A09E9A] leading-relaxed space-y-2 mb-8">
            <li>To calculate base salaries, tier pay, and commission bonuses.</li>
            <li>To provide personalized management and guidance.</li>
            <li>To track your progress and fan club growth over time.</li>
            <li>To communicate important agency updates and events.</li>
          </ul>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">3. Data Sharing and Disclosure</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            We do not sell your personal data to third parties. We may share aggregate, non-identifying performance data with Poppo Live official administrators for event planning or tier evaluations.
          </p>

          <h2 className="text-[#D4AF37] text-2xl font-black uppercase tracking-wider mb-4 border-b border-[#D4AF37]/20 pb-2">4. Data Security</h2>
          <p className="text-[#A09E9A] leading-relaxed mb-8">
            We implement robust security measures, including role-based access control (RBAC) and Firebase security rules, to ensure that your financial data and personal information are only accessible to authorized management personnel (Directors, Head Admins, and your specific Manager).
          </p>
        </div>
      </div>
    </div>
  );
};
