import { drawingErrors } from './errors.js';
import type { DrawingOrganization } from './ports.js';

export async function requireActiveProject(organization: DrawingOrganization, id: string) {
  const project = await organization.findProject(id);
  if (!project) throw drawingErrors.projectMissing();
  if (project.archivedAt) throw drawingErrors.projectArchived();
  return project;
}

export async function requireFolderInProject(organization: DrawingOrganization, id: string, projectId: string) {
  const folder = await organization.findFolder(id);
  if (!folder || folder.deletedAt) throw drawingErrors.folderMissing();
  if (folder.projectId !== projectId) throw drawingErrors.folderProjectMismatch();
  return folder;
}
