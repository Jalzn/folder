import type { ReactNode } from 'react';
import type { ItemType } from '../../lib/types';
import { ReloadDialog, TrashItemDialog } from './EditorDialogs';

export interface ItemEditorDialogsProps {
  type: ItemType;
  trash: { open: boolean; pending: boolean; onClose: () => void; onConfirm: () => void };
  reload: { open: boolean; onClose: () => void; onConfirm: () => void };
  /** What else stays when the item goes to the trash, as the document's tasks. */
  trashNote?: ReactNode;
}

/** The open item's two confirmations: moving it to the trash, and taking the saved version after a conflict. */
export function ItemEditorDialogs({ type, trash, reload, trashNote }: ItemEditorDialogsProps) {
  return (
    <>
      <TrashItemDialog type={type} {...trash}>
        {trashNote}
      </TrashItemDialog>
      <ReloadDialog {...reload} />
    </>
  );
}
