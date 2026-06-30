import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LivehouseDataRow, LivehouseSlot } from '../types/livehouse';
import { Loader2, Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parse } from 'date-fns';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LivehouseCalendarProps {
  allUsers: any[];
  events?: any[];
  selectedDateStr: string;
  onOpenBookingModal: (date: string, timeslot: string) => void;
  timeDisplayMode?: string;
  userTz?: string;
}

const LivehouseSlotButton = ({ slot, timeslotStr, activeDateStr, dataLength, allUsers, onOpenBookingModal, onOpenSpotlight }: { slot: LivehouseSlot, timeslotStr: string, activeDateStr: string, dataLength: number, allUsers: any[], onOpenBookingModal: (date: string, time: string) => void, onOpenSpotlight?: (user: any, time: string, date: string) => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  if (dataLength === 0 || slot.available) {
    return (
      <div
        onClick={() => onOpenBookingModal(activeDateStr, timeslotStr)}
        className="w-[95%] mr-auto py-1.5 sm:py-2 flex items-center justify-center rounded-full bg-gradient-to-br from-[#031508]/80 via-[#051A0A]/90 to-[#031508]/80 border border-[#008F39]/40 hover:border-[#00C851]/60 hover:bg-gradient-to-br hover:from-[#051A0A]/90 hover:via-[#031508]/95 hover:to-[#051A0A]/90 backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(0,200,81,0.08)] hover:scale-105"
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
        className="cursor-pointer w-[95%] mr-auto py-1.5 sm:py-2 flex items-center justify-center rounded-full bg-gradient-to-br from-[#1A1208]/90 via-[#120F0A]/95 to-[#0A0806]/90 border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.2),inset_0_0_10px_rgba(212,175,55,0.1)] backdrop-blur-xl hover:border-[#FFD700]/80 hover:shadow-[0_0_30px_rgba(255,140,0,0.6),inset_0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 hover:scale-105"
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
            className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[#1A0808]/90 via-[#120A0A]/95 to-[#0A0606]/90 border border-[#B22222]/30 shadow-[0_0_15px_rgba(178,34,34,0.15),inset_0_0_10px_rgba(178,34,34,0.08)] backdrop-blur-xl group-hover:border-[#B22222]/60 group-hover:shadow-[0_0_20px_rgba(178,34,34,0.3)] transition-all duration-300"
            ref={el => { if (el) { (el.style as any).backfaceVisibility = 'hidden'; } }}
          >
            <span className="text-[#B22222] font-bold text-[10px] sm:text-xs uppercase tracking-wider truncate">BOOKED</span>
          </div>

          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[#1A0808]/95 via-[#120A0A]/95 to-[#0A0606]/95 border border-[#B22222]/50 shadow-[0_0_20px_rgba(178,34,34,0.2)]"
            ref={el => { if (el) { (el.style as any).backfaceVisibility = 'hidden'; el.style.transform = 'rotateX(180deg)'; } }}
          >
            <span className="text-[#E57373] font-black text-[12px] sm:text-[15px] uppercase tracking-wider drop-shadow-md truncate px-1">{rawId}</span>
          </div>
        </div>
      </div>
    );
  }
};

export const LivehouseCalendar: React.FC<LivehouseCalendarProps> = ({ allUsers, events = [], selectedDateStr, onOpenBookingModal, timeDisplayMode = 'Asia/Manila', userTz = 'UTC' }) => {
  const [data, setData] = useState<LivehouseDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotlightHost, setSpotlightHost] = useState<{ user: any, timeslot: string, date: string } | null>(null);
  const timezoneMode = timeDisplayMode === 'Asia/Manila' ? 'UTC+8' as const : 'Local' as const;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setPortalTarget(containerRef.current.ownerDocument.body);
    } else {
      setPortalTarget(document.body);
    }
  }, [spotlightHost]);

  const localTzAbbr = useMemo(() => {
    const match = new Date().toString().match(/\(([A-Za-z\s]+)\)/);
    if (match && match[1]) {
      const parts = match[1].split(' ');
      if (parts.length > 1) {
        return parts.map(w => w[0]).join('').toUpperCase();
      }
      return match[1].toUpperCase().substring(0, 4);
    }
    return "LOCAL";
  }, []);

  useEffect(() => {
    setIsLoading(true);

    const lastSync = sessionStorage.getItem('last_livehouse_sync_trigger');
    if (!lastSync || Date.now() - Number(lastSync) > 5 * 60 * 1000) {
      fetch('/api/public/livehouse/sync', { method: 'POST' }).catch(console.error);
      sessionStorage.setItem('last_livehouse_sync_trigger', Date.now().toString());
    }

    const q = query(collection(db, 'livehouse_schedule'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map(doc => doc.data() as LivehouseDataRow);
      setData(rows);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error(err);
      setError('Failed to load Livehouse schedule from database.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeDayRows = useMemo(() => {
    if (!selectedDateStr) return [];
    const dbRows = data.filter(d => d.date === selectedDateStr);

    const getHour = (ts: string) => {
      if (!ts) return 0;
      const start = ts.split('-')[0].trim();
      let hour = parseInt(start.split(':')[0] || '0', 10);
      if (start.toUpperCase().includes('PM') && hour < 12) hour += 12;
      if (start.toUpperCase().includes('AM') && hour === 12) hour = 0;
      return hour;
    };

    const fullDayRows: LivehouseDataRow[] = [];

    for (let i = 0; i < 24; i++) {
      const existing = dbRows.find(r => getHour(r.timeslot) === i);

      if (existing) {
        fullDayRows.push(existing);
      } else {
        const formatHour = (h: number) => {
          if (h === 0) return '12AM';
          if (h === 12) return '12PM';
          return h < 12 ? `${h}AM` : `${h - 12}PM`;
        };
        const endH = (i + 1) % 24;
        const timeslotStr = `${formatHour(i)} - ${formatHour(endH)}`;

        fullDayRows.push({
          date: selectedDateStr,
          timeslot: timeslotStr,
          slot_1: { poppo_id: '', available: true },
          slot_2: { poppo_id: '', available: true }
        });
      }
    }

    return fullDayRows.map(row => {
      let ts = row.timeslot;

      ts = ts.replace(/\s*\(Manila Time\)\s*/gi, '');

      if (/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(ts)) {
        const parts = ts.split('-');
        const format24to12 = (t24: string) => {
           let h = parseInt(t24.trim().split(':')[0], 10);
           if (h === 0) return '12AM';
           if (h === 12) return '12PM';
           return h < 12 ? `${h}AM` : `${h - 12}PM`;
        };
        ts = `${format24to12(parts[0])} - ${format24to12(parts[1])}`;
      } else {
        ts = ts.replace(/\b(13|14|15|16|17|18|19|20|21|22|23):00\s*PM\b/gi, (match, p1) => `${parseInt(p1, 10) - 12}PM`);
        ts = ts.replace(/\b0?(\d{1,2}):00\s?(AM|PM)\b/gi, '$1$2');
        ts = ts.replace(/\b(13|14|15|16|17|18|19|20|21|22|23)PM\b/gi, (match, p1) => `${parseInt(p1, 10) - 12}PM`);
        ts = ts.replace(/\s*-\s*/g, ' - ');
      }

      return { ...row, timeslot: ts };
    }).sort((a, b) => getHour(a.timeslot) - getHour(b.timeslot));
  }, [data, selectedDateStr]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-gradient-to-b from-[#030201] via-[#050403] to-[#0A0806] backdrop-blur-xl p-5 rounded-3xl border border-[#B22222]/15">
        <Loader2 size={48} className="animate-spin text-[#B22222]" />
        <p className="text-[#A09E9A] text-sm animate-pulse tracking-widest font-bold">Synchronizing Livehouse API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <CalendarIcon size={24} className="text-rose-400" />
        </div>
        <h3 className="text-rose-400 font-bold tracking-widest uppercase">API Error</h3>
        <p className="text-sm text-[#A09E9A] text-center max-w-md">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="animate-fade-in space-y-4 bg-gradient-to-b from-[#030201] via-[#050403] to-[#0A0806] backdrop-blur-2xl border border-[#B22222]/15 rounded-3xl p-4 sm:p-5 shadow-[0_0_40px_rgba(178,34,34,0.08)] relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-[rgba(178,34,34,0.06)] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-1/2 h-32 bg-[rgba(139,0,0,0.05)] blur-[80px] pointer-events-none" />

      {/* Grid Container */}
      <div className="w-full">
        <div className="w-full">
          {/* Selected Date Header & Column Labels */}
          <div className="mb-2 sticky top-0 z-10 flex flex-col gap-1">
            <div className="flex items-center justify-center bg-gradient-to-r from-[#1A1510]/95 via-[#120F0A]/95 to-[#0A0806]/95 backdrop-blur-xl py-3 rounded-2xl border border-[#B22222]/15 shadow-[0_5px_15px_rgba(0,0,0,0.6),inset_0_0_15px_rgba(255,255,255,0.02)]">
               <div className="text-xs sm:text-[13px] font-black tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#D4AF37] to-[#9A7D0A] text-center px-4">
                  {(() => {
                    if (!selectedDateStr) return "";
                    const localAgnosticDate = parse(selectedDateStr, 'yyyy-MM-dd', new Date());
                    if (timezoneMode === 'UTC+8') {
                      return `${format(localAgnosticDate, 'MMMM dd, yyyy')} | UTC+8 Manila, PH`;
                    } else {
                      return `${format(localAgnosticDate, 'MMMM dd, yyyy')} | ${localTzAbbr}`;
                    }
                  })()}
               </div>
            </div>

            <div className="grid grid-cols-3 text-center bg-gradient-to-r from-[#1A1510]/80 via-[#120F0A]/80 to-[#0A0806]/80 backdrop-blur-md py-2 rounded-xl border border-white/5 shadow-md">
              <div className="text-[9px] sm:text-[10px] font-black text-white/60 tracking-widest uppercase">TIMESLOT</div>
              <div className="text-[9px] sm:text-[10px] font-black text-white/60 tracking-widest uppercase">SLOT 1</div>
              <div className="text-[9px] sm:text-[10px] font-black text-white/60 tracking-widest uppercase">SLOT 2</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="space-y-0">
            {activeDayRows.map((row, idx) => {
              const startPart = row.timeslot.split('-')[0].trim();
              let hour = parseInt(startPart.replace(/\D/g, '') || '0', 10);
              if (startPart.includes('PM') && hour < 12) hour += 12;
              if (startPart.includes('AM') && hour === 12) hour = 0;

              const bgClass = "bg-gradient-to-br from-[#1A1510]/90 via-[#120F0A]/95 to-[#0A0806]/90 backdrop-blur-xl border-[#D4AF37]/15 shadow-[0_0_15px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(255,255,255,0.02)]";

              let displayTimeslot = row.timeslot;
              let dayOffsetStr = "";
              if (timezoneMode === 'Local') {
                 const pad = (n: number) => n.toString().padStart(2, '0');
                 const isoString = `${selectedDateStr}T${pad(hour)}:00:00+08:00`;
                 const dateObj = new Date(isoString);

                 const localStartHour = dateObj.getHours();
                 const localEndHour = (localStartHour + 1) % 24;

                 const format12Hour = (h: number) => {
                   if (h === 0) return '12AM';
                   if (h === 12) return '12PM';
                   return h < 12 ? `${h}AM` : `${h - 12}PM`;
                 };

                 displayTimeslot = `${format12Hour(localStartHour)} - ${format12Hour(localEndHour)}`;

                 const localDateStr = format(dateObj, 'yyyy-MM-dd');
                 if (localDateStr !== selectedDateStr) {
                   dayOffsetStr = format(dateObj, 'MMM d');
                 }
              }

              return (
              <div key={idx} className={cn("grid grid-cols-3 gap-2 sm:gap-4 items-center py-2.5 sm:py-3 transition-all border rounded-2xl mb-2 backdrop-blur-md hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] group", bgClass)}>
                <div className="font-black text-sm sm:text-base text-center text-[#D4AF37] tracking-tight sm:tracking-normal pl-1 flex flex-col items-center justify-center">
                  <span>{displayTimeslot}</span>
                  {dayOffsetStr && <span className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5 bg-white/5 px-1.5 py-0.5 rounded-md">({dayOffsetStr})</span>}
                </div>
                <div className="h-full flex items-center justify-start">
                  <LivehouseSlotButton slot={row.slot_1} timeslotStr={row.timeslot} activeDateStr={selectedDateStr} dataLength={data.length} allUsers={allUsers} onOpenBookingModal={onOpenBookingModal} onOpenSpotlight={(u, t, d) => setSpotlightHost({user: u, timeslot: t, date: d})} />
                </div>
                <div className="h-full flex items-center justify-start">
                  <LivehouseSlotButton slot={row.slot_2} timeslotStr={row.timeslot} activeDateStr={selectedDateStr} dataLength={data.length} allUsers={allUsers} onOpenBookingModal={onOpenBookingModal} onOpenSpotlight={(u, t, d) => setSpotlightHost({user: u, timeslot: t, date: d})} />
                </div>
              </div>
            )})}

            {activeDayRows.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm font-bold tracking-widest uppercase border-t border-white/5 bg-gradient-to-br from-[#1A1510]/40 via-[#120F0A]/50 to-[#0A0806]/40 rounded-2xl mt-2">
                No slots found for this date.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spotlight Modal */}
      {spotlightHost && portalTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#030201]/90 backdrop-blur-md animate-fade-in" onClick={() => setSpotlightHost(null)}>
          <div
            className="w-full max-w-md bg-gradient-to-br from-[#1A1510]/95 via-[#120F0A]/95 to-[#0A0806]/95 border border-[#B22222]/15 shadow-[0_0_50px_rgba(212,175,55,0.15),inset_0_0_20px_rgba(255,255,255,0.02)] p-6 sm:p-8 rounded-3xl flex flex-col gap-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button onClick={() => setSpotlightHost(null)} className="text-white/30 hover:text-[#D4AF37] transition-colors p-1 bg-gradient-to-br from-[#1A1510]/60 to-[#0A0806]/60 hover:from-[#1A1510]/80 hover:to-[#0A0806]/80 rounded-full border border-white/5" title="Close">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-row items-center w-full gap-5 sm:gap-6 mt-[-10px]">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#D4AF37]/80 p-1 shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0 bg-[#0a0806]">
                <img
                  src={spotlightHost.user.photoUrl || spotlightHost.user.profilePhotoUrl || spotlightHost.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(spotlightHost.user.nickname || spotlightHost.user.name || 'U')}&background=0a0806&color=D4AF37`}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>

              <div className="flex flex-col">
                <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#FFD700] uppercase tracking-widest leading-tight drop-shadow-md">
                  {spotlightHost.user.nickname || spotlightHost.user.name || 'NINER HOST'}
                </h3>
                <div className="text-[#A09E9A] font-medium tracking-widest text-xs sm:text-sm mt-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5 inline-flex w-max">
                  ID: <span className="text-white ml-2">{spotlightHost.user.poppo_id || spotlightHost.user.poppoId || spotlightHost.user.id}</span>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent my-1" />

            <div className="w-full bg-gradient-to-br from-[#1A1510]/60 via-[#120F0A]/70 to-[#0A0806]/70 rounded-2xl border border-[#D4AF37]/10 p-5 flex flex-col gap-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(255,255,255,0.01)]">
              <div className="flex items-center gap-4">
                <div className="p-2.5 sm:p-3 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37] border border-[#D4AF37]/20">
                  <CalendarIcon size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#D4AF37]/60 font-black mb-1">Event Title</span>
                  <span className="text-sm sm:text-base font-black text-white/90 uppercase tracking-widest">Livehouse Performance</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2.5 sm:p-3 bg-gradient-to-br from-[#FF8C00]/10 to-[#FF4500]/10 rounded-xl text-[#FF8C00] border border-[#FF8C00]/20">
                  <Clock size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#FF8C00]/60 font-black mb-1">Date & Time</span>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-sm font-black text-[#FF8C00] uppercase tracking-widest">{format(new Date(spotlightHost.date), 'MMM dd, yyyy')}</span>
                    <span className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF8C00]">{spotlightHost.timeslot}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSpotlightHost(null)}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#1A1510]/80 to-[#0A0806]/80 hover:from-[#1A1510]/90 hover:to-[#0A0806]/90 border border-[#B22222]/15 rounded-xl text-[#D4AF37] font-black tracking-widest uppercase text-xs transition-all shadow-[0_0_15px_rgba(178,34,34,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
            >
              Close Spotlight
            </button>
          </div>
        </div>,
        portalTarget
      )}
    </div>
  );
};
