import { randomUUID } from 'node:crypto';
import { type Database, idempotentWrite, readTransaction, writeTransaction } from '@tinyfold/core/infra';
import type { WorkspaceContext } from '../application/ports.js';
import { workspaceRepository } from './repository/index.js';

export function workspaceContext(db: Database, clock = () => new Date()): WorkspaceContext {
  return {
    now: () => clock().toISOString(),
    newId: randomUUID,
    read: (work) => readTransaction(db, (trx) => work(workspaceRepository(trx))),
    write: (operation, input, work) => idempotentWrite(db, operation, input, (trx) => work(workspaceRepository(trx))),
    repeatableWrite: (work) => writeTransaction(db, (trx) => work(workspaceRepository(trx))),
  };
}
