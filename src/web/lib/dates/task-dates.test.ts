import { describe, expect, it } from 'vitest';
import { civilDateIn } from './civil-date';
import { daysBetween, longDate, relativeDay, shortCivilDate } from './task-dates';

describe('task dates', () => {
  it('writes the short and long forms in Portuguese', () => {
    expect(shortCivilDate('2026-11-04')).toBe('04 nov');
    expect(shortCivilDate('2026-01-31')).toBe('31 jan');
    expect(longDate('2026-11-04')).toBe('qua 04 nov 2026');
    expect(longDate('2026-02-01')).toBe('dom 01 fev 2026');
  });

  it('counts civil days across months and years', () => {
    expect(daysBetween('2026-10-30', '2026-11-04')).toBe(5);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-11-04', '2026-11-02')).toBe(-2);
  });

  it('says how far a date is from today', () => {
    expect(relativeDay('2026-11-04', '2026-11-04')).toBe('hoje');
    expect(relativeDay('2026-11-05', '2026-11-04')).toBe('amanhã');
    expect(relativeDay('2026-11-03', '2026-11-04')).toBe('ontem');
    expect(relativeDay('2026-11-09', '2026-11-04')).toBe('em 5 dias');
    expect(relativeDay('2026-11-02', '2026-11-04')).toBe('há 2 dias');
  });

  it('reads today in a time zone near midnight UTC', () => {
    const late = new Date('2026-11-04T02:30:00Z');
    expect(civilDateIn('UTC', late)).toBe('2026-11-04');
    expect(civilDateIn('America/Sao_Paulo', late)).toBe('2026-11-03');
    expect(civilDateIn('Pacific/Kiritimati', late)).toBe('2026-11-04');
  });
});
