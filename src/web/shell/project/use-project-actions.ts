import { useNavigate } from '@tanstack/react-router';
import { api, queryClient, requestId } from '../../lib/api';
import { projectsQuery } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { useToast } from '../../ui';
import { useAction } from '../writes';
import { type MoveDirection, moveTarget } from './project-order';

/** The project as the server has it now, for a write that follows another one. */
async function latest(id: string) {
  const projects = await queryClient.fetchQuery({ ...projectsQuery(true), staleTime: 0 });
  const project = projects.find((item) => item.id === id);
  if (!project) throw new Error('Este projeto não existe mais.');
  return project;
}

/** Archiving, unarchiving and the switcher order, with the toasts of docs/etapas/08-fundacao.md. */
export function useProjectActions() {
  const action = useAction();
  const toast = useToast();
  const navigate = useNavigate();

  async function setArchived(id: string, archived: boolean) {
    const project = await latest(id);
    return api.workspace.updateProject({ id, expectedVersion: project.version, archived, requestId: requestId() });
  }
  /** Unarchives; as the undo of an archive (`queued`), after any write in progress. */
  async function unarchive(project: Project, { open = false, queued = false } = {}) {
    const restored = await action.run(() => setArchived(project.id, false), undefined, { queued });
    if (!restored) return;
    toast(`${project.name} desarquivado.`);
    if (open) void navigate({ href: paths.overview(project.id) });
  }
  async function archive(project: Project) {
    const archived = await action.run(() => setArchived(project.id, true));
    if (!archived) return;
    toast(`${project.name} arquivado. O conteúdo está preservado.`, {
      undo: () => unarchive(project, { queued: true }),
      undoLabel: 'Desarquivar',
    });
  }
  async function move(project: Project, projects: Project[], direction: MoveDirection) {
    const beforeProjectId = moveTarget(projects, project.id, direction);
    if (beforeProjectId === undefined) return;
    await action.run(() => api.workspace.moveProject({ id: project.id, beforeProjectId, requestId: requestId() }));
  }
  return { busy: action.busy, archive, unarchive, move };
}
