import { randomUUID } from 'node:crypto';
import type { Database } from '@tinyfold/core/infra';
import type { Folder } from '../domain/folders.js';
import { workspaceRepository } from '../infra/repository/index.js';

/** An active folder at the end of the project's folders, for the items a database test files. */
export async function testFolder(db: Database, projectId: string, name = 'Pasta de teste'): Promise<Folder> {
  const repo = workspaceRepository(db);
  const now = new Date().toISOString();
  const folder: Folder = {
    id: randomUUID(),
    projectId,
    name,
    position: (await repo.activeFolders(projectId)).length,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await repo.insertFolder(folder);
  return folder;
}
