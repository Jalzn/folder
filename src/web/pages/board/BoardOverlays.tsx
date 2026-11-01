import { TrashTaskDialog } from '../../components/task/TrashTaskDialog';
import type { BoardColumnView } from './board-columns';
import { DeleteColumnDialog } from './DeleteColumnDialog';
import { MoveTaskPopover } from './MoveTaskMenu';
import type { BoardCommandsState } from './use-board-commands';

/** What opens over the board: M's "Mover para" on a card, the deletion of a column, and a card's trash. */
export function BoardOverlays({
  board,
  view,
  pending,
}: {
  board: BoardCommandsState;
  view: readonly BoardColumnView[];
  pending: boolean;
}) {
  const { menu, deleting, trashing, columns } = board;
  const moving = menu?.kind === 'move' ? view.flatMap((each) => each.tasks).find((task) => task.id === menu.id) : null;
  return (
    <>
      {moving && (
        <MoveTaskPopover
          columns={columns}
          columnId={moving.columnId}
          triggerRef={board.moveAnchor}
          onClose={() => board.setMenu(null)}
          onChoose={(choice) => board.moveCard(moving.id, choice)}
        />
      )}
      {deleting && (
        <DeleteColumnDialog
          column={deleting}
          columns={columns}
          pending={pending}
          onClose={() => board.setDeleting(null)}
          onConfirm={(destination) => void board.removeColumn(deleting, destination)}
        />
      )}
      {trashing && (
        <TrashTaskDialog
          task={trashing}
          pending={pending}
          onClose={() => board.setTrashing(null)}
          onConfirm={() => board.confirmTrash(trashing)}
        />
      )}
    </>
  );
}
