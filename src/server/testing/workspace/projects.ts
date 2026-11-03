import { randomUUID } from 'node:crypto';
import type { WorkspaceService } from '../../workspace/service.js';

/** An active project for the items a database test creates, since every item needs one. */
export const testProject = (service: WorkspaceService, name = 'Projeto de teste') =>
  service.createProject({ requestId: randomUUID(), name });
