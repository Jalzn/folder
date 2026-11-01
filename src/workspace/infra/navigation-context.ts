import { type Database, readTransaction } from '@tinyfold/core/infra';
import type { NavigationContext } from '../application/navigation/ports.js';
import { calendarOf, type TimeZoneSource, utc } from './calendar.js';
import { navigationReader } from './navigation/index.js';

/** One transaction per query, so its counts and lists see the same state. */
export function navigationContext(
  db: Database,
  clock = () => new Date(),
  timeZone: TimeZoneSource = utc,
): NavigationContext {
  return {
    calendar: calendarOf(clock, timeZone),
    read: (work) => readTransaction(db, (trx) => work(navigationReader(trx))),
  };
}
