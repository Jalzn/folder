import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { createDatabase, type Database, type MigrationModuleDefinition, migrate } from '../infra/index.js';
export interface TempDatabase {
  readonly db: Database;
  readonly folder: string;
  readonly path: string;
  open(filename?: string): Database;
}
export interface OwnedTempDatabase extends TempDatabase {
  dispose(): Promise<void>;
}
/** Every handle opened here belongs to an isolated temporary folder, including restart and migration tests. */
export async function createTempDatabase(
  modules: readonly MigrationModuleDefinition[] = [],
  prefix = 'tinyfold-test-',
): Promise<OwnedTempDatabase> {
  const folder = await mkdtemp(join(tmpdir(), prefix));
  const path = join(folder, 'test.sqlite');
  const handles: Database[] = [];
  const open = (filename = 'test.sqlite') => {
    const db = createDatabase(join(folder, filename));
    handles.push(db);
    return db;
  };
  const db = open();
  const dispose = async () => {
    try {
      for (const handle of handles) await handle.destroy();
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  };
  try {
    if (modules.length) await migrate(db, modules);
  } catch (error) {
    await dispose();
    throw error;
  }
  return { db, folder, path, open, dispose };
}
/** Multiple independently isolated databases in one test, disposed even when setup fails. */
export function useTestDatabases(modules: readonly MigrationModuleDefinition[] = [], prefix = 'tinyfold-test-') {
  const resources: OwnedTempDatabase[] = [];
  afterEach(async () => {
    for (const resource of resources.splice(0)) await resource.dispose();
  });
  return {
    async create(options: { modules?: readonly MigrationModuleDefinition[]; prefix?: string } = {}) {
      const resource = await createTempDatabase(options.modules ?? modules, options.prefix ?? prefix);
      resources.push(resource);
      return resource;
    },
  };
}
export function useTempDatabase(
  modules: readonly MigrationModuleDefinition[],
  prefix = 'tinyfold-test-',
): TempDatabase {
  const databases = useTestDatabases(modules, prefix);
  let current: TempDatabase;
  beforeEach(async () => {
    current = await databases.create();
  });
  return {
    get db() {
      return current.db;
    },
    get folder() {
      return current.folder;
    },
    get path() {
      return current.path;
    },
    open: (filename) => current.open(filename),
  };
}

/** A clock that moves `stepMs` past `start` on every read, so that each write has an instant of its own. */
export function testClock(start: string, stepMs = 1000): () => Date {
  let now = new Date(start);
  return () => {
    now = new Date(now.getTime() + stepMs);
    return now;
  };
}
