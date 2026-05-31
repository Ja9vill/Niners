import React from 'react';
import { RosterTab } from '../components/RosterTab';
import { Trophy } from 'lucide-react';

export const PublicRoster = () => {
  return (
    <div className="w-full flex flex-col items-center min-h-[80dvh] pt-24 pb-16 px-4 relative overflow-hidden bg-[#0A0A0F]">
      {/* Ambient background effects */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1600px] w-full mx-auto relative z-10 flex flex-col">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mx-auto">
            <Trophy size={14} />
            <span>Elite Broadcasters</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#F0EFE8] to-[#A09E9A] tracking-tighter">
            Agency Roster
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto text-lg leading-relaxed">
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
