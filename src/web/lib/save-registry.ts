import type { SaveStatus } from './autosave';
import type { Moved } from './editor-move';
import type { ItemType } from './types';

/** What the registry needs of an AutosaveController: its status and change notifications. */
export interface SaveSource {
  getState(): { status: SaveStatus };
  subscribe(listener: () => void): () => void;
}

const sources = new Map<string, SaveSource>();
const listeners = new Set<() => void>();
let pending: ReadonlySet<string> = new Set();

const keyOf = (type: ItemType, id: string) => `${type}:${id}`;

function refresh() {
  const next = new Set<string>();
  for (const [key, source] of sources) if (source.getState().status !== 'saved') next.add(key);
  if (next.size === pending.size && [...next].every((key) => pending.has(key))) return;
  pending = next;
  for (const listener of listeners) listener();
}

/**
 * Follows the autosave of a document or drawing opened in this tab, for the sidebar's "não salvo" dot: a
 * change not yet confirmed by the server, or a failed save. Editors keep their controllers for the whole
 * session, so a registration lasts until `unregister` (tests) or the page closes.
 */
export function registerSave(type: ItemType, id: string, source: SaveSource) {
  const key = keyOf(type, id);
  if (sources.get(key) === source) return () => undefined;
  sources.set(key, source);
  const unsubscribe = source.subscribe(refresh);
  refresh();
  return () => {
    unsubscribe();
    if (sources.get(key) === source) sources.delete(key);
    refresh();
  };
}

export function subscribePendingSaves(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The items with unconfirmed changes, as `<type>:<id>`; the same set until it changes. */
export const pendingSaves = () => pending;

export const isPendingSave = (saves: ReadonlySet<string>, type: ItemType, id: string) => saves.has(keyOf(type, id));

/** An editor open in this tab: moving its item goes through its own autosave. */
export interface OpenEditor {
  /**
   * Saves what is pending, then runs `move` at the saved version and takes the project and version it
   * answers; false when the content cannot be saved first.
   */
  moveTo: (move: (version: number) => Promise<Moved>) => Promise<boolean>;
}

const openEditors = new Map<string, OpenEditor>();

/** Called by an editor while it is mounted; the returned function forgets it. */
export function registerOpenEditor(type: ItemType, id: string, editor: OpenEditor) {
  const key = keyOf(type, id);
  openEditors.set(key, editor);
  return () => {
    if (openEditors.get(key) === editor) openEditors.delete(key);
  };
}

export const openEditor = (type: ItemType, id: string) => openEditors.get(keyOf(type, id));
