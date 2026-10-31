import type { Database } from '@tinyfold/core/infra';
import type { WorkspaceRepository } from '../../application/ports.js';
import { boardRepository } from './board.js';
import { canvasRepository } from './canvases.js';
import { documentRepository } from './documents.js';
import { projectRepository } from './projects.js';
import { taskRepository } from './tasks.js';

/** Every aggregate's queries bound to one connection or transaction. */
export function workspaceRepository(connection: Database): WorkspaceRepository {
  return {
    ...projectRepository(connection),
    ...documentRepository(connection),
    ...canvasRepository(connection),
    ...taskRepository(connection),
    ...boardRepository(connection),
  };
}
