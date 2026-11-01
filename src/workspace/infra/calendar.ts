import { isTimeZone, todayIn } from '@tinyfold/core/domain';
import type { Calendar } from '../application/calendar.js';

/** Where the owner's time zone comes from: the server reads it from auth; tests use a fixed one. */
export type TimeZoneSource = () => Promise<string>;

export const utc: TimeZoneSource = async () => 'UTC';

/**
 * The owner's calendar at the clock's time, read again on each call. A zone Intl does not know reads
 * as UTC, so no read with `today` fails on it: auth already answers UTC for a bad stored zone and
 * warns, and this covers any other source.
 */
export const calendarOf = (clock: () => Date, timeZone: TimeZoneSource) => {
  let checked = { zone: 'UTC', usable: true };
  return async (): Promise<Calendar> => {
    const zone = await timeZone();
    if (checked.zone !== zone) checked = { zone, usable: isTimeZone(zone) };
    const usable = checked.usable ? zone : 'UTC';
    return { timeZone: usable, today: todayIn(usable, clock()) };
  };
};
