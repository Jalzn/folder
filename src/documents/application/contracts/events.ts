import type { ModuleEvent } from '@tinyfold/core/application';

type Versioned<Type extends string> = ModuleEvent<Type, { version: number }>;

export type DocumentEvent =
  | Versioned<'document.created'>
  | Versioned<'document.saved'>
  | Versioned<'document.trashed'>
  | Versioned<'document.restored'>
  | ModuleEvent<'document.purged', Record<string, never>>
  | ModuleEvent<'document.placementChanged', { reason: 'project' | 'folder' | 'pin'; version?: number }>;
