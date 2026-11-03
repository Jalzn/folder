import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { errorMessage, queryClient } from '../../../lib/api';
import { type TrashItem, trashQuery } from '../../../lib/queries';
import { displayTitle, type Project } from '../../../lib/types';
import { useRequest } from '../../../lib/writes/use-request';
import { useAction } from '../../../shell/writes';
import { focusPageTitle, useToast } from '../../../ui';
import { emptyTrash, hasOriginatedTasks, itemAddress, purgeItem, restoreItem } from './trash-api';
import { emptiedText, restoredText } from './trash-text';

export const trashTitle = (item: TrashItem) => displayTitle(item.title);

/** A confirmation kept while it closes, so its text does not change on the way out. */
export interface Confirmation<Value> {
  open: boolean;
  value: Value;
}

/** The items an emptying deletes: the ones shown, which may be part of the trash, by a filter or a cut listing. */
export interface EmptyTarget {
  items: TrashItem[];
  partial: boolean;
}

export interface PurgeTarget {
  item: TrashItem;
  /** A document whose excerpts became tasks: the dialog says the tasks stay. */
  originated: boolean;
}

/**
 * The trash's actions, one write at a time: restore with a toast that opens the item, delete for good and
 * empty, each after its confirmation. Focus goes to the page's title when the row that had it goes away.
 */
export function useTrashActions(project: Project) {
  const action = useAction();
  const toast = useToast();
  const navigate = useNavigate();
  // Not a disabled state: disabling the pressed button would drop its focus before the dialog opens.
  const checking = useRef(false);
  const [purge, setPurge] = useState<Confirmation<PurgeTarget> | null>(null);
  const [empty, setEmpty] = useState<Confirmation<EmptyTarget> | null>(null);
  // One request per intent: retrying a restore, a purge or an emptying replays it instead of failing.
  const restoreRequest = useRequest();
  const purgeRequest = useRequest();
  const emptyRequest = useRequest();

  async function restore(item: TrashItem) {
    await action.run(
      () => restoreItem(item, restoreRequest.for),
      ({ folderGone }) => {
        restoreRequest.clear();
        toast(restoredText(trashTitle(item), item.folder, folderGone), {
          action: { label: 'Abrir', onAction: () => void navigate({ href: itemAddress(project.id, item) }) },
        });
      },
    );
    focusPageTitle();
  }

  async function askPurge(item: TrashItem) {
    if (checking.current) return;
    checking.current = true;
    try {
      setPurge({ open: true, value: { item, originated: await hasOriginatedTasks(item) } });
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      checking.current = false;
    }
  }

  async function confirmPurge() {
    if (!purge) return;
    await action.run(
      () => purgeItem(purge.value.item, purgeRequest.for),
      () => {
        purgeRequest.clear();
        toast('Excluído de vez.');
      },
    );
    setPurge({ ...purge, open: false });
    focusPageTitle();
  }

  async function confirmEmpty() {
    if (!empty) return;
    const result = await action.run(() => emptyTrash(project.id, empty.value.items, emptyRequest.for));
    if (result) {
      emptyRequest.clear();
      // The action refetched the trash: an empty listing is an empty trash.
      const left = queryClient.getQueryData(trashQuery(project.id).queryKey)?.items.length ?? 0;
      toast(emptiedText(result, left === 0));
    }
    setEmpty({ ...empty, open: false });
    focusPageTitle();
  }

  return {
    busy: action.busy,
    restore,
    askPurge,
    purge,
    confirmPurge,
    cancelPurge: () => setPurge((current) => current && { ...current, open: false }),
    askEmpty: (target: EmptyTarget) => setEmpty({ open: true, value: target }),
    empty,
    confirmEmpty,
    cancelEmpty: () => setEmpty((current) => current && { ...current, open: false }),
  };
}
