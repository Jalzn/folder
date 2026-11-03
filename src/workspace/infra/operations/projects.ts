import type { WorkspaceContext } from '../../application/ports/context.js';
import { createProject, listProjects, moveProject, updateProject } from '../../application/projects.js';
import {
  CreateProjectInput,
  ListProjectsInput,
  MoveProjectInput,
  UpdateProjectInput,
} from '../../application/schemas/projects.js';
import { operation } from './operation.js';

export const projectOperations = (ctx: WorkspaceContext) => ({
  listProjects: operation(ListProjectsInput, (input) => listProjects(ctx, input)),
  createProject: operation(CreateProjectInput, (input) => createProject(ctx, input)),
  updateProject: operation(UpdateProjectInput, (input) => updateProject(ctx, input)),
  moveProject: operation(MoveProjectInput, (input) => moveProject(ctx, input)),
});
