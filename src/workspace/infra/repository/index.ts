import type { Database } from '@tinyfold/core/infra';
import type { WorkspaceRepository } from '../../application/ports.js';
import { boardRepository } from './board.js';
import { canvasPreviewRepository } from './canvas-previews.js';
import { canvasRepository } from './canvases.js';
import { columnRepository } from './columns.js';
import { documentRepository } from './documents.js';
import { folderRepository } from './folders.js';
import { labelRepository } from './labels.js';
import { moveRepository } from './moves.js';
import { pinRepository } from './pins.js';
import { projectRepository } from './projects.js';
import { taskRepository } from './tasks.js';
import { trashRepository } from './trash.js';

/** Every aggregate's queries bound to one connection or transaction. */
export function workspaceRepository(connection: Database): WorkspaceRepository {
  return {
    ...projectRepository(connection),
    ...folderRepository(connection),
    ...documentRepository(connection),
    ...canvasRepository(connection),
    ...canvasPreviewRepository(connection),
    ...taskRepository(connection),
    ...columnRepository(connection),
    ...labelRepository(connection),
    ...trashRepository(connection),
    ...pinRepository(connection),
    ...moveRepository(connection),
    ...boardRepository(connection),
  };
}
