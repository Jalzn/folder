import { readCivilDate, readIsoInstant } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import { DONE_WINDOW_DAYS, doneWindowStart, isCivilDate, isOverdue } from './task-dates.js';

describe('task dates', () => {
  it('is overdue the day after the due date, never on it nor in the done column', () => {
    expect(isOverdue(readCivilDate('2026-10-31'), readCivilDate('2026-11-01'), false)).toBe(true);
    expect(isOverdue(readCivilDate('2026-11-01'), readCivilDate('2026-11-01'), false)).toBe(false);
    expect(isOverdue(readCivilDate('2026-11-02'), readCivilDate('2026-11-01'), false)).toBe(false);
    expect(isOverdue(readCivilDate('2026-10-31'), readCivilDate('2026-11-01'), true)).toBe(false);
    expect(isOverdue(null, readCivilDate('2026-11-01'), false)).toBe(false);
  });

  it('starts the done window 13 days before today, at midnight in the owner’s time zone', () => {
    expect(DONE_WINDOW_DAYS).toBe(14);
    expect(doneWindowStart(readCivilDate('2026-11-01'), 'UTC')).toBe(readIsoInstant('2026-10-19T00:00:00.000Z'));
    expect(doneWindowStart(readCivilDate('2026-11-01'), 'America/Sao_Paulo')).toBe(
      readIsoInstant('2026-10-19T03:00:00.000Z'),
    );
  });

  it('takes only real dates as due dates', () => {
    expect(isCivilDate(readCivilDate('2026-11-04'))).toBe(true);
    for (const date of ['2026-02-30', '2026-11-4', '04/11/2026']) expect(isCivilDate(date)).toBe(false);
  });
});
