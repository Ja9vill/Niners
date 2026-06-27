import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { EVENT_COLORS } from '../lib/constants';

interface CalendarHeaderGroupProps {
  activeTab: 'AGENCY' | 'LIVEHOUSE';
  onTabChange: (tab: 'AGENCY' | 'LIVEHOUSE') => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events: any[];
  onAddEvent?: () => void;
  isReadOnly?: boolean;
  showAddButton?: boolean;
}

export const CalendarHeaderGroup: React.FC<CalendarHeaderGroupProps> = ({
  activeTab,
  onTabChange,
  currentDate,
  onDateChange,
  selectedDate,
  onDateSelect,
  events,
  onAddEvent,
  isReadOnly = false,
  showAddButton = true
}) => {
  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => {
      const eventDate = event.date || event.event_date;
      return eventDate === dayStr;
    });
  };

  const handleDateClick = (day: Date) => {
    onDateSelect(day);
  };

  return (
    <div className="bg-black/20 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.05)] animate-fade-in space-y-4">
      {/* Dual-Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0e0a08]/90 p-1 rounded-lg border border-[#D4AF37]/20 w-max mx-auto">
        <button
          onClick={() => onTabChange('AGENCY')}
          className={cn(
            "px-4 sm:px-5 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-300",
            activeTab === 'AGENCY'
              ? "bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              : "text-[#F0EFE8]/40 hover:text-[#D4AF37]/70 hover:bg-[#D4AF37]/5"
          )}
        >
          AGENCY CALENDAR
        </button>
        <button
          onClick={() => onTabChange('LIVEHOUSE')}
          className={cn(
            "px-4 sm:px-5 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-300",
            activeTab === 'LIVEHOUSE'
              ? "bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              : "text-[#F0EFE8]/40 hover:text-[#D4AF37]/70 hover:bg-[#D4AF37]/5"
          )}
        >
          LIVEHOUSE CALENDAR
        </button>
      </div>

      {/* Month Navigation with Add Event Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-[#14100c]/60 p-2 rounded-2xl border border-[#D4AF37]/10 backdrop-blur-md">
          <button 
            onClick={() => onDateChange(subMonths(currentDate, 1))}
            className="p-2 hover:bg-[#D4AF37]/20 rounded-xl transition-all text-[#D4AF37]"
            title="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h2 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#D4AF37] tracking-widest uppercase min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          
          <button 
            onClick={() => onDateChange(addMonths(currentDate, 1))}
            className="p-2 hover:bg-[#D4AF37]/20 rounded-xl transition-all text-[#D4AF37]"
            title="Next Month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Add Event Button */}
        {showAddButton && !isReadOnly && onAddEvent && (
          <button
            onClick={onAddEvent}
            className="w-full sm:w-auto px-4 py-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest hover:border-[#D4AF37]/50 rounded-xl transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#D4AF37]/5 min-h-[44px]"
          >
            <Plus size={14} />
            Add Event
          </button>
        )}
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
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayNum = parseInt(dayStr.split('-')[2], 10);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          let borderClass = "border-white/10";
          let bgClass = "bg-gradient-to-br from-[#2a221b]/90 to-[#1a140f]/90 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_0_15px_rgba(255,255,255,0.03)]";
          let textClass = isCurrentMonth ? "text-white/90" : "text-white/30";

          if (isToday) {
            borderClass = "border-[#FFD700]/50";
            bgClass = "bg-gradient-to-br from-[#D4AF37]/15 via-[#1a1208]/80 to-[#FF8C00]/15 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.15),inset_0_0_15px_rgba(212,175,55,0.1)]";
            textClass = "text-transparent bg-clip-text bg-gradient-to-b from-[#FFF0B3] to-[#D4AF37]";
          } else if (isSelected) {
            borderClass = "border-[#FF8C00]/50";
            bgClass = "bg-gradient-to-br from-[#FF8C00]/15 via-[#1a0f08]/80 to-[#FF4500]/15 backdrop-blur-xl shadow-[0_0_20px_rgba(255,140,0,0.15),inset_0_0_15px_rgba(255,140,0,0.1)]";
            textClass = "text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#FF8C00]";
          }

          const dayEvents = getEventsForDay(day);

          return (
            <button
              key={idx}
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
              {dayEvents.length > 0 && (
                <div className="absolute bottom-1.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => {
                    const isLivehouse = (e.type || e.type_of_event || '').toLowerCase().includes('livehouse');
                    const config = isLivehouse 
                      ? { gradient: 'from-[#A855F7] to-[#6366F1]' } // Purple for LIVEHOUSE
                      : (EVENT_COLORS[e.type || ''] || { gradient: 'from-[#D4AF37] to-[#b8960c]' });
                    return <div key={i} className={cn("w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gradient-to-br", config.gradient)} />
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
