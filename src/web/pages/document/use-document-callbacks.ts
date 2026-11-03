import { useRef, useState } from 'react';
import { createEmbedKeys } from '../../editor/blocks/embed-keys';
import { embedText } from '../../editor/blocks/embed-text';
import { createOriginMarkers } from '../../editor/origin-markers';
import type { EmbedCommands } from './DocumentEmbeds';

/** Late-bound document extension callbacks, including their pre-publication fallbacks (WP-8). */
export function useDocumentCallbacks() {
  const embedActions = useRef<EmbedCommands | null>(null);
  const openOrigin = useRef<(taskId: string) => void>(() => undefined);
  const [extensions] = useState(() => [
    createOriginMarkers((taskId) => openOrigin.current(taskId)),
    createEmbedKeys({
      remove: (blockId) => embedActions.current?.remove(blockId),
      describe: (kind, id) =>
        embedActions.current?.describe(kind, id) ?? embedText(kind, id, undefined, window.location.origin),
    }),
  ]);
  return {
    embedCommands: embedActions,
    openOrigin,
    extensions,
    insertEmbedAfter: (blockId: string, taskId: string) =>
      embedActions.current?.insertTaskAfter(blockId, taskId) ?? false,
  };
}
