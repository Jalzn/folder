import type { CivilDate, IsoInstant } from '@tinyfold/core/domain';
import { civilWindowStart, isCivilDate, isPastDue } from '@tinyfold/core/domain';

export { isCivilDate };

/** The done column shows the tasks completed in the last 14 civil days, today included. */
export const DONE_WINDOW_DAYS = 14;

/** A task is overdue the day after its due date, outside the done column. Due today is not late. */
export function isOverdue(dueOn: CivilDate | null, today: CivilDate, inDoneColumn: boolean): boolean {
  return !inDoneColumn && isPastDue(dueOn, today);
}

/**
 * The first instant of the done window in the owner's time zone: the start of `today − 13`, so 14
 * civil days with today. The prototype counts from `today − 14`; the difference is recorded.
 */
export function doneWindowStart(today: CivilDate, timeZone: string): IsoInstant {
  return civilWindowStart(today, timeZone, DONE_WINDOW_DAYS);
}
