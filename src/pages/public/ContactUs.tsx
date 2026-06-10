import React from 'react';
import { useSEO } from '../../hooks/useSEO';
import { Mail, ShieldAlert, Zap, HelpCircle } from 'lucide-react';

export const ContactUs = () => {
  useSEO({
    title: 'Contact Us | Nine Dashboard',
    description: 'Get in touch with the Nine Agency team for assistance.'
  });

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            Get in Touch
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Contact <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Nine</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            Need help setting up your agency, binding your ID, or maximizing your stream? We are here to help you succeed.
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6 shadow-[0_0_20px_rgba(239,68,68,0.1)] flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0 border border-red-500/30">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-1">Important Notice: We are an Independent Agency</h3>
            <p className="text-[#A09E9A] text-sm leading-relaxed">
              We are an independent recruitment agency and resource hub. <strong className="text-white">We cannot unban accounts, recover lost passwords, or fix in-app bugs.</strong> For account-specific technical issues, please contact the official Customer Service directly within the app.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-8 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <h2 className="text-2xl font-bold text-white mb-2">Send us a Message</h2>
            <p className="text-[#A09E9A] text-sm mb-8">Fill out the form below and our agency support team will get back to you within 24-48 hours.</p>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Your Name</label>
                  <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none transition-colors" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Poppo ID (Optional)</label>
                  <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none transition-colors" placeholder="19157913" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Email Address</label>
                <input type="email" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none transition-colors" placeholder="you@example.com" required />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Message</label>
                <textarea rows={5} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#D4AF37] outline-none transition-colors resize-none" placeholder="How can we help you?" required />
              </div>

              <button className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-bold py-4 rounded-xl transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                Send Message
              </button>
            </form>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-12 h-12 bg-black/40 border border-[#D4AF37]/50 rounded-xl flex items-center justify-center text-[#D4AF37] mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Fast-Track Agency Registration</h3>
              <p className="text-[#A09E9A] text-sm mb-6">Want to start your agency right now? You don't need to wait for an email reply. Just click our automated portal link below.</p>
              <a href="https://invite-poppo.com/6CxF5E" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-full bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-bold py-3 rounded-xl transition-colors">
                Access Agent Portal
              </a>
            </div>

            <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-8 hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-12 h-12 bg-black/40 border border-[#D4AF37]/50 rounded-xl flex items-center justify-center text-[#D4AF37] mb-6">
                <HelpCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Frequently Asked Questions</h3>
              <p className="text-[#A09E9A] text-sm mb-6">90% of questions regarding withdrawals, points, and ID binding are already answered in our comprehensive FAQ section.</p>
              <button className="text-[#D4AF37] hover:text-white font-semibold transition-colors">
                Visit Help Center &rarr;
              </button>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-3xl p-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37] mb-4">Direct Contact</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <Mail className="text-white/40 mt-1" size={20} />
                  <div>
                    <span className="block text-white font-bold">Email Support</span>
                    <span className="block text-[#A09E9A] text-sm">support@9poppo.com</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
