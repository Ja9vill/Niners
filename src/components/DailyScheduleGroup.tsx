import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { EVENT_COLORS, TIMEZONES } from '../lib/constants';
import { formatLocalTime, getLocalTimezoneAbbreviation, parseTimeStringToHourMin, isValidDateString } from '../lib/timezoneUtils';

interface DailyScheduleGroupProps {
  selectedDate: Date;
  events: any[];
  onAddEvent?: () => void;
  isReadOnly?: boolean;
  localTimezoneMode?: boolean;
  allUsers?: any[];
  attendanceRecords?: any[];
  onEventClick?: (event: any) => void;
  auth?: { level: number; role: string };
}

export const DailyScheduleGroup: React.FC<DailyScheduleGroupProps> = ({
  selectedDate,
  events,
  onAddEvent,
  isReadOnly = false,
  localTimezoneMode = false,
  allUsers = [],
  attendanceRecords = [],
  onEventClick,
  auth = { level: 0, role: '' }
}) => {
  const localTzAbbr = getLocalTimezoneAbbreviation();

  const selectedDayEvents = useMemo(() => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    return events.filter(event => {
      const eventDate = event.date || event.event_date;
      // Skip events with missing or invalid dates
      if (!eventDate) return false;
      // Validate date format and validity
      if (!isValidDateString(eventDate)) return false;
      return eventDate === dayStr;
    });
  }, [selectedDate, events]);

  return (
    <div className="space-y-6">
      {/* Selected Date Header Banner */}
      <div className="mb-4 sticky top-0 z-10 flex flex-col gap-1">
        <div className="flex items-center justify-center bg-gradient-to-r from-[#0a0806]/95 via-[#1a1208]/95 to-[#0a0806]/95 backdrop-blur-xl py-3 rounded-2xl border border-[#D4AF37]/30 shadow-[0_5px_15px_rgba(0,0,0,0.6),inset_0_0_15px_rgba(212,175,55,0.05)]">
          <div className="text-xs sm:text-[13px] font-black tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] via-[#D4AF37] to-[#FF8C00] text-center px-4">
            {(() => {
              const activeDateStr = format(selectedDate, 'yyyy-MM-dd');
              const localAgnosticDate = parseISO(activeDateStr);
              if (localTimezoneMode) {
                return `${format(localAgnosticDate, 'MMMM dd, yyyy')} | ${localTzAbbr}`;
              } else {
                return `${format(localAgnosticDate, 'MMMM dd, yyyy')} | UTC+8 Manila, PH`;
              }
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

          <div className="flex items-center gap-2">
            <Globe size={14} className="text-purple-400" />
            <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">
              {localTimezoneMode ? localTzAbbr : 'UTC+8'}
            </span>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-[#D4AF37]/25 p-5 space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.05)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 via-transparent to-orange-500/5 pointer-events-none" />

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents
                .sort((a, b) => {
                  const timeA = a.time || '';
                  const timeB = b.time || '';
                  // Parse times to minutes for chronological sorting
                  const parseToMinutes = (timeStr: string) => {
                    if (timeStr === 'TBD' || !timeStr) return 9999;
                    const firstPart = timeStr.split('-')[0].trim();
                    const parsed = parseTimeStringToHourMin(firstPart);
                    if (!parsed) return 9999;
                    return parsed.h * 60 + parsed.m;
                  };
                  return parseToMinutes(timeA) - parseToMinutes(timeB);
                })
                .map(e => {
                  const colorConfig = EVENT_COLORS[e.type || ''] || { gradient: 'from-[#D4AF37] to-[#b8960c]', text: 'text-[#D4AF37]' };
                  const displayTime = (!e.time || e.time === '00:00') ? 'TBD' : e.time;

                  // Skip events with missing or invalid dates
                  if (!e.date) {
                    return null;
                  }

                  let eventDateObj = new Date();
                  const firstTimePart = e.time === '00:00' ? '00:00' : (e.time?.split('-')?.[0]?.trim() || '00:00');
                  const parsedStart = parseTimeStringToHourMin(firstTimePart);
                  if (parsedStart) {
                    eventDateObj = new Date(`${e.date}T${parsedStart.h.toString().padStart(2, '0')}:${parsedStart.m.toString().padStart(2, '0')}:00+08:00`);
                  } else {
                    eventDateObj = new Date(`${e.date}T00:00:00+08:00`);
                  }

                  // Validate the created date object
                  if (isNaN(eventDateObj.getTime())) {
                    return null;
                  }

                  // Determine if the event is "upcoming" or "past/ongoing"
                  const isUpcoming = eventDateObj > new Date();

                  // Find host profile data
                  const hostPoppoId = e.poppo_id || e.created_by_id;
                  const hostUser = allUsers.find(u => (u.poppo_id || u.poppoId || u.id) === hostPoppoId);
                  const hostName = hostUser ? (hostUser.nickname || hostUser.name) : (e.created_by_name || 'Niner');
                  const hostPhoto = hostUser ? (hostUser.photoUrl || hostUser.profilePhotoUrl || hostUser.photoURL) : null;
                  const avatarUrl = hostPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(hostName)}&background=0a0806&color=D4AF37`;

                  const eventAttendance = attendanceRecords.find(r => r.event_id === e.event_id || r.eventId === e.event_id);
                  const displayAttendees = eventAttendance ? (eventAttendance.attendees || eventAttendance.attendeeIds || eventAttendance.actualParticipants || []) : [];

                  return (
                    <div
                      key={e.event_id}
                      onClick={() => onEventClick && onEventClick(e)}
                      className={cn(
                        "w-full flex gap-4 items-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-md hover:shadow-[0_0_15px_rgba(212,175,55,0.05)]",
                        isUpcoming ? "bg-gradient-to-r from-[#1a1208]/90 to-[#0a0806]/90 border-[#D4AF37]/20 hover:border-[#D4AF37]/40"
                          : "bg-gradient-to-r from-black/80 to-black/60 border-white/5 hover:border-[#D4AF37]/20"
                      )}
                    >
                      {/* Profile Column */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-[#D4AF37]/50 p-0.5 bg-[#0a0806]">
                          <img src={avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] text-white/50 uppercase tracking-widest bg-white/5 px-1 py-0.5 rounded border border-white/5 whitespace-nowrap">
                          ID: {hostPoppoId || 'N/A'}
                        </span>
                      </div>

                      {/* Details Column */}
                      <div className="flex flex-col min-w-0 flex-1 justify-center">
                        <div className="flex items-start justify-between w-full">
                          <h4 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#FFD700] uppercase tracking-widest truncate mb-1">
                            {hostName}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border whitespace-nowrap", colorConfig.text, "border-current/20 bg-current/5")}>
                            {e.type || 'Event'}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-black text-[#FF8C00] tracking-widest bg-[#FF8C00]/10 border border-[#FF8C00]/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            {localTimezoneMode ? formatLocalTime(displayTime, e.date) : displayTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }).filter(Boolean)
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#0e0a08]/90 border border-white/5 flex items-center justify-center">
                  <CalendarIcon size={20} className="text-white/20" />
                </div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">No events scheduled</p>
              </div>
            )}
          </div>

          {/* Action Buttons for interactive page only */}
          {!isReadOnly && (
            <div className="pt-4 border-t border-[#D4AF37]/15 flex items-center justify-end gap-3 flex-wrap">
              {auth.level > 0 && onAddEvent && (
                <button
                  onClick={onAddEvent}
                  className="px-4 py-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest hover:border-[#D4AF37]/50 rounded-xl transition-all active:scale-[0.99] cursor-pointer flex items-center gap-2 shadow-md shadow-[#D4AF37]/5"
                >
                  <Plus size={14} />
                  Add Event
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
