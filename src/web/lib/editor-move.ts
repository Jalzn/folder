import type { AutosaveController } from './autosave';

/**
 * Moves the item of an open editor: the snapshot takes the new project and the autosave sends it with the
 * pending edits, at the version the editor holds, so nothing conflicts and nothing is lost. A second flush
 * sends what a failed earlier request left behind. A conflict refuses the move.
 */
export async function moveThroughController<T extends { projectId: string | null }>(
  controller: AutosaveController<T>,
  projectId: string,
) {
  if (controller.getState().status === 'conflict') return false;
  controller.change({ ...controller.getState().snapshot, projectId });
  if (!(await controller.flush())) return false;
  if (controller.getState().status !== 'saved') await controller.flush();
  return controller.getState().status === 'saved' && controller.getState().snapshot.projectId === projectId;
}
