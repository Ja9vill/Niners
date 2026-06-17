import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

// ---- Helpers (no date-fns dependency) ----

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** Parse a YYYY-MM-DD string to a local Date (avoids UTC shift). Returns null on failure. */
const parseYMD = (str: string): Date | null => {
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

/** Format a Date to YYYY-MM-DD. */
const toYMD = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isToday = (d: Date) => isSameDay(d, new Date());

/** Returns the days to render for a calendar month grid (includes padding from adjacent months). */
const buildMonthGrid = (year: number, month: number): Date[] => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay()); // go back to Sunday
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - last.getDay())); // forward to Saturday

  const days: Date[] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

// ---- SingleDatePicker ----

interface SingleDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  dateFormat?: string;
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
  className = '',
  disabled = false,
  required = false,
  id,
  name,
  title
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = parseYMD(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [isOpen]);

  const days = buildMonthGrid(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const displayLabel = selected
    ? `${MONTH_NAMES[selected.getMonth()].slice(0,3)} ${String(selected.getDate()).padStart(2,'0')}, ${selected.getFullYear()}`
    : '';

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        name={name}
        title={title}
        disabled={disabled}
        onClick={() => setIsOpen(p => !p)}
        className="w-full flex items-center justify-between bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none hover:border-[#D4AF37]/50 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
      >
        <span className={value ? 'text-[#F0EFE8] font-medium' : 'text-[#A09E9A]'}>
          {displayLabel || placeholder}
        </span>
        <CalendarIcon size={14} className="text-[#A09E9A]" />
      </button>
      <input type="hidden" name={name} value={value} required={required} />

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-0 z-40 hidden md:block" onClick={() => setIsOpen(false)} />
          <div className="fixed md:absolute top-1/2 md:top-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 -translate-y-1/2 md:translate-y-0 md:mt-2 w-[300px] bg-[#13131E] border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <button type="button" onClick={e => { e.stopPropagation(); prevMonth(); }} className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer" title="Previous Month">
                <ChevronLeft size={16} />
              </button>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#F0EFE8]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h4>
              <button type="button" onClick={e => { e.stopPropagation(); nextMonth(); }} className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer" title="Next Month">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <span key={d} className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const isCur = day.getMonth() === viewMonth;
                const isSel = selected && isSameDay(day, selected);
                const isTod = isToday(day);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { onChange(toYMD(day)); setIsOpen(false); }}
                    className={`h-9 w-full flex flex-col items-center justify-center text-xs font-bold transition-all relative rounded-lg cursor-pointer ${
                      isSel ? 'bg-[#D4AF37] text-[#0D0D14] font-black'
                      : isCur ? 'text-[#F0EFE8] hover:bg-white/5'
                      : 'text-[#A09E9A]/20 hover:bg-white/[0.01]'
                    }`}
                  >
                    <span>{day.getDate()}</span>
                    {isTod && !isSel && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D4AF37]" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end md:hidden">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#A09E9A] hover:text-white">Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


// ---- DateRangePicker ----

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  placeholderStart?: string;
  placeholderEnd?: string;
  dateFormat?: string;
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
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const parsedStart = parseYMD(startDate);
  const parsedEnd = parseYMD(endDate);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsedStart?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedStart?.getMonth() ?? today.getMonth());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen && parsedStart) {
      setViewYear(parsedStart.getFullYear());
      setViewMonth(parsedStart.getMonth());
    }
  }, [isOpen]);

  const days = buildMonthGrid(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (day: Date) => {
    if (disabled) return;
    if (!parsedStart || (parsedStart && parsedEnd)) {
      onChange(toYMD(day), '');
    } else {
      if (day < parsedStart) {
        onChange(toYMD(day), '');
      } else {
        onChange(toYMD(parsedStart), toYMD(day));
        setIsOpen(false);
      }
    }
  };

  const isInRange = (day: Date) => {
    if (parsedStart && parsedEnd) return day > parsedStart && day < parsedEnd;
    if (parsedStart && hoveredDay && hoveredDay > parsedStart) return day > parsedStart && day < hoveredDay;
    return false;
  };

  const fmtDisplay = (d: Date | null, placeholder: string) =>
    d ? `${MONTH_NAMES[d.getMonth()].slice(0,3)} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}` : placeholder;

  return (
    <div className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(p => !p)}
        className="w-full flex items-center justify-between bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none hover:border-[#D4AF37]/50 focus:border-[#D4AF37] transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={startDate ? 'text-[#F0EFE8] font-mono' : 'text-[#A09E9A]'}>{fmtDisplay(parsedStart, placeholderStart)}</span>
          <span className="text-white/20 font-bold shrink-0">⟶</span>
          <span className={endDate ? 'text-[#F0EFE8] font-mono' : 'text-[#A09E9A]'}>{fmtDisplay(parsedEnd, placeholderEnd)}</span>
        </div>
        <CalendarIcon size={14} className="text-[#A09E9A] shrink-0 ml-2" />
      </button>
      <input type="hidden" value={startDate} required={required} />
      <input type="hidden" value={endDate} required={required} />

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-0 z-40 hidden md:block" onClick={() => setIsOpen(false)} />
          <div className="fixed md:absolute top-1/2 md:top-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 -translate-y-1/2 md:translate-y-0 md:mt-2 w-[300px] bg-[#13131E] border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <button type="button" onClick={e => { e.stopPropagation(); prevMonth(); }} className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer" title="Previous Month">
                <ChevronLeft size={16} />
              </button>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#F0EFE8]">{MONTH_NAMES[viewMonth]} {viewYear}</h4>
              <button type="button" onClick={e => { e.stopPropagation(); nextMonth(); }} className="p-1.5 hover:bg-white/5 rounded-lg text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer" title="Next Month">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <span key={d} className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const isCur = day.getMonth() === viewMonth;
                const isStart = parsedStart && isSameDay(day, parsedStart);
                const isEnd = parsedEnd && isSameDay(day, parsedEnd);
                const inRange = isInRange(day);
                const isTod = isToday(day);
                let cls = 'text-[#F0EFE8] hover:bg-white/5';
                if (!isCur) cls = 'text-[#A09E9A]/20';
                if (isStart || isEnd) cls = 'bg-[#D4AF37] text-[#0D0D14] font-black rounded-lg';
                else if (inRange) cls = 'bg-[#D4AF37]/15 text-[#D4AF37] rounded-none';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoveredDay(day)}
                    className={`h-9 w-full flex flex-col items-center justify-center text-xs font-bold transition-all relative cursor-pointer ${cls}`}
                  >
                    <span>{day.getDate()}</span>
                    {isTod && !isStart && !isEnd && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D4AF37]" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-center">
              <span className="text-[8px] uppercase tracking-widest text-[#A09E9A]/60 font-black">
                {!parsedStart ? 'Select start date' : !parsedEnd ? 'Select end date' : 'Range selected'}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end md:hidden">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#A09E9A] hover:text-white">Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
