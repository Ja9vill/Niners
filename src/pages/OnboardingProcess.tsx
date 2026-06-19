import React from 'react';
import { ShieldCheck, Image as ImageIcon, UserCircle, MessageCircle, Users, Music, AlertTriangle } from 'lucide-react';

export const OnboardingProcess = () => {
  return (
    <div className="w-full min-h-screen bg-transparent text-[#F0EFE8] flex flex-col items-center px-4 py-20 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#D4AF37] uppercase">On Boarding Process</h1>
          <p className="text-[#A09E9A] text-lg max-w-2xl mx-auto">
            Once you are accepted to the management, here are the next steps to move forward.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          
          <div className="glass-card flex items-start gap-4 p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="text-[#D4AF37]" size={24} />
            </div>
            <div>
              <p className="text-[#F0EFE8] text-sm sm:text-base leading-relaxed">
                Join the Agency <strong>19381364</strong> and post a screenshot after you finish the agency registration.
              </p>
            </div>
          </div>

          <div className="glass-card flex items-start gap-4 p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <ImageIcon className="text-[#A09E9A]" size={24} />
            </div>
            <div>
              <p className="text-[#F0EFE8] text-sm sm:text-base leading-relaxed">
                Provide a decent photo for your official Live cover photo. Please include your Poppo ID and your preferred display name for your nametag.
              </p>
            </div>
          </div>

          <div className="glass-card flex items-start gap-4 p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <UserCircle className="text-[#A09E9A]" size={24} />
            </div>
            <div>
              <p className="text-[#F0EFE8] text-sm sm:text-base leading-relaxed">
                Upload the Avatar on your Poppo account and wear the official nametag. Do not upload it for your live cover photo as we do it for you from the backend.
              </p>
            </div>
          </div>

          <div className="glass-card flex items-start gap-4 p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <MessageCircle className="text-indigo-400" size={24} />
            </div>
            <div>
              <p className="text-[#F0EFE8] text-sm sm:text-base leading-relaxed">
                You will be added to the talents GC, before you respond to the welcome message please set your nickname.
              </p>
            </div>
          </div>

          <div className="glass-card flex items-start gap-4 p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Users className="text-[#A09E9A]" size={24} />
            </div>
            <div>
              <p className="text-[#F0EFE8] text-sm sm:text-base leading-relaxed">
                The roster list or agency directory will be posted on the talents GC, please follow as many members as you can if not all active members.
              </p>
            </div>
          </div>

          <div className="glass-card flex items-start gap-4 p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0">
              <Music className="text-pink-400" size={24} />
            </div>
            <div>
              <p className="text-[#F0EFE8] text-sm sm:text-base leading-relaxed">
                A policy compliance orientation is required, if you have not done it yet it will be scheduled later. During the orientation, please prepare 3 songs to perform.
              </p>
            </div>
          </div>

          <div className="glass-card flex items-start gap-4 p-6 rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/5 to-transparent backdrop-blur-2xl transition-all">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-[#D4AF37]" size={24} />
            </div>
            <div>
              <p className="text-[#F0EFE8] text-sm sm:text-base leading-relaxed">
                You are under probation on your first week. Please start complying on the agency tasks. A dedicated Manager will be assigned to handle you and support your growth.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
