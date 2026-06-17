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


        {/* Profiles Grid */}
        <div className="w-full">
          <RosterTab isReadOnly={true} />
        </div>
      </div>
    </div>
  );
};
