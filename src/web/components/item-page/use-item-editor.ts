import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { AutosaveController } from '../../lib/autosave';
import { moveThroughController } from '../../lib/autosave/editor-move';
import { type OpenEditor, registerOpenEditor } from '../../lib/autosave/save-registry';
import { useAutosaveLifecycle } from '../../lib/autosave/use-autosave-lifecycle';
import { useHasActiveProject } from '../../lib/queries';
import { useConfirmation } from '../../lib/react/use-confirmation';
import { useLatest } from '../../lib/react/use-latest';
import { usePageTitle } from '../../lib/react/use-page-title';
import { editableTitle } from '../../lib/types';
import type { ItemEditorDialogsProps } from './ItemEditorDialogs';
import { type ItemAdapter, useItemActions } from './use-item-actions';

type ItemSnapshot = { title: string; projectId: string };

/**
 * What an open document's and drawing's pages wire the same way (review WP-5): the editor registered for the
 * tree's moves, the autosave's lifecycle and state, the tab's title, the shared actions, the title as the field
 * shows it, a change of the snapshot, the import's file field, and the trash and reload confirmations with
 * what the bands need of them. The pages keep their layout, their body and their commands.
 */
export function useItemEditor<Snapshot extends ItemSnapshot, Item extends { version: number }>({
  controller,
  item,
  openEditor,
  persistDraft = false,
  trashed,
}: {
  controller: AutosaveController<Snapshot>;
  item: ItemAdapter<Snapshot, Item>;
  /**
   * The item is in the trash, where the server takes no save: its local text stays in the draft, nothing is
   * sent, and the page offers the copy instead.
   */
  trashed: boolean;
  /** More the open editor answers besides moves, as the document's embeds. */
  openEditor?: Omit<OpenEditor, 'moveTo'>;
  /** Keep the draft in storage when the page hides, as the drawing does. */
  persistDraft?: boolean;
}) {
  const latestOpen = useLatest(openEditor);
  useEffect(
    () =>
      registerOpenEditor(item.type, item.id, {
        moveTo: (move) => moveThroughController(controller, move),
        ...(latestOpen.current ?? {}),
      }),
    [controller, item.type, item.id],
  );
  // Before the lifecycle's effects, which send a recovered draft as the page opens.
  useLayoutEffect(() => controller.hold(trashed), [controller, trashed]);
  useAutosaveLifecycle(controller, { persistDraft });
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  usePageTitle(state.snapshot.title);
  const actions = useItemActions(controller, item);
  const hasActiveProject = useHasActiveProject();
  const trash = useConfirmation<boolean>();
  const reload = useConfirmation<boolean>();
  const fileInput = useRef<HTMLInputElement>(null);

  const change = (patch: Partial<Snapshot>) => controller.change({ ...controller.getState().snapshot, ...patch });
  const dialogs: Omit<ItemEditorDialogsProps, 'trashNote'> = {
    type: item.type,
    trash: {
      open: trash.open,
      pending: actions.trashing,
      onClose: () => trash.close(),
      onConfirm: () => void actions.moveToTrash().then((moved) => moved && trash.close()),
    },
    reload: {
      open: reload.open,
      onClose: () => reload.close(),
      onConfirm: () => void actions.reloadRemote().then((loaded) => loaded && reload.close()),
    },
  };
  return {
    state,
    /** The title as the field shows it: empty while the item is untitled. */
    title: editableTitle(state.snapshot.title),
    change,
    actions,
    fileInput,
    openImport: () => fileInput.current?.click(),
    openTrash: () => trash.ask(true),
    dialogs,
    /** What the bands take from the session and the actions. */
    banners: {
      state,
      canCopy: hasActiveProject,
      copying: actions.copying,
      onReload: () => reload.ask(true),
      onSaveCopy: () => void actions.saveCopy(),
      onRetry: () => void controller.flush(),
    },
  };
}
