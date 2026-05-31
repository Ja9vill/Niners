import React from 'react';
import { ArrowRight, Star, Users, ShieldCheck, Download, ExternalLink, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

const MOCK_TOP_PERFORMERS: any[] = [];

export const LandingPage = () => {
  return (
    <div className="w-full flex flex-col items-center">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[85dvh] flex items-center justify-center px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[#0A0A0F]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0F] to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-screen-xl mx-auto flex flex-col items-center text-center space-y-8 pt-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
            <Star size={14} className="fill-[#D4AF37]" />
            <span>Premium Talent Agency</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#F0EFE8] via-[#F0EFE8] to-[#A09E9A] tracking-tighter leading-[1.1]">
            Scale Your <br className="hidden md:block" />
            <span className="text-[#D4AF37]">Broadcasting</span> Career.
          </h1>
          
          <p className="max-w-2xl text-lg md:text-xl text-[#A09E9A] font-medium leading-relaxed">
            Nine Talent Management is dedicated to empowering high-performance creators. 
            We provide the tools, strategy, and community you need to dominate the livestreaming landscape.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
            <a 
              href="/poppo-live"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#D4AF37] text-black font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2"
            >
              Join the Roster <ArrowRight size={18} />
            </a>
            <a 
              href="/poppo-live"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Download App <Download size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* 2. AGENCY PHILOSOPHY */}
      <section className="w-full py-24 bg-[#11111A] border-y border-white/5 px-4 relative z-10">
        <div className="max-w-screen-xl mx-auto flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl font-black text-white text-center tracking-tight mb-4">Our Core Pillars</h2>
          <p className="text-[#A09E9A] text-center max-w-xl mb-16">The foundation of our agency's identity and operational philosophy.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="p-8 rounded-3xl bg-[#0A0A0F] border border-white/5 hover:border-[#D4AF37]/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Star className="text-[#D4AF37]" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Kindness</h3>
              <p className="text-[#A09E9A] leading-relaxed text-sm">
                We believe in fostering a supportive, empathetic environment. Success is built on mutual respect and uplifting one another in every interaction.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-[#0A0A0F] border border-white/5 hover:border-[#D4AF37]/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="text-[#D4AF37]" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Unity</h3>
              <p className="text-[#A09E9A] leading-relaxed text-sm">
                A strong community outpaces isolated talent. We operate as a unified front, sharing strategies and celebrating collective victories.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-[#0A0A0F] border border-white/5 hover:border-[#D4AF37]/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="text-[#D4AF37]" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Self-Sustaining Excellence</h3>
              <p className="text-[#A09E9A] leading-relaxed text-sm">
                We empower our hosts and agents with the autonomy and tools to generate consistent, long-term growth without micromanagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TOP PERFORMERS */}
      <section className="w-full py-24 bg-[#0A0A0F] border-b border-white/5 px-4 relative z-10" id="leaderboards">
        <div className="max-w-screen-xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-6">
            <Trophy size={14} className="text-[#D4AF37]" />
            <span>Hall of Fame</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white text-center tracking-tight mb-4">Top Performers</h2>
          <p className="text-[#A09E9A] text-center max-w-xl mb-16">Recognizing our agency's highest-achieving broadcasters of the month.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full">
            {MOCK_TOP_PERFORMERS.map((host) => (
              <div key={host.id} className="group relative flex flex-col items-center p-8 rounded-3xl bg-[#11111A] border border-white/5 hover:border-[#D4AF37]/40 transition-all hover:-translate-y-2 shadow-xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="w-24 h-24 rounded-full border-2 border-[#D4AF37]/30 mb-6 overflow-hidden relative group-hover:border-[#D4AF37] transition-colors shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                  <img src={host.avatar} alt={host.nickname} className="w-full h-full object-cover" />
                </div>
                
                <h3 className="text-xl font-black text-[#F0EFE8] mb-1">{host.nickname}</h3>
                <p className="text-xs text-[#A09E9A] font-mono mb-6">ID: {host.id}</p>
                
                <div className="w-full pt-6 border-t border-white/5 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{host.metric}</span>
                  <span className="text-2xl font-black text-white">{host.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CONVERSION MODULES */}
      <section className="w-full py-24 px-4 bg-[#0A0A0F] relative z-10" id="become-an-agent">
        <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row gap-12 items-start">
          
          {/* Become an Agent Embed */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">Become an Agent</h2>
              <p className="text-[#A09E9A]">Register directly through our secure Poppo integration portal below.</p>
            </div>
            
            <div 
              className="w-full bg-[#11111A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative overflow-y-auto"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 z-10" />
              <iframe 
                src="https://invite-poppo.com/6CxF5E" 
                title="Become a Nine Agent"
                className="w-full h-[600px] border-none bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
            
            {/* Fallback Button for Sandboxed Mobile Browsers */}
            <div className="mt-6 flex flex-col items-center bg-[#11111A] p-6 rounded-2xl border border-white/5">
              <p className="text-sm text-[#A09E9A] mb-4 text-center">If the portal above does not load correctly on your device, use the direct link.</p>
              <a 
                href="https://invite-poppo.com/6CxF5E" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full md:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                Open Direct Registration <ExternalLink size={18} />
              </a>
            </div>
          </div>

          {/* Download App & Invitation ID */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 sticky top-24" id="download-app">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 shadow-[0_0_40px_rgba(212,175,55,0.1)]">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center mb-6">
                <Download className="text-[#D4AF37]" size={32} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Download Poppo Live</h3>
              <p className="text-[#A09E9A] mb-8 text-sm">Get the app and bind to our agency to start broadcasting and earning immediately.</p>
              
              <div className="bg-[#0A0A0F]/50 p-4 rounded-xl border border-white/10 mb-6">
                <p className="text-[10px] text-[#A09E9A] uppercase tracking-widest font-bold mb-1">Our Agency ID</p>
                <div className="text-3xl font-mono font-black text-[#D4AF37] tracking-wider">19157913</div>
              </div>
              
              <a 
                href="https://invite-poppo.com/xX4Dh8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xl"
              >
                Download App
              </a>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
