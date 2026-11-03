import type { IsoInstant } from './instant.js';
import { addDays, type CivilDate, startOfDayIn } from './time-zone.js';

/** A present civil deadline has passed only on the following day. */
export const isPastDue = (dueOn: CivilDate | null, today: CivilDate): boolean => dueOn !== null && dueOn < today;

/** The first instant of a civil-day window ending today, including both boundary days. */
export function civilWindowStart(today: CivilDate, timeZone: string, days: number): IsoInstant {
  if (!Number.isSafeInteger(days) || days < 1) throw new RangeError('A civil window must contain whole days.');
  return startOfDayIn(addDays(today, 1 - days), timeZone);
}
