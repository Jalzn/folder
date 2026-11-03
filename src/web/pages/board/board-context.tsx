import { createContext, useContext } from 'react';
import type { CivilDate } from '#core/domain';
import type { LabelSummary } from '../../lib/queries';
import type { ElementRefs } from '../../ui';
import type { BoardFocus } from './board-keys';
import type { BoardCommandsState } from './use-board-commands';
import type { useBoardDnd } from './use-board-dnd';

/**
 * What every card and column header of a board reads: whether the project can change, the labels and today
 * for the cards' meta, the Tab stop, the elements by ID, the drag, and the board's commands and open menus.
 */
export interface BoardContextValue {
  editable: boolean;
  labels: ReadonlyMap<string, LabelSummary>;
  today: CivilDate;
  isStop: (kind: BoardFocus['kind'], id: string) => boolean;
  refs: {
    cards: ElementRefs<HTMLLIElement>;
    titles: ElementRefs<HTMLButtonElement>;
    names: ElementRefs<HTMLButtonElement>;
  };
  dnd: ReturnType<typeof useBoardDnd>;
  board: BoardCommandsState;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard() {
  const value = useContext(BoardContext);
  if (!value) throw new Error('O quadro está indisponível.');
  return value;
}
