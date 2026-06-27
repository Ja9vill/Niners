import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FirebaseService } from '../lib/firebaseService';
import { LivehouseDataRow, LivehouseSlot } from '../types/livehouse';
import { Storage } from '../lib/storage';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parse, getDaysInMonth, startOfMonth, setDate, isSameDay, addMonths, subMonths, addDays } from 'date-fns';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CalendarHeaderGroup } from './CalendarHeaderGroup';
import { DailyScheduleGroup } from './DailyScheduleGroup';
import { formatLocalTime, getLocalTimezoneAbbreviation } from '../lib/timezoneUtils';

interface LivehouseCalendarProps {
  allUsers: any[];
  onOpenBookingModal: (date: string, timeslot: string) => void;
}

const LivehouseSlotButton = ({ slot, timeslotStr, activeDateStr, dataLength, allUsers, onOpenBookingModal, onOpenSpotlight }: { slot: LivehouseSlot, timeslotStr: string, activeDateStr: string, dataLength: number, allUsers: any[], onOpenBookingModal: (date: string, time: string) => void, onOpenSpotlight?: (user: any, time: string, date: string) => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  if (dataLength === 0 || slot.available) {
    // GREEN GLASSMORPHISM
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
    // FIERY GOLD GLASSMORPHISM (NINER) - Spotlight Trigger
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
    // RED GLASSMORPHISM (BOOKED) WITH FLIP
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
          {/* Front: BOOKED */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.1)] group-hover:border-rose-400 group-hover:bg-rose-500/20 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all duration-300"
            ref={el => { if (el) { (el.style as any).backfaceVisibility = 'hidden'; } }}
          >
            <span className="text-rose-400 font-bold text-[10px] sm:text-xs uppercase tracking-wider truncate">BOOKED</span>
          </div>

          {/* Back: POPPO ID */}
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

let sessionActiveDateStr: string | null = null;

export const LivehouseCalendar: React.FC<LivehouseCalendarProps> = ({ allUsers, onOpenBookingModal }) => {
  const [data, setData] = useState<LivehouseDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotlightHost, setSpotlightHost] = useState<{ user: any, timeslot: string, date: string } | null>(null);

  // Dynamic portal target setup to resolve iframe/mobile layout clipping
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setPortalTarget(containerRef.current.ownerDocument.body);
    } else {
      setPortalTarget(document.body);
    }
  }, [spotlightHost]);

  const [activeDateStr, setActiveDateStr] = useState<string>(() => {
    if (sessionActiveDateStr) return sessionActiveDateStr;
    const today = format(new Date(), 'yyyy-MM-dd');
    sessionActiveDateStr = today;
    return today;
  });

  const [timezoneMode, setTimezoneMode] = useState<'UTC+8' | 'Local'>('Local');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate User's Local Timezone Abbreviation (e.g. EST/EDT)
  const localTzAbbr = useMemo(() => {
    return getLocalTimezoneAbbreviation();
  }, []);

  // Keep session variable in sync when user picks a new date
  useEffect(() => {
    sessionActiveDateStr = activeDateStr;
  }, [activeDateStr]);

  useEffect(() => {
    setIsLoading(true);

    // Background auto-trigger for sync when anyone opens the tab (Throttled to 5 mins)
    const lastSync = sessionStorage.getItem('last_livehouse_sync_trigger');
    if (!lastSync || Date.now() - Number(lastSync) > 5 * 60 * 1000) {
      fetch('/api/public/livehouse/sync', { method: 'POST' }).catch(console.error);
      sessionStorage.setItem('last_livehouse_sync_trigger', Date.now().toString());
    }

    // Listen to Firebase real-time updates
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on mount to align active date with the TIMESLOT column
  useEffect(() => {
    if (!isLoading && activeDateStr && scrollContainerRef.current) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        const activeEl = document.getElementById(`livehouse-day-${activeDateStr}`);
        if (container && activeEl) {
          // The TIMESLOT column is the 1st of 3 columns. Center of it is roughly at width / 6
          const firstColumnCenter = container.clientWidth / 6;
          const elCenter = activeEl.offsetLeft + (activeEl.clientWidth / 2);
          const scrollLeft = elCenter - firstColumnCenter;
          container.scrollTo({ left: scrollLeft, behavior: 'auto' });
        }
      }, 50);
    }
  }, [isLoading]);

  const baseDate = activeDateStr ? parse(activeDateStr, 'yyyy-MM-dd', new Date()) : new Date();
  const daysInMonthCount = getDaysInMonth(baseDate);
  const baseMonthStart = startOfMonth(baseDate);

  // Convert livehouse slot data to event format for display
  const livehouseEvents = useMemo(() => {
    return activeDayRows
      .filter(row => !row.slot_1?.available || !row.slot_2?.available)
      .map(row => ({
        title: 'Livehouse Session',
        type: 'SOLO LIVEHOUSE',
        time: row.timeslot,
        date: activeDateStr,
        description: 'Livehouse booking'
      }));
  }, [activeDayRows, activeDateStr]);

  const monthDays = useMemo(() => {
    return Array.from({ length: daysInMonthCount }, (_, i) => {
      return format(addDays(baseMonthStart, i), 'yyyy-MM-dd');
    });
  }, [daysInMonthCount, baseMonthStart]);

  const activeDayRows = useMemo(() => {
    if (!activeDateStr) return [];
    const dbRows = data.filter(d => d.date === activeDateStr);

    // Helper to extract the starting hour from any timeslot string
    const getHour = (ts: string) => {
      if (!ts) return 0;
      const start = ts.split('-')[0].trim();
      let hour = parseInt(start.split(':')[0] || '0', 10);
      if (start.toUpperCase().includes('PM') && hour < 12) hour += 12;
      if (start.toUpperCase().includes('AM') && hour === 12) hour = 0;
      return hour;
    };

    // Build exactly 24 slots
    const fullDayRows: LivehouseDataRow[] = [];

    for (let i = 0; i < 24; i++) {
      // Find if we have any db record for this hour
      const existing = dbRows.find(r => getHour(r.timeslot) === i);

      if (existing) {
        fullDayRows.push(existing);
      } else {
        // Format as e.g., "9AM - 10AM"
        const formatHour = (h: number) => {
          if (h === 0) return '12AM';
          if (h === 12) return '12PM';
          return h < 12 ? `${h}AM` : `${h - 12}PM`;
        };
        const endH = (i + 1) % 24;
        const timeslotStr = `${formatHour(i)} - ${formatHour(endH)}`;

        fullDayRows.push({
          date: activeDateStr,
          timeslot: timeslotStr,
          slot_1: { poppo_id: '', available: true },
          slot_2: { poppo_id: '', available: true }
        });
      }
    }

    // Convert old formats from DB if they don't match the new compact style
    return fullDayRows.map(row => {
      let ts = row.timeslot;

      // Strip out (Manila Time) if it exists
      ts = ts.replace(/\s*\(Manila Time\)\s*/gi, '');

      // Check if it's strictly 24hr format without AM/PM: "14:00 - 15:00" or "09:00 - 10:00"
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
        // Fix DB anomalies like "13:00 PM" or "14:00 PM"
        ts = ts.replace(/\b(13|14|15|16|17|18|19|20|21|22|23):00\s*PM\b/gi, (match, p1) => `${parseInt(p1, 10) - 12}PM`);

        // Standardize existing AM/PM formats
        ts = ts.replace(/\b0?(\d{1,2}):00\s?(AM|PM)\b/gi, '$1$2');

        // Fallback fix for "13PM" -> "1PM"
        ts = ts.replace(/\b(13|14|15|16|17|18|19|20|21|22|23)PM\b/gi, (match, p1) => `${parseInt(p1, 10) - 12}PM`);

        ts = ts.replace(/\s*-\s*/g, ' - ');
      }

      return { ...row, timeslot: ts };
    }).sort((a, b) => getHour(a.timeslot) - getHour(b.timeslot));
  }, [data, activeDateStr]);




  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-black/20 backdrop-blur-xl p-5 rounded-3xl border border-[#D4AF37]/20">
        <Loader2 size={48} className="animate-spin text-[#D4AF37]" />
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
    <div ref={containerRef} className="animate-fade-in space-y-4 bg-gradient-to-b from-[#0a0806]/90 to-[#050403]/90 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-3xl p-4 sm:p-5 shadow-[0_0_40px_rgba(212,175,55,0.08)] relative overflow-hidden">
      {/* Subtle Fiery Glow Background accents */}
      <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-[#FF8C00]/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-1/2 h-32 bg-[#D4AF37]/5 blur-[80px] pointer-events-none" />

      {/* Calendar Header Group */}
      <CalendarHeaderGroup
        activeTab="LIVEHOUSE"
        onTabChange={() => { }}
        currentDate={currentDate}
        onDateChange={(date) => {
          setCurrentDate(date);
          setActiveDateStr(format(date, 'yyyy-MM-dd'));
        }}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          setSelectedDate(date);
          setActiveDateStr(format(date, 'yyyy-MM-dd'));
        }}
        events={livehouseEvents}
        showAddButton={false}
      />

      {/* Daily Schedule Group */}
      <DailyScheduleGroup
        selectedDate={selectedDate}
        events={livehouseEvents}
        showSlotAvailability={true}
        slotData={activeDayRows.map(row => ({
          ...row,
          timeslot: timezoneMode === 'Local' ? formatLocalTime(row.timeslot, activeDateStr) : row.timeslot
        }))}
        localTimezoneMode={timezoneMode === 'Local'}
        allUsers={allUsers}
        onOpenBookingModal={onOpenBookingModal}
        onOpenSpotlight={(u, t, d) => setSpotlightHost({ user: u, timeslot: t, date: d })}
      />

      {/* Spotlight Modal */}
      {spotlightHost && portalTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSpotlightHost(null)}>
          <div
            className="w-full max-w-md bg-[#050301] border border-[#D4AF37]/30 shadow-[0_0_50px_rgba(255,140,0,0.2),inset_0_0_20px_rgba(212,175,55,0.1)] p-6 sm:p-8 rounded-3xl flex flex-col gap-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Header/Close */}
            <div className="w-full flex justify-end">
              <button onClick={() => setSpotlightHost(null)} className="text-white/30 hover:text-[#D4AF37] transition-colors p-1 bg-white/5 hover:bg-white/10 rounded-full" title="Close">
                <X size={20} />
              </button>
            </div>

            {/* Profile Info Row */}
            <div className="flex flex-row items-center w-full gap-5 sm:gap-6 mt-[-10px]">
              {/* Photo */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#D4AF37]/80 p-1 shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0 bg-[#0a0806]">
                <img
                  src={spotlightHost.user.photoUrl || spotlightHost.user.profilePhotoUrl || spotlightHost.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(spotlightHost.user.nickname || spotlightHost.user.name || 'U')}&background=0a0806&color=D4AF37`}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>

              {/* Name & ID */}
              <div className="flex flex-col">
                <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#FFD700] uppercase tracking-widest leading-tight drop-shadow-md">
                  {spotlightHost.user.nickname || spotlightHost.user.name || 'NINER HOST'}
                </h3>
                <div className="text-[#A09E9A] font-medium tracking-widest text-xs sm:text-sm mt-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5 inline-flex w-max">
                  ID: <span className="text-white ml-2">{spotlightHost.user.poppo_id || spotlightHost.user.poppoId || spotlightHost.user.id}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent my-1" />

            {/* Event Details */}
            <div className="w-full bg-[#0a0806]/60 rounded-2xl border border-[#D4AF37]/10 p-5 flex flex-col gap-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
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
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#D4AF37]/20 to-[#FF8C00]/20 hover:from-[#D4AF37]/30 hover:to-[#FF8C00]/30 border border-[#D4AF37]/30 rounded-xl text-white font-black tracking-widest uppercase text-xs transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
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
