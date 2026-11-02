import { queryClient, reportSessionError } from '../api';
import { withDraftProject } from '../draft-project';
import { invalidateNavigation, keys } from '../queries';
import { registerSave } from '../save-registry';
import type { ItemType } from '../types';
import { AutosaveController } from './controller';
import type { DraftStorage, Legacy, SaveAck, SavedDraft, SaveInput } from './types';

/** What an open document or drawing is, as its query holds it. */
interface FiledItem {
  id: string;
  version: number;
  projectId: string;
}

/**
 * How one kind of open item saves (WP-4): the document and the drawing differ only by what is written here. A
 * task's text keeps its own session (task-session.ts), with a pool that lets it go once saved.
 */
export interface ItemSessionSpec<S extends { projectId: string }, Item extends FiledItem, Extra extends object> {
  type: ItemType;
  snapshot: (item: Item) => S;
  storage: (installationId: string, id: string) => DraftStorage;
  /** The stored draft's format; a draft from before every item had a project takes the item's. */
  readDraft: (raw: string | null) => SavedDraft<Legacy<S>> | null;
  /** Refuses a save before it leaves, by throwing, as one over the size limit. */
  check?: (input: SaveInput<S>) => void;
  /** The save, without the project: moving goes through moveItem, never through a save. */
  save: (input: Omit<SaveInput<S>, 'projectId'>) => Promise<SaveAck>;
  /** The item the cache holds after an accepted save, from the one it held; a newer one stays as it is. */
  saved: (previous: Item, sent: S, ack: SaveAck) => Item;
  /** The lists a save changes, besides the sidebar and the overview. */
  invalidate: readonly (readonly unknown[])[];
  equal?: (left: S, right: S) => boolean;
  draftDelayMs?: number;
  /** What lives beside the autosave, as the drawing's previews; made before it, it reads it through `controller`. */
  extra?: (item: Item, controller: () => AutosaveController<S>) => Extra;
  afterSave?: (extra: Extra, ack: SaveAck, sent: S) => void;
  onAdopted?: (extra: Extra, snapshot: S, version: number) => void;
}

export type ItemSession<S, Extra extends object> = { controller: AutosaveController<S> } & Extra;

/**
 * The sessions of one kind of open item, one per installation and item for the life of the tab: saving outlives
 * the editor, so leaving right after an edit loses nothing.
 */
export function defineItemSession<
  S extends { projectId: string },
  Item extends FiledItem,
  Extra extends object = object,
>(spec: ItemSessionSpec<S, Item, Extra>) {
  const sessions = new Map<string, ItemSession<S, Extra>>();
  return function session(item: Item, installationId: string): ItemSession<S, Extra> {
    const identity = `${installationId}:${item.id}`;
    const known = sessions.get(identity);
    if (known) return known;
    let controller: AutosaveController<S> | undefined;
    const extra = spec.extra?.(item, () => controller as AutosaveController<S>) ?? ({} as Extra);
    controller = new AutosaveController<S>({
      id: item.id,
      snapshot: spec.snapshot(item),
      version: item.version,
      storage: spec.storage(installationId, item.id),
      readDraft: (raw) => withDraftProject(spec.readDraft(raw), item.projectId),
      ...(spec.equal ? { equal: spec.equal } : {}),
      ...(spec.draftDelayMs ? { draftDelayMs: spec.draftDelayMs } : {}),
      send: async (input) => {
        spec.check?.(input);
        try {
          const { projectId: _project, ...save } = input;
          return await spec.save(save);
        } catch (error) {
          reportSessionError(error);
          throw error;
        }
      },
      onSaved: (ack, sent) => {
        queryClient.setQueryData<Item>(keys.item(spec.type, item.id), (previous) =>
          previous && previous.version > ack.version ? previous : spec.saved(previous ?? item, sent, ack),
        );
        for (const key of spec.invalidate) void queryClient.invalidateQueries({ queryKey: key });
        invalidateNavigation();
        spec.afterSave?.(extra, ack, sent);
      },
      ...(spec.onAdopted
        ? { onAdopted: (snapshot: S, version: number) => spec.onAdopted?.(extra, snapshot, version) }
        : {}),
    });
    const made: ItemSession<S, Extra> = { controller, ...extra };
    sessions.set(identity, made);
    registerSave(spec.type, item.id, controller);
    return made;
  };
}
