import { ARCHIVED_NOTE } from '../../lib/text/project-text';
import type { ItemType, Project } from '../../lib/types';
import { useToast } from '../../ui';
import { useNewItems } from '../new-items';
import { useShellActions } from '../shell-ui';
import { useTaskDrawer } from '../task-drawer-state';
/** The folder a Novo menu creates in first, as the one in focus in the tree or the open item's. */
export interface NewItemFolder {
  id: string;
  name: string;
}

export type NewKind = ItemType | 'folder' | 'task' | `here:${ItemType}`;
export function useCreateInProject(project: Project | null, folder: NewItemFolder | undefined, taskColumnId?: string) {
  const app = useNewItems();
  const drawer = useTaskDrawer();
  const ui = useShellActions();
  const toast = useToast();
  return (kind: NewKind) => {
    if (!project) return;
    if (project.archivedAt) return toast(ARCHIVED_NOTE, 'error');
    if (kind === 'here:document' && folder) void app.newDocument(project.id, folder.id);
    else if (kind === 'here:drawing' && folder) void app.newCanvas(project.id, folder.id);
    else if (kind === 'document') void app.newDocument(project.id);
    else if (kind === 'drawing') void app.newCanvas(project.id);
    else if (kind === 'folder') ui.startFolder({ projectId: project.id });
    else drawer.newTask(project.id, taskColumnId ? { columnId: taskColumnId } : {});
  };
}
