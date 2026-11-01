import { type Database, readTransaction } from '@tinyfold/core/infra';
import type { ReadingContext } from '../application/reading/ports.js';
import { calendarOf, type TimeZoneSource, utc } from './calendar.js';
import { workspaceReader } from './reader/index.js';

/** One transaction per read, so related queries see the same state. */
export function readingContext(db: Database, clock = () => new Date(), timeZone: TimeZoneSource = utc): ReadingContext {
  return {
    calendar: calendarOf(clock, timeZone),
    read: (work) => readTransaction(db, (trx) => work(workspaceReader(trx))),
  };
}
