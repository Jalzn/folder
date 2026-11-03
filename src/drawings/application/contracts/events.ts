import type { ModuleEvent } from '#core/application';

type VersionEventType = 'drawing.created' | 'drawing.saved' | 'drawing.trashed' | 'drawing.restored' | 'drawing.purged';

export type DrawingEvent =
  | {
      [Type in VersionEventType]: ModuleEvent<Type, { version: number }>;
    }[VersionEventType]
  | ModuleEvent<'drawing.placementChanged', { reason: 'project' | 'folder' | 'pin'; version: number }>
  | ModuleEvent<'drawing.previewStored', { sceneVersion: number; sceneFingerprint: string }>;
