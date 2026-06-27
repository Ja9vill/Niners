import React from 'react';
import { CalendarTab } from '../components/CalendarTab';
import { Calendar } from 'lucide-react';

export const PublicCalendar = () => {
  return (
    <div className="w-full flex flex-col items-center min-h-[80dvh] pt-6 md:pt-10 pb-16 px-4 relative overflow-hidden bg-[#0A0A0F]">
      {/* Background ambient effects */}
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-screen-xl w-full mx-auto relative z-10 flex flex-col">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6 flex flex-col items-center">
          <h1 className="relative overflow-hidden rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-lg backdrop-blur-sm bg-gradient-to-br border border-white/5 from-amber-500/20 to-orange-500/5 mx-auto">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border bg-[#D4AF37]/10 border-[#D4AF37]/20">
              <Calendar size={20} className="text-[#D4AF37]" />
            </div>
            <span className="text-lg md:text-xl font-black uppercase tracking-widest text-[#D4AF37] drop-shadow-md z-10 pr-2">
              Agency Calendar
            </span>
          </h1>
          <p className="text-[#A09E9A] max-w-xl mx-auto text-sm md:text-base leading-relaxed hidden sm:block mt-3">
            Stay updated with our latest PK battles, exclusive training sessions, and official agency events.
          </p>
        </div>

        {/* Render the shared CalendarTab in read-only mode */}
        <div className="w-full rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-[#11111A]">
          <CalendarTab isReadOnly={true} />
        </div>
      </div>
    </div>
  );
};
