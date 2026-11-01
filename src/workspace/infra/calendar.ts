import { todayIn } from '@tinyfold/core/domain';
import type { Calendar } from '../application/calendar.js';

/** Where the owner's time zone comes from: the server reads it from auth; tests use a fixed one. */
export type TimeZoneSource = () => Promise<string>;

export const utc: TimeZoneSource = async () => 'UTC';

/** The owner's calendar at the clock's time, read again on each call. */
export const calendarOf = (clock: () => Date, timeZone: TimeZoneSource) => async (): Promise<Calendar> => {
  const zone = await timeZone();
  return { timeZone: zone, today: todayIn(zone, clock()) };
};
