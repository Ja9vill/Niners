import { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, format,
  isSameDay, addMonths, subMonths
} from 'date-fns';
import { CalendarEvent } from '../types';
import { LivehouseDataRow, LivehouseSlot } from '../types/livehouse';
import { formatLocalTime, getLocalTimezoneAbbreviation } from '../lib/timezoneUtils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HOURLY_LABELS: string[] = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12:00 AM';
  if (i < 12) return `${i}:00 AM`;
  if (i === 12) return '12:00 PM';
  return `${i - 12}:00 PM`;
});

const LIVEHOUSE_TYPES = new Set(['Solo Livehouse', 'Party Livehouse', 'SOLO LIVEHOUSE', 'PARTY LIVEHOUSE']);

function isLivehouseEvent(event: CalendarEvent): boolean {
  const t = event.type || event.type_of_event || '';
  return LIVEHOUSE_TYPES.has(t);
}

function parseTimeslotStartHour(timeslot: string): number {
  const match = timeslot.match(/^(\d{1,2})/);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const isPM = /PM/i.test(timeslot);
  const isAM = /AM/i.test(timeslot);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h;
}

export interface CalendarDayData {
  date: string;
  weekday: string;
  isToday: boolean;
  goldDot: boolean;
  firebrickDot: boolean;
  events: CalendarEvent[];
  timeslots: {
    label: string;
    slot1: 'available' | 'hostMatched' | 'unmatched';
    slot2: 'available' | 'hostMatched' | 'unmatched';
  }[];
}

export interface CalendarEngineResult {
  month: string;
  year: number;
  days: CalendarDayData[];
  weeks: CalendarDayData[][];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedDay: CalendarDayData | undefined;
  goNextMonth: () => void;
  goPrevMonth: () => void;
  timezoneMode: 'LOCAL' | 'DEVICE';
  setTimezoneMode: (m: 'LOCAL' | 'DEVICE') => void;
  timezoneCity: string;
  setTimezoneCity: (c: string) => void;
  localTzAbbr: string;
}

interface UseCalendarEngineProps {
  events: CalendarEvent[];
  livehouseSchedule: LivehouseDataRow[];
  loggedInPoppoId: string;
}

function buildTimeslotsForDay(
  dateStr: string,
  schedule: LivehouseDataRow[],
  poppoId: string
): CalendarDayData['timeslots'] {
  const rows = schedule.filter(r => r.date === dateStr);
  return HOURLY_LABELS.map((label, hourIdx) => {
    const row = rows.find(r => parseTimeslotStartHour(r.timeslot) === hourIdx);
    const s1: LivehouseSlot = row?.slot_1 || { available: false, poppo_id: null };
    const s2: LivehouseSlot = row?.slot_2 || { available: false, poppo_id: null };

    const slot1: 'available' | 'hostMatched' | 'unmatched' =
      !s1.available ? 'available'
        : s1.poppo_id === poppoId ? 'hostMatched'
        : s1.poppo_id ? 'unmatched'
        : 'available';

    const slot2: 'available' | 'hostMatched' | 'unmatched' =
      !s2.available ? 'available'
        : s2.poppo_id === poppoId ? 'hostMatched'
        : s2.poppo_id ? 'unmatched'
        : 'available';

    return { label, slot1, slot2 };
  });
}

export function useCalendarEngine({
  events,
  livehouseSchedule,
  loggedInPoppoId
}: UseCalendarEngineProps): CalendarEngineResult {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [timezoneMode, setTimezoneMode] = useState<'LOCAL' | 'DEVICE'>('LOCAL');
  const [timezoneCity, setTimezoneCity] = useState('Asia/Manila');

  const goNextMonth = useCallback(() => {
    setCursor(prev => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  const goPrevMonth = useCallback(() => {
    setCursor(prev => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  const localTzAbbr = useMemo(() => getLocalTimezoneAbbreviation(), []);

  const monthLabel = useMemo(
    () => format(new Date(cursor.year, cursor.month), 'MMMM'),
    [cursor]
  );

  const days = useMemo(() => {
    const start = startOfMonth(new Date(cursor.year, cursor.month));
    const end = endOfMonth(new Date(cursor.year, cursor.month));
    const allDays = eachDayOfInterval({ start, end });

    const dayData = allDays.map((dateObj): CalendarDayData => {
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const weekday = WEEKDAYS[getDay(dateObj)];
      const isToday = dateStr === todayStr;

      const dayEvents = events.filter(ev => {
        const evDate = ev.event_date || ev.date || '';
        return evDate === dateStr;
      });

      const liveEv = dayEvents.filter(isLivehouseEvent);
      const nonLiveEv = dayEvents.filter(ev => !isLivehouseEvent(ev));

      const timeslots = buildTimeslotsForDay(dateStr, livehouseSchedule, loggedInPoppoId);

      return {
        date: dateStr,
        weekday,
        isToday,
        goldDot: nonLiveEv.length > 0,
        firebrickDot: liveEv.length > 0 || timeslots.some(t => t.slot1 !== 'available' || t.slot2 !== 'available'),
        events: dayEvents,
        timeslots
      };
    });

    // Pad with nulls so day 1 aligns with the correct weekday column
    const startDow = getDay(start);
    const padded: (CalendarDayData | null)[] = Array(startDow).fill(null);
    padded.push(...dayData);
    return padded;
  }, [cursor, events, livehouseSchedule, loggedInPoppoId, todayStr]);

  const weeks = useMemo(() => {
    const padded: (CalendarDayData | null)[] = [...days];
    while (padded.length % 7 !== 0) padded.push(null);

    const result: CalendarDayData[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      const row = padded.slice(i, i + 7).filter(Boolean) as CalendarDayData[];
      if (row.length > 0) result.push(row);
    }
    return result;
  }, [days]);

  const selectedDay = useMemo(
    () => (days.filter(Boolean) as CalendarDayData[]).find(d => d.date === selectedDate),
    [days, selectedDate]
  );

  return {
    month: monthLabel,
    year: cursor.year,
    days,
    weeks,
    selectedDate,
    setSelectedDate,
    selectedDay,
    goNextMonth,
    goPrevMonth,
    timezoneMode,
    setTimezoneMode,
    timezoneCity,
    setTimezoneCity,
    localTzAbbr
  };
}
