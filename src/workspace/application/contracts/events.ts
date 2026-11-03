import type { ModuleEvent } from '@tinyfold/core/application';

export type WorkspaceChangeReason =
  | 'workspace.createTask'
  | 'workspace.deleteFolder'
  | 'workspace.restoreFolder'
  | 'workspace.moveItem'
  | 'workspace.pinItem'
  | 'workspace.unpinItem'
  | 'workspace.purgeDocument'
  | 'workspace.emptyTrash';

export type WorkspaceChangeScope =
  | { kind: 'folder'; folderId: string }
  | { kind: 'item'; itemType: 'document' | 'drawing'; itemId: string }
  | { kind: 'document'; documentId: string }
  | { kind: 'trash'; projectId: string }
  | { kind: 'task'; taskId: string; projectId: string; documentId: string };

export type WorkspaceEvent = ModuleEvent<
  'workspace.changed',
  { reason: WorkspaceChangeReason; scope: WorkspaceChangeScope }
>;
