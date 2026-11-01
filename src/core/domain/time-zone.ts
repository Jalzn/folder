/**
 * Civil dates (`YYYY-MM-DD`) in an IANA time zone, by Intl alone: the day it is somewhere, the
 * instant a day starts there, and whole days added to a date. Time zones with daylight saving
 * time and days that start after midnight (a spring-forward gap at 00:00) are handled.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let found = formatters.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, found);
  }
  return found;
}

/** The wall clock in the zone at `instant`, as the UTC milliseconds that read the same. */
function wallClock(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');
const civil = (utc: Date) => `${pad(utc.getUTCFullYear(), 4)}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;

/** Whether Intl knows the time zone, such as "America/Sao_Paulo" or "UTC". */
export function isTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Whether the text is a real date of the calendar: "2026-02-30" is not. */
export function isCivilDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return civil(utc) === date;
}

/** The civil date it is in the zone at `now`. */
export function todayIn(timeZone: string, now: Date): string {
  return civil(new Date(wallClock(now.getTime(), timeZone)));
}

/** The date `days` whole days after `date` (before, when negative). */
export function addDays(date: string, days: number): string {
  if (!isCivilDate(date)) throw new RangeError(`Not a civil date: ${date}`);
  const [year, month, day] = date.split('-').map(Number);
  return civil(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days)));
}

/** The first instant of `date` in the zone, as an ISO string in UTC. */
export function startOfDayIn(date: string, timeZone: string): string {
  if (!isCivilDate(date)) throw new RangeError(`Not a civil date: ${date}`);
  const midnight = Date.parse(`${date}T00:00:00.000Z`);
  const offset = (instant: number) => wallClock(instant, timeZone) - instant;
  // The instant whose wall clock reads midnight, under the offset before and after it.
  const first = midnight - offset(midnight);
  const candidates = [first, midnight - offset(first), midnight - offset(midnight - 86_400_000)];
  const onTheDay = candidates.filter((instant) => civil(new Date(wallClock(instant, timeZone))) === date);
  // A spring-forward gap at midnight starts the day later; any candidate on the day is at or after it.
  const start = Math.min(...(onTheDay.length ? onTheDay : candidates));
  // Back to the earliest instant of the date, a minute at a time, past a gap of up to an hour.
  let earliest = start;
  for (let step = 1; step <= 60; step += 1) {
    const before = start - step * 60_000;
    if (civil(new Date(wallClock(before, timeZone))) !== date) break;
    earliest = before;
  }
  return new Date(earliest).toISOString();
}
