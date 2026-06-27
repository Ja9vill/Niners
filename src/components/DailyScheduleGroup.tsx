import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { getLocalTimezoneAbbreviation, formatLocalTime } from '../lib/timezoneUtils';
import { EVENT_COLORS } from '../lib/constants';
import { LivehouseSlot } from '../types/livehouse';

interface DailyScheduleGroupProps {
  selectedDate: Date;
  events: any[];
  onAddEvent?: () => void;
  isReadOnly?: boolean;
  showSlotAvailability?: boolean;
  slotData?: any[];
  localTimezoneMode?: boolean;
  allUsers?: any[];
  onOpenBookingModal?: (date: string, timeslot: string) => void;
  onOpenSpotlight?: (user: any, timeslot: string, date: string) => void;
}

const LivehouseSlotButton = ({ slot, timeslotStr, activeDateStr, dataLength, allUsers, onOpenBookingModal, onOpenSpotlight }: { slot: LivehouseSlot, timeslotStr: string, activeDateStr: string, dataLength: number, allUsers: any[], onOpenBookingModal: (date: string, time: string) => void, onOpenSpotlight?: (user: any, time: string, date: string) => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  if (dataLength === 0 || slot.available) {
    return (
      <div
        onClick={() => onOpenBookingModal(activeDateStr, timeslotStr)}
        className="w-[95%] mr-auto py-1.5 sm:py-2 flex items-center justify-center rounded-full border border-[#008F39] bg-[#031508]/80 hover:bg-[#031508] backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(0,255,136,0.1)] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:scale-105"
      >
        <span className="text-[#00FF88] font-bold text-[10px] sm:text-xs uppercase tracking-wider truncate">AVAILABLE</span>
      </div>
    );
  }

  const rawId = slot.poppo_id?.trim();
  if (!rawId) {
    return (
      <div className="w-[95%] mr-auto py-1.5 sm:py-2 flex items-center justify-center rounded-full border border-white/10 bg-transparent">
        <span className="text-white/40 font-bold text-[10px] sm:text-xs uppercase tracking-wider truncate">CLOSED</span>
      </div>
    );
  }

  const matchedUser = allUsers.find(u => String(u.poppo_id || u.poppoId || u.id).trim() === rawId);

  if (matchedUser) {
    return (
      <div
        onClick={() => onOpenSpotlight && onOpenSpotlight(matchedUser, timeslotStr, activeDateStr)}
        className="cursor-pointer w-[95%] mr-auto py-1.5 sm:py-2 flex items-center justify-center rounded-full border border-[#FFD700]/50 bg-gradient-to-br from-[#1a1208]/95 to-[#0a0806]/95 shadow-[0_0_15px_rgba(255,140,0,0.3),inset_0_0_10px_rgba(212,175,55,0.2)] backdrop-blur-xl hover:border-[#FFD700]/80 hover:shadow-[0_0_30px_rgba(255,140,0,0.6),inset_0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 hover:scale-105"
      >
        <span className="text-[#FFD700] font-black text-xs sm:text-sm uppercase tracking-widest truncate drop-shadow-[0_0_5px_rgba(255,215,0,0.5)] px-1">
          {matchedUser.nickname || matchedUser.name || 'VERIFIED USER'}
        </span>
      </div>
    );
  } else {
    return (
      <div
        className="w-[95%] mr-auto relative h-[28px] sm:h-[32px] cursor-pointer group"
        ref={el => { if (el) el.style.perspective = '1000px'; }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className="w-full h-full relative transition-all duration-500 group-hover:scale-105"
          ref={el => { if (el) { el.style.transformStyle = 'preserve-3d'; el.style.transform = isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'; } }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.1)] group-hover:border-rose-400 group-hover:bg-rose-500/20 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all duration-300"
            ref={el => { if (el) { (el.style as any).backfaceVisibility = 'hidden'; } }}
          >
            <span className="text-rose-400 font-bold text-[10px] sm:text-xs uppercase tracking-wider truncate">BOOKED</span>
          </div>

          <div
            className="absolute inset-0 flex items-center justify-center rounded-full border border-rose-500 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            ref={el => { if (el) { (el.style as any).backfaceVisibility = 'hidden'; el.style.transform = 'rotateX(180deg)'; } }}
          >
            <span className="text-rose-100 font-black text-[12px] sm:text-[15px] uppercase tracking-wider drop-shadow-md truncate px-1">{rawId}</span>
          </div>
        </div>
      </div>
    );
  }
};

export const DailyScheduleGroup: React.FC<DailyScheduleGroupProps> = ({
  selectedDate,
  events,
  onAddEvent,
  isReadOnly = false,
  showSlotAvailability = false,
  slotData = [],
  localTimezoneMode = true,
  allUsers = [],
  onOpenBookingModal,
  onOpenSpotlight
}) => {
  const localTzAbbr = getLocalTimezoneAbbreviation();
  const selectedDayEvents = events.filter(event => {
    const eventDate = event.date || event.event_date;
    return eventDate === format(selectedDate, 'yyyy-MM-dd');
  });

  return (
    <div className="space-y-4">
      {/* Selected Date Header Banner */}
      <div className="mb-4 sticky top-0 z-10 flex flex-col gap-1">
        <div className="flex items-center justify-center bg-gradient-to-r from-[#0a0806]/95 via-[#1a1208]/95 to-[#0a0806]/95 backdrop-blur-xl py-3 rounded-2xl border border-[#D4AF37]/30 shadow-[0_5px_15px_rgba(0,0,0,0.6),inset_0_0_15px_rgba(212,175,55,0.05)]">
          <div className="text-xs sm:text-[13px] font-black tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] via-[#D4AF37] to-[#FF8C00] text-center px-4">
            {(() => {
              if (localTimezoneMode) {
                return `${format(selectedDate, 'MMMM dd, yyyy')} | ${localTzAbbr}`;
              }
              return `${format(selectedDate, 'MMMM dd, yyyy')} | UTC+8 Manila, PH`;
            })()}
          </div>
        </div>
      </div>

      {/* Scheduled Events Panel */}
      <div className="bg-gradient-to-br from-[#0F1117] to-[#12141A] rounded-3xl border border-[#D4AF37]/40 p-5 space-y-4 shadow-[0_0_15px_rgba(212,175,55,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D4AF37]/20 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white/90">
              Scheduled Events
            </h3>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-[#D4AF37]/25 p-5 space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.05)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 via-transparent to-orange-500/5 pointer-events-none" />

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((e, idx) => {
                  const displayTime = e.time === '00:00' ? 'TBD' : (localTimezoneMode ? formatLocalTime(e.time, e.date) : e.time);
                  const colorConfig = (e.type || '').toLowerCase().includes('livehouse')
                    ? { gradient: 'from-[#A855F7] to-[#6366F1]', text: 'text-[#A855F7]' }
                    : (EVENT_COLORS[e.type || ''] || { gradient: 'from-[#D4AF37] to-[#b8960c]', text: 'text-[#D4AF37]' });

                  return (
                    <div
                      key={idx}
                      className="bg-[#0a0806]/60 border border-[#D4AF37]/20 rounded-2xl p-4 hover:border-[#D4AF37]/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("w-2 h-2 rounded-full bg-gradient-to-br", colorConfig.gradient)} />
                            <span className={cn("text-xs font-black uppercase tracking-wider", colorConfig.text)}>
                              {e.type || 'Event'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white/90 mb-1">{e.title || 'Untitled Event'}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-white/60">
                            <CalendarIcon size={12} />
                            <span>{displayTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0e0a08]/90 border border-white/5 flex items-center justify-center">
                  <CalendarIcon size={20} className="text-white/20" />
                </div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">No events scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slot Availability (for LIVEHOUSE) */}
      {showSlotAvailability && slotData.length > 0 && (
        <div className="bg-gradient-to-br from-[#0F1117] to-[#12141A] rounded-3xl border border-[#D4AF37]/40 p-5 space-y-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          <div className="flex items-center gap-3 border-b border-[#D4AF37]/20 pb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white/90">
              Hourly Slot Availability
            </h3>
          </div>

          <div className="space-y-2">
            {slotData.map((slot, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 sm:gap-4 items-center py-2.5 sm:py-3 transition-all border rounded-2xl mb-2 backdrop-blur-md bg-[#0A0500]/80 border-[#D4AF37]/30">
                <div className="font-black text-sm sm:text-base text-center text-[#D4AF37] tracking-tight sm:tracking-normal pl-1">
                  {slot.timeslot}
                </div>
                <div className="h-full flex items-center justify-start">
                  <LivehouseSlotButton
                    slot={slot.slot_1}
                    timeslotStr={slot.timeslot}
                    activeDateStr={format(selectedDate, 'yyyy-MM-dd')}
                    dataLength={slotData.length}
                    allUsers={allUsers}
                    onOpenBookingModal={onOpenBookingModal || (() => { })}
                    onOpenSpotlight={onOpenSpotlight}
                  />
                </div>
                <div className="h-full flex items-center justify-start">
                  <LivehouseSlotButton
                    slot={slot.slot_2}
                    timeslotStr={slot.timeslot}
                    activeDateStr={format(selectedDate, 'yyyy-MM-dd')}
                    dataLength={slotData.length}
                    allUsers={allUsers}
                    onOpenBookingModal={onOpenBookingModal || (() => { })}
                    onOpenSpotlight={onOpenSpotlight}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
