import { randomUUID } from 'node:crypto';
import type { WorkspaceService } from '../../workspace/service.js';

/** An active folder at the top of the project's folders, for the items a database test files. */
export const testFolder = (service: WorkspaceService, projectId: string, name = 'Pasta de teste') =>
  service.createFolder({ requestId: randomUUID(), projectId, name });
