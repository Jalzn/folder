import { boardErrors } from './errors.js';
import type { BoardExternalPorts } from './ports/external.js';

export async function requireProject(source: Pick<BoardExternalPorts, 'findProject'>, id: string) {
  const project = await source.findProject(id);
  if (!project) throw boardErrors.projectMissing();
  return project;
}

export async function requireActiveProject(source: Pick<BoardExternalPorts, 'findProject'>, id: string) {
  const project = await requireProject(source, id);
  if (project.archivedAt) throw boardErrors.projectArchived();
  return project;
}

export async function projectForEditedItem(
  source: Pick<BoardExternalPorts, 'findProject'>,
  current: string,
  requested: string | undefined,
): Promise<string> {
  if (requested === undefined || requested === current) return current;
  return (await requireActiveProject(source, requested)).id;
}
