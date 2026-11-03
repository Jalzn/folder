import { coreModule } from '@tinyfold/core/infra';
import { type TempDatabase, testClock, useTempDatabase } from '@tinyfold/core/testing';
import { beforeEach } from 'vitest';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService, type WorkspaceService } from '../infra/service.js';

/** A test's workspace database and the service over it. */
export interface WorkspaceDb extends TempDatabase {
  readonly service: WorkspaceService;
}

/**
 * A fresh database with the core and workspace migrations for each test, and the workspace service
 * over it. With `start`, the service's clock starts there and moves a second on every read; without
 * it, the service reads the system clock. Read the fields inside a hook or a test.
 */
export function useWorkspaceDb({ prefix, start }: { prefix?: string; start?: string } = {}): WorkspaceDb {
  const database = useTempDatabase([coreModule, workspaceModule], prefix);
  let service: WorkspaceService;
  beforeEach(() => {
    service = createWorkspaceService(database.db, start ? testClock(start) : undefined);
  });
  return {
    open: (filename) => database.open(filename),
    get db() {
      return database.db;
    },
    get folder() {
      return database.folder;
    },
    get path() {
      return database.path;
    },
    get service() {
      return service;
    },
  };
}
