import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { createDatabase, type Database, type ModuleDefinition, migrate } from '../infra/index.js';

/** A test's database: the connection, the folder that holds it and the SQLite file's path. */
export interface TempDatabase {
  readonly db: Database;
  readonly folder: string;
  readonly path: string;
}

/**
 * A fresh SQLite file with the modules' migrations for each test, in a folder of its own under the
 * OS temp folder, closed and removed after the test. Read the fields inside a hook or a test.
 */
export function useTempDatabase(modules: readonly ModuleDefinition[], prefix = 'tinyfold-test-'): TempDatabase {
  const state = {} as { db: Database; folder: string; path: string };
  beforeEach(async () => {
    state.folder = await mkdtemp(join(tmpdir(), prefix));
    state.path = join(state.folder, 'test.sqlite');
    state.db = createDatabase(state.path);
    await migrate(state.db, modules);
  });
  afterEach(async () => {
    await state.db.destroy();
    await rm(state.folder, { recursive: true, force: true });
  });
  return state;
}

/** A clock that moves `stepMs` past `start` on every read, so that each write has an instant of its own. */
export function testClock(start: string, stepMs = 1000): () => Date {
  let now = new Date(start);
  return () => {
    now = new Date(now.getTime() + stepMs);
    return now;
  };
}
