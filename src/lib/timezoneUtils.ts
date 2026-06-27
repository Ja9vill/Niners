import { format } from 'date-fns';

/**
 * Parse a time string (e.g., "9AM", "9:30AM", "9:30 AM") to hour and minute
 */
export const parseTimeStringToHourMin = (timeStr: string) => {
  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  let m = match[2] ? parseInt(match[2], 10) : 0;
  const isPM = match[3] && match[3].toUpperCase() === 'PM';
  const isAM = match[3] && match[3].toUpperCase() === 'AM';
  if (isPM && h < 12) h += 12;
  if ((isAM || (!isAM && !isPM && h === 12)) && h === 12) h = 0;
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
 * Format a time in UTC+8 to local time
 */
export const formatLocalTime = (timeStr: string, dateStr: string): string => {
  if (timeStr === 'TBD' || !timeStr) return timeStr;
  
  try {
    const formatLocal = (ts: string) => {
      const parsed = parseTimeStringToHourMin(ts);
      if (!parsed) return ts;
      
      const isoString = `${dateStr}T${parsed.h.toString().padStart(2, '0')}:${parsed.m.toString().padStart(2, '0')}:00+08:00`;
      const dateObj = new Date(isoString);
      
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

    const parts = timeStr.split('-').map(s => s.trim());
    if (parts.length === 1) {
      return formatLocal(parts[0]);
    } else if (parts.length === 2) {
      return `${formatLocal(parts[0])} - ${formatLocal(parts[1])}`;
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

/**
 * Format dual timestamps (e.g., "9AM - 10AM") with local timezone conversion
 */
export const formatDualTimestamps = (timeStr: string, dateStr: string): string => {
  if (timeStr === 'TBD' || !timeStr) return timeStr;
  
  try {
    const formatLocal = (ts: string) => {
      const parsed = parseTimeStringToHourMin(ts);
      if (!parsed) return ts;
      
      const isoString = `${dateStr}T${parsed.h.toString().padStart(2, '0')}:${parsed.m.toString().padStart(2, '0')}:00+08:00`;
      const dateObj = new Date(isoString);
      
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

    const parts = timeStr.split('-').map(s => s.trim());
    if (parts.length === 1) {
      return formatLocal(parts[0]);
    } else if (parts.length === 2) {
      return `${formatLocal(parts[0])} - ${formatLocal(parts[1])}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};
