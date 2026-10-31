import { type Database, readTransaction } from '@tinyfold/core/infra';
import type { ReadingContext } from '../application/reading/ports.js';
import { workspaceReader } from './reader/index.js';

/** One transaction per read, so related queries see the same state. */
export function readingContext(db: Database): ReadingContext {
  return { read: (work) => readTransaction(db, (trx) => work(workspaceReader(trx))) };
}
