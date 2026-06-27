import React from 'react';
import { RosterTab } from '../components/RosterTab';
import { Trophy } from 'lucide-react';

export const PublicRoster = () => {
  return (
    <div className="w-full flex flex-col items-center min-h-[80dvh] pt-6 md:pt-10 pb-16 px-4 relative overflow-hidden bg-[#0A0A0F]">
      {/* Ambient background effects */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1600px] w-full mx-auto relative z-10 flex flex-col">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6 flex flex-col items-center">
          <h1 className="relative overflow-hidden rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-lg backdrop-blur-sm bg-gradient-to-br border border-white/5 from-amber-500/20 to-orange-500/5 mx-auto">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border bg-[#D4AF37]/10 border-[#D4AF37]/20">
              <Trophy size={20} className="text-[#D4AF37]" />
            </div>
            <span className="text-lg md:text-xl font-black uppercase tracking-widest text-[#D4AF37] drop-shadow-md z-10 pr-2">
              Official Roster
            </span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto text-sm md:text-base leading-relaxed hidden sm:block mt-3">
            Discover the incredible talent that powers Nine Agency. Our top-performing hosts consistently dominate the leaderboards and deliver premium entertainment.
          </p>
        </div>

        {/* Profiles Grid */}
        <div className="w-full">
          <RosterTab isReadOnly={true} />
        </div>
      </div>
    </div>
  );
};
