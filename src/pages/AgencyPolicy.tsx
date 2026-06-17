import React from 'react';
import { ShieldCheck, BookOpen, Heart, Users, LogOut, Video, ClipboardList, AlertTriangle, BarChart } from 'lucide-react';

export const AgencyPolicy = () => {
  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-8 animate-fadeIn z-10">
        {/* Policy Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/10 via-[#13131E]/80 to-[#1A1A28]/80 p-8 sm:p-10 shadow-[0_8px_32px_rgba(212,175,55,0.15)] backdrop-blur-2xl text-center">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <BookOpen size={200} className="text-[#D4AF37]" />
          </div>
          
          <div className="relative space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
              <ShieldCheck size={14} />
              Nine Talent Management
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">Official Policy</h1>
            <p className="text-[#A09E9A] italic text-lg tracking-wide font-serif">Cultivating excellence, not dependency.</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          
          {/* Section: Philosophy */}
          <div className="glass-card space-y-6 p-6 sm:p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl">
            <h3 className="font-black text-xl text-[#D4AF37] flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-wider">
              <Heart size={20} />
              Agency Philosophy: Kindness & Unity
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm uppercase tracking-widest">Kindness</h4>
                <ul className="space-y-3 text-sm text-[#A09E9A] leading-relaxed list-disc list-inside">
                  <li>Uphold kindness in all interactions.</li>
                  <li><strong className="text-white">Zero Tolerance:</strong> Do not engage with unwanted/unkind comments; remove them immediately.</li>
                  <li>Do not respond to unprofessional behavior. Report dummy accounts to management or a Founder/Director.</li>
                  <li>Scandalous or unprofessional behavior in public spaces is strictly prohibited.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm uppercase tracking-widest">Unity</h4>
                <ul className="space-y-3 text-sm text-[#A09E9A] leading-relaxed list-disc list-inside">
                  <li>Support is reciprocal. To receive support from the agency, you must complete tasks.</li>
                  <li>To receive teammate support, you must attend their streams/events.</li>
                  <li>Direct contact with the Founder/Director is available for agency support.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section: Actions Requiring Approval */}
          <div className="glass-card space-y-4 p-6 sm:p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl">
            <h3 className="font-black text-xl text-[#D4AF37] flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-wider">
              <AlertTriangle size={20} />
              Actions Requiring Director's Approval
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3 text-sm text-[#A09E9A]">
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Changing Live cover photos</li>
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Participating in external events</li>
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Absences exceeding 3 days</li>
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Canceling a scheduled Livehouse event</li>
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Quitting or transferring from the agency</li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Livestream Standards */}
            <div className="glass-card space-y-4 p-6 sm:p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl">
              <h3 className="font-black text-xl text-[#D4AF37] flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-wider">
                <Video size={20} />
                Livestream Standards
              </h3>
              <ul className="space-y-3 text-sm text-[#A09E9A] leading-relaxed">
                <li className="flex items-start gap-3"><span className="text-[#D4AF37] font-black mt-0.5">•</span> Professional Background & Setup.</li>
                <li className="flex items-start gap-3"><span className="text-[#D4AF37] font-black mt-0.5">•</span> Tidy and presentable wardrobe.</li>
                <li className="flex items-start gap-3"><span className="text-[#D4AF37] font-black mt-0.5">•</span> Makeup is a MUST for female hosts.</li>
              </ul>
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs italic text-center">
                Your livestream will be terminated and reported to the admins if standards are not met.
              </div>
            </div>

            {/* Management Tasks */}
            <div className="glass-card space-y-4 p-6 sm:p-8 rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/5 to-transparent backdrop-blur-2xl">
              <h3 className="font-black text-xl text-[#D4AF37] flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-wider">
                <ClipboardList size={20} />
                Management Tasks
              </h3>
              <p className="text-xs text-white/70"><strong>Agency Task:</strong> Mandatory for all hosts.<br/><strong>Agent Task:</strong> Customized based on performance growth.</p>
              
              <div className="bg-black/30 p-4 rounded-xl border border-[#D4AF37]/30 mt-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2 text-center">Current Agency Task</h4>
                <ul className="space-y-2 text-xs text-white">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white" /> 1 hour of random PK per stream</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white" /> Maintain 500 Fanclub members</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white" /> 8 min Friendly PK with co-niners</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section: Data Reporting (NEW) */}
          <div className="glass-card space-y-4 p-6 sm:p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl">
            <h3 className="font-black text-xl text-[#D4AF37] flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-wider">
              <BarChart size={20} />
              Weekly Data Reporting
            </h3>
            <p className="text-sm text-white/80 leading-relaxed font-sans mb-3">
              All hosts are required to submit weekly reports of their streaming data from Poppo.
            </p>
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <h4 className="font-bold text-indigo-300 text-xs uppercase tracking-widest mb-2">Why is this required?</h4>
              <p className="text-sm text-[#A09E9A] leading-relaxed">
                Consistent data reporting allows management to accurately track your performance, determine appropriate tier pay progression, and monitor the completion of required agency tasks (such as streaming duration requirements and random PK completions). This data is essential for providing you with targeted support and rewards.
              </p>
            </div>
          </div>

          {/* Section: Release Policy */}
          <div className="glass-card space-y-4 p-6 sm:p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl">
            <h3 className="font-black text-xl text-[#D4AF37] flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-wider">
              <LogOut size={20} />
              Release Policy
            </h3>
            <p className="text-sm text-[#A09E9A] leading-relaxed italic mb-4">
              We do not enforce a strict no-release policy. However, adherence to agency rules is essential.
            </p>
            
            <div className="space-y-4 text-sm text-white/80">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <h4 className="font-bold text-[#D4AF37] mb-2 uppercase tracking-wide">Releasing Period</h4>
                <p>1 month release processing time per agency submitted application or role achieved.</p>
                <p className="text-xs text-white/50 mt-1">Example: Base Salary Policy (1 mo) + Regular Livehouse (1 mo) + Policy Upgrade (1 mo)</p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <h4 className="font-bold text-[#D4AF37] mb-2 uppercase tracking-wide">Steps for Release</h4>
                <ul className="space-y-2 list-decimal list-inside text-[#A09E9A]">
                  <li>Reach out to the Founder/Director and provide a valid reason. Once permitted, apply to quit from the agency.</li>
                  <li>Your first application will be rejected (as protocol) and gets approval on your next quit application.</li>
                  <li>Remove agency nametag and live cover photo.</li>
                </ul>
                <p className="mt-3 text-red-400 text-xs font-bold uppercase tracking-wider text-center border-t border-white/10 pt-3">
                  Nametags are unequivocally exclusive. Sharing them is strictly prohibited.
                </p>
              </div>
            </div>
          </div>

          {/* Support Policy */}
          <div className="text-center p-8">
            <h4 className="text-xl font-black text-white uppercase tracking-wider mb-2">Support Policy</h4>
            <p className="text-[#A09E9A] max-w-2xl mx-auto italic">
              We do not promise any gift support. We don't build dependencies, we create host effectiveness.
            </p>
            <p className="mt-8 text-[10px] text-white/30 uppercase tracking-widest">
              We reserve the right to changes of policy. Continued participation confirms acceptance.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
