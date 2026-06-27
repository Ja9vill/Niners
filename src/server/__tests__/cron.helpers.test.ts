import { describe, it, expect } from 'vitest';

/**
 * Testing the pure helper function parseManilaTimeToUTC from cron.ts.
 * Re-implemented here since it's not exported.
 */

function parseManilaTimeToUTC(dateStr: string, timeStr: string): number {
  try {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
    if (!timeMatch) return 0;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3].toUpperCase();

    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');

    const isoString = `${dateStr}T${paddedHours}:${paddedMinutes}:00+08:00`;
    const eventDate = new Date(isoString);

    return eventDate.getTime();
  } catch (e) {
    return 0;
  }
}

describe('parseManilaTimeToUTC', () => {
  it('parses AM time correctly', () => {
    const result = parseManilaTimeToUTC('2024-06-15', '9:00 AM');
    // 9:00 AM Manila (UTC+8) = 1:00 AM UTC
    const expected = new Date('2024-06-15T09:00:00+08:00').getTime();
    expect(result).toBe(expected);
  });

  it('parses PM time correctly', () => {
    const result = parseManilaTimeToUTC('2024-06-15', '3:30 PM');
    // 3:30 PM Manila (UTC+8) = 7:30 AM UTC
    const expected = new Date('2024-06-15T15:30:00+08:00').getTime();
    expect(result).toBe(expected);
  });

  it('handles 12:00 PM (noon)', () => {
    const result = parseManilaTimeToUTC('2024-06-15', '12:00 PM');
    const expected = new Date('2024-06-15T12:00:00+08:00').getTime();
    expect(result).toBe(expected);
  });

  it('handles 12:00 AM (midnight)', () => {
    const result = parseManilaTimeToUTC('2024-06-15', '12:00 AM');
    const expected = new Date('2024-06-15T00:00:00+08:00').getTime();
    expect(result).toBe(expected);
  });

  it('returns 0 for invalid time string', () => {
    expect(parseManilaTimeToUTC('2024-06-15', 'invalid')).toBe(0);
    expect(parseManilaTimeToUTC('2024-06-15', '')).toBe(0);
    expect(parseManilaTimeToUTC('2024-06-15', '9AM')).toBe(0); // no colon/minutes
  });

  it('returns 0 or NaN-based result for invalid date string', () => {
    const result = parseManilaTimeToUTC('', '9:00 AM');
    // Empty date string produces an invalid ISO string that results in NaN
    expect(isNaN(result) || result === 0).toBe(true);
  });

  it('handles case insensitive AM/PM', () => {
    const result1 = parseManilaTimeToUTC('2024-06-15', '9:00 am');
    const result2 = parseManilaTimeToUTC('2024-06-15', '9:00 AM');
    expect(result1).toBe(result2);
  });

  it('handles minutes correctly', () => {
    const result = parseManilaTimeToUTC('2024-06-15', '2:45 PM');
    const expected = new Date('2024-06-15T14:45:00+08:00').getTime();
    expect(result).toBe(expected);
  });

  it('produces a valid timestamp (positive number) for valid inputs', () => {
    const result = parseManilaTimeToUTC('2024-01-01', '8:00 AM');
    expect(result).toBeGreaterThan(0);
  });
});
