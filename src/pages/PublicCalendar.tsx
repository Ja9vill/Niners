import React from 'react';
import { CalendarTab } from '../components/CalendarTab';
import { Calendar } from 'lucide-react';

export const PublicCalendar = () => {
  return (
    <div className="w-full flex flex-col items-center min-h-[80dvh] pt-6 md:pt-10 pb-16 px-4 relative overflow-hidden bg-[#0A0A0F]">
      {/* Background ambient effects */}
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-screen-xl w-full mx-auto relative z-10 flex flex-col">


        {/* Render the shared CalendarTab in read-only mode */}
        <div className="w-full rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-[#11111A]">
          <CalendarTab isReadOnly={true} />
        </div>
      </div>
    </div>
  );
};
