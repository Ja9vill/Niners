import { describe, it, expect } from 'vitest';
import { isValidDateString, parseTimeStringToHourMin } from '../timezoneUtils';

describe('isValidDateString', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(isValidDateString('2024-01-15')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true); // 2024 is a leap year
    expect(isValidDateString('2024-12-31')).toBe(true);
    expect(isValidDateString('2023-06-01')).toBe(true);
  });

  it('rejects invalid format', () => {
    expect(isValidDateString('2024-1-15')).toBe(false);
    expect(isValidDateString('2024/01/15')).toBe(false);
    expect(isValidDateString('01-15-2024')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('rejects dates that roll over (e.g., Feb 30)', () => {
    expect(isValidDateString('2024-02-30')).toBe(false);
    expect(isValidDateString('2023-02-29')).toBe(false); // 2023 is not a leap year
    expect(isValidDateString('2024-04-31')).toBe(false); // April has 30 days
  });

  it('rejects invalid month/day values', () => {
    expect(isValidDateString('2024-13-01')).toBe(false);
    expect(isValidDateString('2024-00-01')).toBe(false);
  });
});

describe('parseTimeStringToHourMin', () => {
  describe('24-hour format', () => {
    it('parses HH:MM format', () => {
      expect(parseTimeStringToHourMin('14:00')).toEqual({ h: 14, m: 0 });
      expect(parseTimeStringToHourMin('09:30')).toEqual({ h: 9, m: 30 });
      expect(parseTimeStringToHourMin('0:00')).toEqual({ h: 0, m: 0 });
      expect(parseTimeStringToHourMin('23:59')).toEqual({ h: 23, m: 59 });
    });

    it('rejects invalid 24-hour time', () => {
      expect(parseTimeStringToHourMin('25:00')).toBeNull();
      expect(parseTimeStringToHourMin('14:60')).toBeNull();
    });
  });

  describe('12-hour format', () => {
    it('parses time with AM', () => {
      expect(parseTimeStringToHourMin('9AM')).toEqual({ h: 9, m: 0 });
      expect(parseTimeStringToHourMin('9:30AM')).toEqual({ h: 9, m: 30 });
      expect(parseTimeStringToHourMin('9:30 AM')).toEqual({ h: 9, m: 30 });
      expect(parseTimeStringToHourMin('12AM')).toEqual({ h: 0, m: 0 }); // midnight
    });

    it('parses time with PM', () => {
      expect(parseTimeStringToHourMin('1PM')).toEqual({ h: 13, m: 0 });
      expect(parseTimeStringToHourMin('12PM')).toEqual({ h: 12, m: 0 }); // noon
      expect(parseTimeStringToHourMin('11:45PM')).toEqual({ h: 23, m: 45 });
      expect(parseTimeStringToHourMin('3:15 PM')).toEqual({ h: 15, m: 15 });
    });

    it('is case-insensitive', () => {
      expect(parseTimeStringToHourMin('9am')).toEqual({ h: 9, m: 0 });
      expect(parseTimeStringToHourMin('9PM')).toEqual({ h: 21, m: 0 });
      expect(parseTimeStringToHourMin('9pm')).toEqual({ h: 21, m: 0 });
    });
  });

  it('returns null for unparseable strings', () => {
    expect(parseTimeStringToHourMin('')).toBeNull();
    expect(parseTimeStringToHourMin('abc')).toBeNull();
  });
});
