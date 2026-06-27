import { format, parseISO } from 'date-fns';

/**
 * Validate if a date string in YYYY-MM-DD format is a valid date
 */
export const isValidDateString = (dateStr: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = parseISO(dateStr);
  if (isNaN(date.getTime())) return false;
  // Check for date rollover (e.g., "2024-02-30" becomes "2024-03-01")
  return format(date, 'yyyy-MM-dd') === dateStr;
};

/**
 * Parse a time string (e.g., "9AM", "9:30AM", "9:30 AM", "14:00", "14:30") to hour and minute
 * Supports both 12-hour (AM/PM) and 24-hour formats
 */
export const parseTimeStringToHourMin = (timeStr: string) => {
  // Try 24-hour format first (e.g., "14:00", "14:30")
  const match24h = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    const h = parseInt(match24h[1], 10);
    const m = parseInt(match24h[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { h, m };
    }
  }

  // Try 12-hour format (e.g., "9AM", "9:30AM", "9:30 AM")
  const match12h = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match12h) return null;
  let h = parseInt(match12h[1], 10);
  let m = match12h[2] ? parseInt(match12h[2], 10) : 0;
  const isPM = match12h[3] && match12h[3].toUpperCase() === 'PM';
  const isAM = match12h[3] && match12h[3].toUpperCase() === 'AM';

  // If no AM/PM specified, assume 24-hour format and validate bounds
  if (!isAM && !isPM) {
    if (h < 0 || h > 23 || m < 0 || m > 59) return null; // Invalid 24-hour time
  } else {
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
  }
  return { h, m };
};

/**
 * Get the user's local timezone abbreviation (e.g., EST, PST, JST)
 */
export const getLocalTimezoneAbbreviation = (): string => {
  try {
    const shortCode = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value;

    if (shortCode) {
      return shortCode;
    }
    return 'LOCAL';
  } catch {
    return 'LOCAL';
  }
};

/**
 * Shared helper to format a single timestamp from UTC+8 to local time
 */
const formatSingleTimestamp = (ts: string, dateStr: string): string => {
  const parsed = parseTimeStringToHourMin(ts);
  if (!parsed) return ts;
  if (!isValidDateString(dateStr)) return ts;

  const isoString = `${dateStr}T${parsed.h.toString().padStart(2, '0')}:${parsed.m.toString().padStart(2, '0')}:00+08:00`;
  const dateObj = new Date(isoString);
  if (isNaN(dateObj.getTime())) return ts;

  let localH = dateObj.getHours();
  const localM = dateObj.getMinutes();
  const mStr = localM > 0 ? `:${localM.toString().padStart(2, '0')}` : '';

  let result = '';
  if (localH === 0) result = `12${mStr}AM`;
  else if (localH === 12) result = `12${mStr}PM`;
  else result = localH < 12 ? `${localH}${mStr}AM` : `${localH - 12}${mStr}PM`;

  const localDateStr = format(dateObj, 'yyyy-MM-dd');
  if (localDateStr !== dateStr) {
    result += ` (${format(dateObj, 'MMM d')})`;
  }
  return result;
};

/**
 * Format a time in UTC+8 to local time
 */
export const formatLocalTime = (timeStr: string, dateStr: string): string => {
  if (timeStr === 'TBD' || !timeStr) return timeStr;

  try {
    const parts = timeStr.split('-').map(s => s.trim());
    if (parts.length === 1) {
      return formatSingleTimestamp(parts[0], dateStr);
    } else if (parts.length === 2) {
      return `${formatSingleTimestamp(parts[0], dateStr)} - ${formatSingleTimestamp(parts[1], dateStr)}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};

/**
 * Format a date in UTC+8 to local date
 */
export const formatLocalDate = (dateStr: string, timeStr: string): string => {
  if (!timeStr || timeStr === 'TBD') return dateStr;

  try {
    const firstTimePart = timeStr === '00:00' ? '00:00' : timeStr.split('-')[0].trim();
    const parsedTime = parseTimeStringToHourMin(firstTimePart);

    if (!parsedTime) return dateStr;

    const isoString = `${dateStr}T${parsedTime.h.toString().padStart(2, '0')}:${parsedTime.m.toString().padStart(2, '0')}:00+08:00`;
    const dateObj = new Date(isoString);

    if (isNaN(dateObj.getTime())) return dateStr;

    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
};
