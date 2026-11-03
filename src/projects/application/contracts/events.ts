import type { ModuleEvent } from '@tinyfold/core/application';

interface ProjectEventPayloads {
  'project.created': { version: number };
  'project.updated': { version: number };
  'project.reordered': { position: number };
  'folder.created': { projectId: string; version: number };
  'folder.renamed': { projectId: string; version: number };
  'folder.reordered': { position: number };
  'folder.trashed': { projectId: string; version: number };
  'folder.restored': { projectId: string; version: number };
}

export type ProjectEvent = {
  [Type in keyof ProjectEventPayloads]: ModuleEvent<Type, ProjectEventPayloads[Type]>;
}[keyof ProjectEventPayloads];
