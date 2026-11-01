import { describe, expect, it } from 'vitest';
import { editedPhrase, savedTime } from './edited-phrase';

describe('editedPhrase', () => {
  it('says today, yesterday or the date, by the civil date in the owner’s time zone', () => {
    expect(editedPhrase('2026-11-01T14:32:00.000Z', '2026-11-01', 'UTC')).toBe('editado hoje');
    expect(editedPhrase('2026-10-31T23:59:00.000Z', '2026-11-01', 'UTC')).toBe('editado ontem');
    expect(editedPhrase('2026-10-28T09:00:00.000Z', '2026-11-01', 'UTC')).toBe('editado em 28 out');
    expect(editedPhrase('2025-12-30T09:00:00.000Z', '2026-01-01', 'UTC')).toBe('editado em 30 dez');
  });

  it('reads the instant in the time zone, not in UTC', () => {
    // 01:30 UTC on 1 November is still 31 October in São Paulo.
    expect(editedPhrase('2026-11-01T01:30:00.000Z', '2026-11-01', 'America/Sao_Paulo')).toBe('editado ontem');
    expect(editedPhrase('2026-11-01T01:30:00.000Z', '2026-10-31', 'America/Sao_Paulo')).toBe('editado hoje');
  });

  it('gives the time of the save in the time zone', () => {
    expect(savedTime('2026-11-01T14:32:00.000Z', 'UTC')).toBe('14:32');
    expect(savedTime('2026-11-01T14:32:00.000Z', 'America/Sao_Paulo')).toBe('11:32');
  });
});
