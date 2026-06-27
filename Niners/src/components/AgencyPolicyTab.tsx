import React from 'react';
import { ShieldCheck, Calendar, BookOpen, Award, Users, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export const AgencyPolicyTab = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Policy Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-950/60 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <BookOpen size={200} className="text-indigo-400" />
        </div>
        
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400">
            <BookOpen size={12} />
            Agency Guidelines
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Agency Policy</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/40 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-400" />
              Effective date: May 21, 2026
            </span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-cyan-400" />
              Application: NINE Talent Management Hosts
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-6">
        
        {/* Section 1: Overview */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <FileText size={18} className="text-indigo-400" />
            1. Overview & Exclusivity
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            NINE Talent Management provides administrative support, growth strategy, and performance incentives for signed hosts. By joining NINE Agency, you agree to exclusive representation regarding all Poppo Live operations and related live-streaming activities unless explicitly authorized in writing.
          </p>
        </div>

        {/* Section 2: Stream Consistency Requirements */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <Award size={18} className="text-cyan-400" />
            2. Stream Consistency & Hours
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans mb-3">
            To remain active on the agency roster and qualify for commission overrides or platform bonuses, hosts must meet the following minimum targets:
          </p>
          <ul className="space-y-3 pl-1">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Active Days</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">Minimum of 15 active days per month. A day is registered as active when a host streams for at least 1 continuous hour.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Monthly Stream Duration</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">Minimum of 40 total live streaming hours completed in each calendar month.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white/90">Broadcasting Standards</span>
                <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">All streams must have a clear visual presence, proper lighting, clean audio, and interactive communication with active viewers.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Section 3: Code of Conduct */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <ShieldCheck size={18} className="text-emerald-400" />
            3. Platform Compliance & Conduct
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Hosts represent NINE Talent Management during all public broadcasts. Violations of Poppo Live guidelines or local regulations (including but not limited to harassment, inappropriate content, or platform manipulation) will result in immediate review and potential suspension or release from the agency roster.
          </p>
        </div>

        {/* Section 4: Data Reporting Obligations */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <CheckCircle2 size={18} className="text-amber-400" />
            4. Data Reporting & Auditing
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Hosts and management must ensure data integrity. Weekly performance logs, random PK outcomes, and fanbase updates must be reported through the NINE Dashboard before the specified weekly deadlines. Falsification of records or failure to report results will lead to a review of the host's active commission tiers.
          </p>
        </div>

        {/* Section 5: Review & Grievances */}
        <div className="glass-card space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-3 border-b border-white/5 pb-3">
            <AlertCircle size={18} className="text-rose-400" />
            5. Roster Release & Disputes
          </h3>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
            Roster assignments, position updates, and commission overrides are decided by the Agency Director. A host may request release from the agency by submitting a written notice at least 15 days in advance, subject to final approval by NINE management.
          </p>
        </div>

      </div>
    </div>
  );
};
