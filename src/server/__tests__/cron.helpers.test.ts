import { describe, it, expect } from 'vitest';
import { parseManilaTimeToUTC } from '../cron';

describe('parseManilaTimeToUTC', () => {
  it('parses AM time correctly', () => {
    const result = parseManilaTimeToUTC('2024-06-15', '9:00 AM');
    const expected = new Date('2024-06-15T09:00:00+08:00').getTime();
    expect(result).toBe(expected);
  });

  it('parses PM time correctly', () => {
    const result = parseManilaTimeToUTC('2024-06-15', '3:30 PM');
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

  it('returns 0 or NaN-based result for empty date string', () => {
    const result = parseManilaTimeToUTC('', '9:00 AM');
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
