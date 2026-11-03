import { bindOperation, operation } from '@tinyfold/core/application';
import { createFolder } from '../application/folders/create-folder.js';
import { listFolders } from '../application/folders/list-folders.js';
import { moveFolder } from '../application/folders/move-folder.js';
import { renameFolder } from '../application/folders/rename-folder.js';
import type { ProjectsContext } from '../application/ports/context.js';
import { createProject } from '../application/projects/create-project.js';
import { listProjects } from '../application/projects/list-projects.js';
import { moveProject } from '../application/projects/move-project.js';
import { updateProject } from '../application/projects/update-project.js';
import * as folders from '../application/schemas/folders.js';
import * as projects from '../application/schemas/projects.js';
export function projectOperations(ctx: ProjectsContext) {
  return {
    listProjects: operation(projects.ListProjectsInput, (input) => listProjects(ctx, input)),
    createProject: operation(projects.CreateProjectInput, (input) => createProject(ctx, input)),
    updateProject: operation(projects.UpdateProjectInput, (input) => updateProject(ctx, input)),
    moveProject: operation(projects.MoveProjectInput, (input) => moveProject(ctx, input)),
    listFolders: operation(folders.ListFoldersInput, (input) => listFolders(ctx, input)),
    createFolder: operation(folders.CreateFolderInput, (input) => createFolder(ctx, input)),
    renameFolder: operation(folders.RenameFolderInput, (input) => renameFolder(ctx, input)),
    moveFolder: operation(folders.MoveFolderInput, (input) => moveFolder(ctx, input)),
  };
}
export function projectApi(ops: ReturnType<typeof projectOperations>) {
  return {
    commands: {
      projects: {
        create: bindOperation(ops.createProject),
        update: bindOperation(ops.updateProject),
        move: bindOperation(ops.moveProject),
      },
      folders: {
        create: bindOperation(ops.createFolder),
        rename: bindOperation(ops.renameFolder),
        move: bindOperation(ops.moveFolder),
      },
    },
    queries: { projects: { list: bindOperation(ops.listProjects) }, folders: { list: bindOperation(ops.listFolders) } },
  };
}
