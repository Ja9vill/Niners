import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarDayData } from '../hooks/useCalendarEngine';

interface CalendarHeaderGroupProps {
  activeTab: 'AGENCY' | 'LIVEHOUSE';
  onTabChange: (tab: 'AGENCY' | 'LIVEHOUSE') => void;
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events?: any[];
  engineDays?: CalendarDayData[];
  onAddEvent?: () => void;
  isReadOnly?: boolean;
  showAddButton?: boolean;
  onTimezoneToggle?: () => void;
  timezoneLabel?: string;
}

export const CalendarHeaderGroup: React.FC<CalendarHeaderGroupProps> = ({
  activeTab,
  onTabChange,
  currentDate,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onDateSelect,
  events = [],
  engineDays,
  onAddEvent,
  isReadOnly = false,
  showAddButton = true,
  onTimezoneToggle,
  timezoneLabel = ''
}) => {
  const monthDays = useMemo(() => {
    if (engineDays) return engineDays;
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    }).map(d => ({
      date: format(d, 'yyyy-MM-dd'),
      weekday: format(d, 'EEE'),
      isToday: isSameDay(d, new Date()),
      goldDot: false,
      firebrickDot: false,
      events: [],
      timeslots: []
    })) as CalendarDayData[];
  }, [currentDate, engineDays]);

  const isLivehouseEvent = (type?: string) => {
    const t = type || '';
    return ['Solo Livehouse', 'Party Livehouse', 'SOLO LIVEHOUSE', 'PARTY LIVEHOUSE'].includes(t);
  };

  const getDayData = (day: CalendarDayData) => {
    if (engineDays) return day;
    const dayStr = day.date;
    const dayEvents = events.filter(event => {
      const eventDate = event.date || event.event_date;
      return eventDate === dayStr;
    });
    const hasLivehouse = dayEvents.some(e => isLivehouseEvent(e.type || e.type_of_event));
    return {
      ...day,
      events: dayEvents,
      goldDot: dayEvents.length > 0 && !hasLivehouse,
      firebrickDot: hasLivehouse
    };
  };

  const handleDateClick = (day: CalendarDayData) => {
    onDateSelect(new Date(day.date + 'T00:00:00'));
  };

  return (
    <div className={cn(
      "bg-black/20 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border animate-fade-in space-y-4",
      activeTab === 'AGENCY'
        ? "border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.12)]"
        : "border-[#CD853F]/20 shadow-[0_0_30px_rgba(205,133,63,0.12)]"
    )}>
      {/* Dual-Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0e0a08]/90 p-1 rounded-lg border border-white/10 w-max mx-auto">
        <button
          onClick={() => onTabChange('AGENCY')}
          className={cn(
            "px-4 sm:px-5 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-300",
            activeTab === 'AGENCY'
              ? "bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]"
              : "bg-[#D4AF37]/5 text-[#D4AF37]/50 hover:text-[#D4AF37]/80 hover:bg-[#D4AF37]/10"
          )}
        >
          AGENCY CALENDAR
        </button>
        <button
          onClick={() => onTabChange('LIVEHOUSE')}
          className={cn(
            "px-4 sm:px-5 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-300",
            activeTab === 'LIVEHOUSE'
              ? "bg-gradient-to-r from-[#CD853F]/20 to-[#FF6347]/15 text-[#FF7F50] shadow-[0_0_15px_rgba(205,133,63,0.25)]"
              : "bg-[#CD853F]/5 text-[#CD853F]/50 hover:text-[#FF7F50]/80 hover:bg-[#CD853F]/10"
          )}
        >
          LIVEHOUSE CALENDAR
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 bg-[#14100c]/60 p-2 rounded-2xl border border-[#D4AF37]/10 backdrop-blur-md">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-[#D4AF37]/20 rounded-xl transition-all text-[#D4AF37]"
            title="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>

          <h2 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#D4AF37] tracking-widest uppercase min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>

          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-[#D4AF37]/20 rounded-xl transition-all text-[#D4AF37]"
            title="Next Month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 mt-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-[9px] sm:text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-widest">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {monthDays.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />;
          const dayData = getDayData(day);
          const dayNum = parseInt(day.date.split('-')[2], 10);
          const isCurrentMonth = day.date.split('-')[1] === format(currentDate, 'MM');

          let borderClass = "border-white/10";
          let bgClass = "bg-gradient-to-br from-[#2a221b]/90 to-[#1a140f]/90 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_0_15px_rgba(255,255,255,0.03)]";
          let textClass = isCurrentMonth ? "text-white/90" : "text-white/30";

          if (day.isToday) {
            borderClass = "border-[#FFD700]/50";
            bgClass = "bg-gradient-to-br from-[#D4AF37]/15 via-[#1a1208]/80 to-[#FF8C00]/15 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.15),inset_0_0_15px_rgba(212,175,55,0.1)]";
            textClass = "text-transparent bg-clip-text bg-gradient-to-b from-[#FFF0B3] to-[#D4AF37]";
          } else if (day.date === format(selectedDate, 'yyyy-MM-dd')) {
            borderClass = "border-[#FF8C00]/50";
            bgClass = "bg-gradient-to-br from-[#FF8C00]/15 via-[#1a0f08]/80 to-[#FF4500]/15 backdrop-blur-xl shadow-[0_0_20px_rgba(255,140,0,0.15),inset_0_0_15px_rgba(255,140,0,0.1)]";
            textClass = "text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#FF8C00]";
          }

          const hasGold = dayData.goldDot;
          const hasFirebrick = dayData.firebrickDot;

          return (
            <button
              key={day.date}
              onClick={() => handleDateClick(day)}
              className={cn(
                "aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer relative group hover:border-[#D4AF37]/30",
                bgClass, borderClass
              )}
            >
              <span className={cn(
                "text-sm sm:text-xl font-black drop-shadow-md leading-none transition-transform group-hover:scale-105",
                textClass
              )}>
                {dayNum}
              </span>
              {(hasGold || hasFirebrick) && (
                <div className="absolute bottom-1.5 flex gap-0.5">
                  {hasGold && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#b8960c] shadow-[0_0_4px_rgba(212,175,55,0.6)]" />}
                  {hasFirebrick && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gradient-to-br from-[#B22222] to-[#8B0000] shadow-[0_0_4px_rgba(178,34,34,0.6)]" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className={cn(
        "h-px w-full",
        activeTab === 'AGENCY' ? "bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" : "bg-gradient-to-r from-transparent via-[#CD853F]/30 to-transparent"
      )} />

      {/* Bottom Bar: Add Event + Timezone Toggle */}
      <div className="flex items-center justify-between gap-3">
        {showAddButton && !isReadOnly && onAddEvent ? (
          <button
            onClick={onAddEvent}
            className={cn(
              "px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 min-h-[44px]",
              activeTab === 'AGENCY'
                ? "border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] hover:border-[#D4AF37]/50 shadow-md shadow-[#D4AF37]/5"
                : "border border-[#CD853F]/30 bg-[#CD853F]/10 hover:bg-[#CD853F]/20 text-[#FF7F50] hover:border-[#FF6347]/50 shadow-md shadow-[#CD853F]/5"
            )}
          >
            <Plus size={14} />
            Add Event
          </button>
        ) : (
          <div />
        )}

        {onTimezoneToggle && (
          <button
            onClick={onTimezoneToggle}
            className={cn(
              "px-4 py-2 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-[0.99] cursor-pointer min-h-[44px]",
              activeTab === 'AGENCY'
                ? "border border-[#D4AF37]/20 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/15 text-[#D4AF37] hover:border-[#D4AF37]/40"
                : "border border-[#CD853F]/20 bg-[#CD853F]/5 hover:bg-[#CD853F]/15 text-[#FF7F50] hover:border-[#FF7F50]/40"
            )}
          >
            View {timezoneLabel}
          </button>
        )}
      </div>
    </div>
  );
};
