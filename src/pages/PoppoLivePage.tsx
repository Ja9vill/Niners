import React from 'react';
import { Star, ShieldCheck, Lock, FileText, Facebook, Instagram, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import poppoLogo from '../poppo-logo.jpg';
import { PoppoSEOArticle } from '../components/PoppoSEOArticle';

export const PoppoLivePage = () => {
  return (
    <div className="w-full flex flex-col items-center min-h-[100dvh] bg-[#0A0A0F] selection:bg-[#D4AF37]/30">
      
      {/* 1. Hero Section */}
      <section className="relative w-full pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center overflow-hidden border-b border-white/5">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#D4AF37]/10 to-transparent blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center space-y-6">
          <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-[0_0_40px_rgba(212,175,55,0.3)] border-2 border-[#D4AF37]/30">
            <img src={poppoLogo} alt="Poppo Live Logo" className="w-full h-full object-cover" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
            Join <span className="text-[#D4AF37]">Poppo Live</span>
          </h1>
          
          <p className="text-[#A09E9A] text-lg md:text-xl leading-relaxed max-w-2xl">
            Start your broadcasting journey with Nine Talent Management. Download the app to your device and fill out the agency application below to get officially rostered.
          </p>

          <div className="w-full pt-6 flex justify-center">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative w-full max-w-[400px] aspect-square">
              {/* Loading Indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A09E9A] -z-10">
                <div className="w-8 h-8 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Loading...</span>
              </div>
              
              <iframe 
                src="https://static.vshowapi.com/inviteNew/share/?c=poppo&link_id=8521785&user_id=19157913&temp_type=1&sys_temp_id=0" 
                title="Download Poppo Live"
                className="w-full h-full border-none outline-none relative z-10 bg-transparent"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Embedded Application Form Section */}
      <section className="w-full max-w-screen-xl mx-auto px-4 pt-4 pb-24 flex flex-col items-center">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mx-auto">
            <Star size={14} className="text-[#D4AF37]" />
            <span>Official Application</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Become An Agent / Host</h2>
          <p className="text-[#A09E9A]">Complete the form below to link your Poppo account with Nine Talent Management.</p>
        </div>

        {/* Iframe Container with Mobile Scrolling Optimization */}
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative" style={{ minHeight: '800px', WebkitOverflowScrolling: 'touch' }}>
          
          {/* Loading Indicator (shows behind iframe until it loads) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A09E9A] -z-10">
            <div className="w-10 h-10 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Loading Application Form...</span>
          </div>

          <iframe 
            src="https://invite-poppo.com/6CxF5E" 
            title="Poppo Live Application Form"
            className="w-full h-[800px] border-none outline-none relative z-10 bg-transparent"
            loading="lazy"
            allow="camera; microphone"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </section>

      {/* 3. SEO Research Report Section */}
      <PoppoSEOArticle />

      {/* Footer / Links Section */}
      <div className="mt-32 border-t border-white/10 w-full max-w-5xl mx-auto pt-8 pb-32 flex flex-col items-center gap-6 z-10">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-[#F0EFE8] mb-2">
          <Link to="/terms-of-service" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">Terms</Link>
          <span className="text-white/20">|</span>
          <Link to="/privacy-policy" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">Privacy</Link>
          <span className="text-white/20">|</span>
          <Link to="/agency-policy" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">Agency Policy</Link>
          <span className="text-white/20">|</span>
          <Link to="/contact" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">Contact Us</Link>
          <span className="text-white/20">|</span>
          <Link to="/blog" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">Resource Blog</Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-white/80 mb-2">
          <Link to="/guides/login" className="hover:text-[#D4AF37] transition-colors">Login Guide</Link>
          <span className="text-white/20">•</span>
          <Link to="/guides/find-poppo-id" className="hover:text-[#D4AF37] transition-colors">Find ID Guide</Link>
          <span className="text-white/20">•</span>
          <Link to="/guides/withdraw-earnings" className="hover:text-[#D4AF37] transition-colors">Withdrawals</Link>
          <span className="text-white/20">•</span>
          <Link to="/guides/how-pk-battles-work" className="hover:text-[#D4AF37] transition-colors">PK Battles</Link>
          <span className="text-white/20">•</span>
          <Link to="/guides/how-to-register-agent" className="hover:text-[#D4AF37] transition-colors">Agent Registration</Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-4">
          <Link to="/region/usa" className="hover:text-white transition-colors">USA</Link>
          <Link to="/region/india" className="hover:text-white transition-colors">India</Link>
          <Link to="/region/indonesia" className="hover:text-white transition-colors">Indonesia</Link>
          <Link to="/region/philippines" className="hover:text-white transition-colors">Philippines</Link>
          <Link to="/region/malaysia" className="hover:text-white transition-colors">Malaysia</Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="https://www.facebook.com/share/1Bxc59ksHM/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="text-[#F0EFE8] hover:text-[#D4AF37] transition-colors flex items-center gap-2">
            <Facebook size={20} />
            <span className="text-xs font-bold tracking-wider">Facebook</span>
          </a>
          <a href="https://instagram.com/9TalentManagement" target="_blank" rel="noreferrer" className="text-[#F0EFE8] hover:text-[#D4AF37] transition-colors flex items-center gap-2">
            <Instagram size={20} />
            <span className="text-xs font-bold tracking-wider">@9TalentManagement</span>
          </a>
          <a href="https://wa.me/message/5Y6QFQXSIEZRI1" target="_blank" rel="noreferrer" className="text-[#F0EFE8] hover:text-[#D4AF37] transition-colors flex items-center gap-2">
            <MessageCircle size={20} />
            <span className="text-xs font-bold tracking-wider">Whatsapp +639558416320</span>
          </a>
        </div>
        
        <p className="text-[10px] text-white/30 tracking-widest uppercase mt-4">
          © {new Date().getFullYear()} Nine Talent Management. All rights reserved.
        </p>
      </div>

    </div>
  );
};
