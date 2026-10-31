import type { AutosaveController } from './autosave';

/** Where a move left the item, as moveItem answers. */
export interface Moved {
  projectId: string;
  version: number;
}

/**
 * Moves the item of an open editor without its content: the editor saves what is pending, `move` writes
 * the new project at the saved version, and the editor takes the project and version it answers, so the
 * next save goes on from there. A conflict refuses the move; an error from `move` is thrown.
 */
export async function moveThroughController<T extends { projectId: string }>(
  controller: AutosaveController<T>,
  move: (version: number) => Promise<Moved>,
) {
  if (controller.getState().status === 'conflict') return false;
  return controller.relocate(async (version) => {
    const moved = await move(version);
    return { version: moved.version, patch: { projectId: moved.projectId } as Partial<T> };
  });
}
