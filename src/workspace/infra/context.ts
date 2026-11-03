import { randomUUID } from 'node:crypto';
import { type Database, idempotentWrite, readTransaction, writeTransaction } from '@tinyfold/core/infra';
import type { WorkspaceContext } from '../application/ports/context.js';
import { calendarOf, type TimeZoneSource, utc } from './calendar.js';
import { workspaceRepository } from './repository/index.js';

export function workspaceContext(
  db: Database,
  clock = () => new Date(),
  timeZone: TimeZoneSource = utc,
): WorkspaceContext {
  return {
    now: () => clock().toISOString(),
    calendar: calendarOf(clock, timeZone),
    newId: randomUUID,
    read: (work) => readTransaction(db, (trx) => work(workspaceRepository(trx))),
    write: (operation, input, work) =>
      idempotentWrite(db, operation, input, (trx) => work(workspaceRepository(trx)), {
        now: () => clock().toISOString(),
      }),
    writeWithoutRequestRecord: (work) => writeTransaction(db, (trx) => work(workspaceRepository(trx))),
  };
}
