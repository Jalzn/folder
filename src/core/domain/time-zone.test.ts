import { describe, expect, it } from 'vitest';
import { addDays, isCivilDate, isTimeZone, startOfDayIn, todayIn } from './time-zone.js';

describe('time zones', () => {
  it('tells the civil date in a zone near midnight UTC', () => {
    const lateEvening = new Date('2026-11-01T02:30:00.000Z');
    expect(todayIn('America/Sao_Paulo', lateEvening)).toBe('2026-10-31');
    expect(todayIn('Europe/Lisbon', lateEvening)).toBe('2026-11-01');
    expect(todayIn('UTC', lateEvening)).toBe('2026-11-01');
    expect(todayIn('Pacific/Kiritimati', new Date('2026-10-31T10:30:00.000Z'))).toBe('2026-11-01');
    expect(todayIn('Pacific/Kiritimati', new Date('2026-10-31T09:59:59.000Z'))).toBe('2026-10-31');
  });

  it('starts a day at its first instant, also across daylight saving time and a gap at midnight', () => {
    expect(startOfDayIn('2026-03-08', 'America/New_York')).toBe('2026-03-08T05:00:00.000Z');
    expect(startOfDayIn('2026-03-09', 'America/New_York')).toBe('2026-03-09T04:00:00.000Z');
    expect(startOfDayIn('2026-11-01', 'America/New_York')).toBe('2026-11-01T04:00:00.000Z');
    expect(startOfDayIn('2026-11-02', 'America/New_York')).toBe('2026-11-02T05:00:00.000Z');
    expect(startOfDayIn('2026-10-31', 'America/Sao_Paulo')).toBe('2026-10-31T03:00:00.000Z');
    // Brazil's daylight saving time began at midnight: 4 November 2018 started at 01:00.
    expect(startOfDayIn('2018-11-04', 'America/Sao_Paulo')).toBe('2018-11-04T03:00:00.000Z');
    expect(startOfDayIn('2026-11-01', 'Pacific/Kiritimati')).toBe('2026-10-31T10:00:00.000Z');
    expect(startOfDayIn('2026-11-01', 'UTC')).toBe('2026-11-01T00:00:00.000Z');
  });

  it('adds whole days across months, years and leap days', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-01', -13)).toBe('2026-10-19');
  });

  it('knows real dates and time zones, and refuses the others', () => {
    for (const date of ['2026-02-28', '2028-02-29', '2026-12-31']) expect(isCivilDate(date)).toBe(true);
    for (const date of ['2026-02-30', '2026-2-3', '2026-13-01', '26-01-01', '2026-01-01T00:00', ''])
      expect(isCivilDate(date)).toBe(false);
    expect(isTimeZone('America/Sao_Paulo')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
    expect(() => todayIn('Mars/Olympus', new Date())).toThrow(RangeError);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
  });
});
