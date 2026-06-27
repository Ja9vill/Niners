import React, { useState, useEffect, useRef } from 'react';
import { 
  format, 
  parse, 
  isValid, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  isWithinInterval, 
  addMonths, 
  subMonths,
  isAfter,
  isBefore,
  isToday
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const parseDateStr = (str: string, pattern: string): Date | null => {
  if (!str) return null;
  try {
    // pattern mapping for safety
    const fmtPattern = pattern === 'YYYY-MM-DD' ? 'yyyy-MM-dd' : pattern === 'DD-MM-YYYY' ? 'dd-MM-yyyy' : pattern;
    const parsed = parse(str, fmtPattern, new Date());
    return isValid(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
};

const formatDateStr = (date: Date | null, pattern: string): string => {
  if (!date) return '';
  const fmtPattern = pattern === 'YYYY-MM-DD' ? 'yyyy-MM-dd' : pattern === 'DD-MM-YYYY' ? 'dd-MM-yyyy' : pattern;
  return format(date, fmtPattern);
};

interface SingleDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  dateFormat?: string; // 'yyyy-MM-dd' or 'dd-MM-yyyy'
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  title?: string;
}

export const SingleDatePicker: React.FC<SingleDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select Date',
  dateFormat = 'yyyy-MM-dd',
  className = '',
  disabled = false,
  required = false,
  id,
  name,
  title
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDateStr(value, dateFormat);
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync current month with value when opened
  useEffect(() => {
    if (isOpen && selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [isOpen]);

  const handleDaySelect = (day: Date) => {
    if (disabled) return;
    const formatted = formatDateStr(day, dateFormat);
    onChange(formatted);
    setIsOpen(false);
  };

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const startDateGrid = startOfWeek(firstDayOfMonth);
  const endDateGrid = endOfWeek(lastDayOfMonth);

  const daysGrid = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        name={name}
        title={title}
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none hover:border-[#D4AF37]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
      >
        <span className={value ? 'text-[#F0EFE8] font-medium' : 'text-[#A09E9A]'}>
          {value ? formatDateStr(selectedDate, dateFormat) : placeholder}
        </span>
        <CalendarIcon size={14} className="text-[#A09E9A]" />
      </button>

      {/* Hidden inputs to support HTML form submissions */}
      <input type="hidden" name={name} value={value} required={required} />

      {isOpen && (
        <>
          {/* Mobile Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          {/* Desktop invisible backdrop to click away */}
          <div 
            className="fixed inset-0 z-40 hidden md:block" 
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar Picker Card */}
          <div className="fixed md:absolute top-1/2 md:top-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 -translate-y-1/2 md:translate-y-0 md:mt-2 w-[300px] bg-[#13131E] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <button 
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#F0EFE8]">
                {format(currentMonth, 'MMMM yyyy')}
              </h4>
              <button 
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <span key={d} className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentToday = isToday(day);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDaySelect(day)}
                    className={`h-9 w-full flex flex-col items-center justify-center text-xs font-bold transition-all relative rounded-lg cursor-pointer ${
                      isSelected
                        ? 'bg-[#D4AF37] text-[#0D0D14] font-black'
                        : isCurrentMonth
                          ? 'text-[#F0EFE8] hover:bg-white/5 hover:text-white'
                          : 'text-[#A09E9A]/20 hover:bg-white/[0.01]'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {isCurrentToday && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D4AF37]" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Mobile Close Button bar */}
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end md:hidden">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#A09E9A] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  placeholderStart?: string;
  placeholderEnd?: string;
  dateFormat?: string; // 'yyyy-MM-dd' or 'dd-MM-yyyy'
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  placeholderStart = 'From Date',
  placeholderEnd = 'To Date',
  dateFormat = 'yyyy-MM-dd',
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const parsedStart = parseDateStr(startDate, dateFormat);
  const parsedEnd = parseDateStr(endDate, dateFormat);
  
  const [currentMonth, setCurrentMonth] = useState<Date>(parsedStart || new Date());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  // Sync current month when opened
  useEffect(() => {
    if (isOpen && parsedStart) {
      setCurrentMonth(parsedStart);
    }
  }, [isOpen]);

  const handleDayClick = (day: Date) => {
    if (disabled) return;

    if (!parsedStart || (parsedStart && parsedEnd)) {
      // Start a new range
      onChange(formatDateStr(day, dateFormat), '');
    } else {
      // Set end date
      if (isBefore(day, parsedStart)) {
        // Reset start date if clicked date is before start date
        onChange(formatDateStr(day, dateFormat), '');
      } else {
        onChange(formatDateStr(parsedStart, dateFormat), formatDateStr(day, dateFormat));
        setIsOpen(false); // Close when end date is chosen
      }
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const startDateGrid = startOfWeek(firstDayOfMonth);
  const endDateGrid = endOfWeek(lastDayOfMonth);

  const daysGrid = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });

  const getDayStatus = (day: Date) => {
    const isStart = parsedStart && isSameDay(day, parsedStart);
    const isEnd = parsedEnd && isSameDay(day, parsedEnd);
    
    let isInRange = false;
    let isHoverRange = false;

    if (parsedStart && parsedEnd) {
      isInRange = isWithinInterval(day, { start: parsedStart, end: parsedEnd });
    } else if (parsedStart && hoveredDay && isAfter(hoveredDay, parsedStart)) {
      isHoverRange = isWithinInterval(day, { start: parsedStart, end: hoveredDay });
    }

    return { isStart, isEnd, isInRange, isHoverRange };
  };

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* Trigger Unified Field */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none hover:border-[#D4AF37]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={startDate ? 'text-[#F0EFE8] font-mono' : 'text-[#A09E9A]'}>
            {startDate ? formatDateStr(parsedStart, dateFormat) : placeholderStart}
          </span>
          <span className="text-white/20 font-bold shrink-0">⟶</span>
          <span className={endDate ? 'text-[#F0EFE8] font-mono' : 'text-[#A09E9A]'}>
            {endDate ? formatDateStr(parsedEnd, dateFormat) : placeholderEnd}
          </span>
        </div>
        <CalendarIcon size={14} className="text-[#A09E9A] shrink-0 ml-2" />
      </button>

      {/* Hidden fields to satisfy required checks in forms */}
      <input type="hidden" value={startDate} required={required} />
      <input type="hidden" value={endDate} required={required} />

      {isOpen && (
        <>
          {/* Backdrop for click away / mobile */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="fixed inset-0 z-40 hidden md:block" 
            onClick={() => setIsOpen(false)}
          />

          {/* Range Picker Calendar Panel */}
          <div className="fixed md:absolute top-1/2 md:top-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 -translate-y-1/2 md:translate-y-0 md:mt-2 w-[300px] bg-[#13131E] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <button 
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#F0EFE8]">
                {format(currentMonth, 'MMMM yyyy')}
              </h4>
              <button 
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <span key={d} className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const { isStart, isEnd, isInRange, isHoverRange } = getDayStatus(day);
                const isCurrentToday = isToday(day);

                // Styling logic
                let dayStyle = 'text-[#F0EFE8] hover:bg-white/5';
                if (!isCurrentMonth) {
                  dayStyle = 'text-[#A09E9A]/20 hover:bg-white/[0.01]';
                }

                if (isStart || isEnd) {
                  dayStyle = 'bg-[#D4AF37] text-[#0D0D14] font-black rounded-lg';
                } else if (isInRange) {
                  dayStyle = 'bg-[#D4AF37]/15 text-[#D4AF37] rounded-none';
                } else if (isHoverRange) {
                  dayStyle = 'bg-[#D4AF37]/10 text-[#D4AF37]/75 rounded-none';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoveredDay(day)}
                    className={`h-9 w-full flex flex-col items-center justify-center text-xs font-bold transition-all relative cursor-pointer ${dayStyle}`}
                  >
                    <span>{format(day, 'd')}</span>
                    {isCurrentToday && !isStart && !isEnd && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D4AF37]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Helper label for range */}
            <div className="mt-3 text-center">
              <span className="text-[8px] uppercase tracking-widest text-[#A09E9A]/60 font-black">
                {!parsedStart ? 'Select start date' : !parsedEnd ? 'Select end date' : 'Range selected'}
              </span>
            </div>

            {/* Mobile Footer close */}
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end md:hidden">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#A09E9A] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
