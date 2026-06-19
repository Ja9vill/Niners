import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Trophy, Sparkles, Flame, Facebook, Instagram, ShieldCheck, FileText, FileLock2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PublicLanding = () => {
  return (
    <div className="w-full min-h-screen bg-transparent text-[#F0EFE8] flex flex-col items-center justify-center px-4 py-20 overflow-hidden relative">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#D4AF37]/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto text-center z-10 space-y-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 backdrop-blur-md mb-4">
          <Sparkles size={14} className="text-[#D4AF37]" />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#D4AF37]">Premium Talent Ecosystem</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight">
          NINE <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#F0EFE8] via-[#D4AF37] to-[#A09E9A]">AGENCY</span>
        </h1>
        
        <p className="text-lg md:text-xl text-[#A09E9A] max-w-2xl mx-auto font-medium leading-relaxed">
          The official management ecosystem for top-tier livestreaming talents on Poppo Live. We empower creators to reach global audiences.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link to="/roster" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-br from-[#D4AF37]/80 to-[#A68725]/80 backdrop-blur-xl border border-white/20 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-[0_8px_32px_rgba(212,175,55,0.3)] hover:shadow-[0_8px_32px_rgba(212,175,55,0.5)] hover:scale-105">
            <Trophy size={16} />
            View Top Roster
          </Link>
          <Link to="/poppo-live" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <Flame size={16} className="text-[#D4AF37]" />
            Learn About Poppo
            <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>

      {/* Feature grid */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 z-10 w-full"
      >
        <div className="glass-card p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl hover:bg-white/[0.06] hover:border-white/20 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <Star className="text-white mb-4" size={32} />
          <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Elite Network</h3>
          <p className="text-sm text-[#A09E9A] leading-relaxed">Join a curated network of the highest earning hosts in the ecosystem. Access exclusive networking and collaborations.</p>
        </div>
        <div className="glass-card p-8 rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/10 to-transparent backdrop-blur-2xl hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <Trophy className="text-[#D4AF37] mb-4" size={32} />
          <h3 className="text-lg font-black text-[#D4AF37] mb-2 uppercase tracking-wide">Weekly Rewards</h3>
          <p className="text-sm text-[#A09E9A] leading-relaxed">Top performers receive agency-exclusive bonuses, spotlight features, and custom award badges.</p>
        </div>
        <div className="glass-card p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl hover:bg-white/[0.06] hover:border-white/20 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <Sparkles className="text-white mb-4" size={32} />
          <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">Growth Tools</h3>
          <p className="text-sm text-[#A09E9A] leading-relaxed">Access data-driven insights, livehouse queuing systems, and dedicated talent managers to boost your hours.</p>
        </div>
      </motion.div>

      {/* Footer / Links Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-32 border-t border-white/10 w-full max-w-5xl mx-auto pt-8 pb-4 flex flex-col items-center gap-6 z-10"
      >
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-wider text-[#A09E9A]">
          <Link to="/policy" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"><ShieldCheck size={14} /> Agency Policy</Link>
          <span className="text-white/10">|</span>
          <Link to="#" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"><FileLock2 size={14} /> Privacy Policy</Link>
          <span className="text-white/10">|</span>
          <Link to="/onboarding" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"><FileText size={14} /> Onboarding Process</Link>
        </div>

        <div className="flex items-center gap-6">
          <a href="https://facebook.com/9TalentManagement" target="_blank" rel="noreferrer" className="text-[#A09E9A] hover:text-[#D4AF37] transition-colors flex items-center gap-2">
            <Facebook size={20} />
            <span className="text-xs font-bold tracking-wider">@9TalentManagement</span>
          </a>
          <a href="https://instagram.com/9TalentManagement" target="_blank" rel="noreferrer" className="text-[#A09E9A] hover:text-[#D4AF37] transition-colors flex items-center gap-2">
            <Instagram size={20} />
            <span className="text-xs font-bold tracking-wider">@9TalentManagement</span>
          </a>
        </div>
        
        <p className="text-[10px] text-white/30 tracking-widest uppercase mt-4">
          © {new Date().getFullYear()} Nine Talent Management. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};
