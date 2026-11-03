import { describe, expect, it } from 'vitest';
import { toIsoInstant } from '#core/domain';
import { shortInstant } from './dates';

const now = new Date(2026, 9, 31, 15, 0);

describe('shortInstant', () => {
  it('says hoje and ontem by calendar day', () => {
    expect(shortInstant(toIsoInstant(new Date(2026, 9, 31, 0, 5)), now)).toBe('hoje');
    expect(shortInstant(toIsoInstant(new Date(2026, 9, 30, 23, 55)), now)).toBe('ontem');
  });

  it('writes older dates as day and short month', () => {
    expect(shortInstant(toIsoInstant(new Date(2026, 9, 27, 12)), now)).toBe('27 out');
    expect(shortInstant(toIsoInstant(new Date(2026, 0, 5, 12)), now)).toBe('05 jan');
  });
});
