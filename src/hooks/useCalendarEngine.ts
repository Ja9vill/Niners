import { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, format,
  startOfWeek, endOfWeek
} from 'date-fns';
import { CalendarEvent } from '../types';
import { LivehouseDataRow, LivehouseSlot } from '../types/livehouse';
import { getLocalTimezoneAbbreviation } from '../lib/timezoneUtils';

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
  isPadding: boolean;
  goldDot: boolean;
  orangeDot: boolean;
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
  days: (CalendarDayData | null)[];
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

function buildDayData(
  dateObj: Date,
  events: CalendarEvent[],
  livehouseSchedule: LivehouseDataRow[],
  loggedInPoppoId: string,
  todayStr: string,
  isPadding: boolean
): CalendarDayData {
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
    isPadding,
    goldDot: nonLiveEv.length > 0,
    orangeDot: liveEv.length > 0 || timeslots.some(t => t.slot1 !== 'available' || t.slot2 !== 'available'),
    events: dayEvents,
    timeslots
  };
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
    const monthStart = new Date(cursor.year, cursor.month, 1);
    const monthEnd = endOfMonth(monthStart);

    // Full 6-week range that starts on Monday
    const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    const allGridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const monthStr = format(monthStart, 'yyyy-MM');

    return allGridDays.map((dateObj): CalendarDayData => {
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const isPadding = !dateStr.startsWith(monthStr);
      return buildDayData(dateObj, events, livehouseSchedule, loggedInPoppoId, todayStr, isPadding);
    });
  }, [cursor, events, livehouseSchedule, loggedInPoppoId, todayStr]);

  const weeks = useMemo(() => {
    const result: CalendarDayData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const selectedDay = useMemo(
    () => days.find(d => d.date === selectedDate),
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
