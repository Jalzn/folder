import { describe, expect, it } from 'vitest';
import { civilWindowStart, isPastDue } from './date-window.js';
import { readCivilDate } from './time-zone.js';

describe('civil windows', () => {
  it('counts civil days across an offset change rather than subtracting 24-hour periods', () => {
    expect(civilWindowStart(readCivilDate('2026-11-02'), 'America/New_York', 2)).toBe('2026-11-01T04:00:00.000Z');
    expect(civilWindowStart(readCivilDate('2026-11-02'), 'America/New_York', 1)).toBe('2026-11-02T05:00:00.000Z');
  });
  it('requires a positive whole number of days', () => {
    for (const days of [0, -1, 1.5, Number.POSITIVE_INFINITY])
      expect(() => civilWindowStart(readCivilDate('2026-11-02'), 'UTC', days)).toThrow(RangeError);
  });
  it('treats today as due and only earlier dates as past due', () => {
    const today = readCivilDate('2026-11-02');
    expect(isPastDue(readCivilDate('2026-11-01'), today)).toBe(true);
    expect(isPastDue(today, today)).toBe(false);
    expect(isPastDue(readCivilDate('2026-11-03'), today)).toBe(false);
    expect(isPastDue(null, today)).toBe(false);
  });
});
