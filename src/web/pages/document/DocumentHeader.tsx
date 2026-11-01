import type { ComponentProps } from 'react';
import { SaveState, useEdited } from '../../components/item-page';
import type { SaveStatus } from '../../lib/autosave';
import { DocumentMenu } from './DocumentMenu';
import { DocumentTasks } from './DocumentTasks';

/**
 * The actions of the document's bar, right of its folder: the save state ("Salvo · editado hoje", or "Não
 * salvou" with "Tentar de novo"), "Tarefas · n" and the ⋯.
 */
export function DocumentHeader({
  status,
  updatedAt,
  onRetry,
  menu,
}: {
  status: SaveStatus;
  updatedAt: string;
  onRetry: () => void;
  menu: ComponentProps<typeof DocumentMenu>;
}) {
  const edited = useEdited(updatedAt);
  return (
    <>
      <SaveState status={status} edited={edited} onRetry={onRetry} retryKeys={['mod', 'S']} />
      <DocumentTasks documentId={menu.document.id} />
      <DocumentMenu {...menu} />
    </>
  );
}
