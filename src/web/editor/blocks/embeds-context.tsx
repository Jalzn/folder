import { createContext, type ReactNode, useContext } from 'react';
import type { EmbeddedDrawing, EmbeddedTask, LiveDrawing, LiveTask } from '../../lib/queries/embeds';
import type { EmbedViewContext } from './embed-view';

/** What an embed can do from its block: open its item, put it back from the trash, or leave the document. */
export interface EmbedActions {
  openTask: (task: LiveTask) => void;
  openDrawing: (drawing: LiveDrawing) => void;
  /** Restaurar of an embed in the trash, at the version the resolver read; the block then takes the focus. */
  restore: (kind: 'task' | 'drawing', item: { id: string; title: string; version: number }, blockId: string) => void;
  /** Remover: the block leaves the document, with Desfazer. */
  remove: (blockId: string) => void;
}

/**
 * The embeds of one open document, for the blocks its editor draws (docs/etapas/11-documento-desenho.md,
 * `embeds-context.tsx`): the resolver's states by item ID, the figures' numbers by block ID, the document's
 * view context and the actions. Each document page gives its own; nothing lives at module level.
 */
export interface EmbedsValue extends EmbedViewContext {
  tasks: ReadonlyMap<string, EmbeddedTask>;
  drawings: ReadonlyMap<string, EmbeddedDrawing>;
  figures: ReadonlyMap<string, number>;
  /** Drawings whose preview the document is making again, or that no preview size can hold. */
  previews: ReadonlyMap<string, 'updating' | 'unavailable'>;
  actions: EmbedActions;
}

const EmbedsContext = createContext<EmbedsValue | null>(null);

export function EmbedsProvider({ value, children }: { value: EmbedsValue; children: ReactNode }) {
  return <EmbedsContext.Provider value={value}>{children}</EmbedsContext.Provider>;
}

/** The document's embeds, or null in an editor without them. */
export const useEmbedsContext = () => useContext(EmbedsContext);
