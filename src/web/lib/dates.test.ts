import { describe, expect, it } from 'vitest';
import { shortDate } from './dates';

const now = new Date(2026, 9, 31, 15, 0);

describe('shortDate', () => {
  it('says hoje and ontem by calendar day', () => {
    expect(shortDate(new Date(2026, 9, 31, 0, 5).toISOString(), now)).toBe('hoje');
    expect(shortDate(new Date(2026, 9, 30, 23, 55).toISOString(), now)).toBe('ontem');
  });

  it('writes older dates as day and short month', () => {
    expect(shortDate(new Date(2026, 9, 27, 12).toISOString(), now)).toBe('27 out');
    expect(shortDate(new Date(2026, 0, 5, 12).toISOString(), now)).toBe('05 jan');
  });
});
