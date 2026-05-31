import React from 'react';
import { CalendarTab } from '../components/CalendarTab';
import { Calendar } from 'lucide-react';

export const PublicCalendar = () => {
  return (
    <div className="w-full flex flex-col items-center min-h-[80dvh] pt-24 pb-16 px-4 relative overflow-hidden bg-[#0A0A0F]">
      {/* Background ambient effects */}
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-screen-xl w-full mx-auto relative z-10 flex flex-col">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mx-auto">
            <Calendar size={14} className="text-[#D4AF37]" />
            <span>Upcoming Events</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#F0EFE8] to-[#A09E9A] tracking-tighter">
            Agency Calendar
          </h1>
          <p className="text-[#A09E9A] max-w-xl mx-auto text-lg leading-relaxed">
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
