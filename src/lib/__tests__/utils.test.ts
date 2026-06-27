import { describe, it, expect } from 'vitest';
import { formatNumber, formatMonth } from '../utils';

describe('formatNumber', () => {
  it('formats integers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('returns simple numbers as-is', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(42)).toBe('42');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
    expect(formatNumber(-500)).toBe('-500');
  });

  it('handles decimal numbers', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });
});

describe('formatMonth', () => {
  it('returns N/A for empty input', () => {
    expect(formatMonth('')).toBe('N/A');
  });

  it('returns input as-is if already formatted (contains space)', () => {
    expect(formatMonth('Jan 2024')).toBe('Jan 2024');
    expect(formatMonth('Dec 2023')).toBe('Dec 2023');
  });

  it('converts YYYY-MM format to "Mon YYYY"', () => {
    expect(formatMonth('2024-01')).toBe('Jan 2024');
    expect(formatMonth('2024-06')).toBe('Jun 2024');
    expect(formatMonth('2024-12')).toBe('Dec 2024');
    expect(formatMonth('2023-03')).toBe('Mar 2023');
  });

  it('returns input as-is if no month part', () => {
    expect(formatMonth('2024')).toBe('2024');
  });

  it('returns input for invalid month index', () => {
    expect(formatMonth('2024-13')).toBe('2024-13');
    expect(formatMonth('2024-00')).toBe('2024-00');
  });
});
