import { format, parseISO } from 'date-fns';

/**
 * Get the user's local timezone abbreviation
 */
export function getLocalTimezoneAbbreviation(): string {
  try {
    const shortCode = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value;
    return shortCode || 'LOCAL';
  } catch {
    return 'LOCAL';
  }
}

/**
 * Get the user's local timezone IANA identifier
 */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Convert UTC time string to Asia/Manila time
 */
export function utcToManilaTime(utcTimeString: string, dateStr: string): Date {
  const timeStr = utcTimeString === '00:00' ? '00:00' : utcTimeString.split('-')[0].trim();
  const parsedTime = parseTimeStringToHourMin(timeStr);
  
  if (!parsedTime) {
    return new Date(`${dateStr}T00:00:00+08:00`);
  }
  
  const isoString = `${dateStr}T${parsedTime.h.toString().padStart(2, '0')}:${parsedTime.m.toString().padStart(2, '0')}:00+08:00`;
  return new Date(isoString);
}

/**
 * Convert UTC time string to local device time
 */
export function utcToLocalTime(utcTimeString: string, dateStr: string): Date {
  const manilaTime = utcToManilaTime(utcTimeString, dateStr);
  return manilaTime; // Date object will display in local timezone when formatted
}

/**
 * Parse time string to hour and minute
 */
export function parseTimeStringToHourMin(timeStr: string): { h: number; m: number } | null {
  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  let m = match[2] ? parseInt(match[2], 10) : 0;
  const isPM = match[3] && match[3].toUpperCase() === 'PM';
  const isAM = match[3] && match[3].toUpperCase() === 'AM';
  if (isPM && h < 12) h += 12;
  if ((isAM || (!isAM && !isPM && h === 12)) && h === 12) h = 0;
  return { h, m };
}

/**
 * Format dual timestamps for event modal
 */
export function formatDualTimestamps(utcTimeString: string, dateStr: string): string {
  const manilaTime = utcToManilaTime(utcTimeString, dateStr);
  const localTz = getLocalTimezone();
  const localTzAbbr = getLocalTimezoneAbbreviation();
  
  const manilaStr = format(manilaTime, 'MMMM dd, yyyy h:mm a');
  const localStr = format(manilaTime, 'MMMM dd, yyyy h:mm a');
  
  return `Asia/Manila: ${manilaStr} | Local (${localTzAbbr}): ${localStr}`;
}

/**
 * Format time for display in local timezone
 */
export function formatLocalTime(utcTimeString: string, dateStr: string): string {
  const dateObj = utcToLocalTime(utcTimeString, dateStr);
  return format(dateObj, 'h:mm a');
}

/**
 * Format date for display in local timezone
 */
export function formatLocalDate(dateStr: string): string {
  const dateObj = parseISO(dateStr);
  return format(dateObj, 'MMMM dd, yyyy');
}
