import { ArrowRightLeft, FolderInput, Pin, PinOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ItemType, Project } from '../../lib/types';
import { usePins } from '../project/use-pins';
import { useShellUi } from '../shell-ui';
import type { HereAction } from './palette-sections';

export type RunnableHereAction = HereAction & { icon?: ReactNode; run: () => void };

/**
 * "Neste item" for the open document or drawing: its files (from the page), then Fixar or Desafixar, Mover
 * para pasta… (M) and Mover para projeto… (not in an archived project), then Mover para a lixeira. None
 * outside an item.
 */
export function useHereActions({
  item,
  project,
  pinned,
}: {
  item: { type: ItemType; id: string } | null;
  project: Project | null;
  pinned: boolean;
}): RunnableHereAction[] {
  const ui = useShellUi();
  const pins = usePins();
  if (!item) return [];
  const page = ui.page.current;
  const editable = Boolean(project && !project.archivedAt);
  return [
    ...(page.files ?? []),
    ...(editable
      ? [
          {
            id: 'pin',
            label: pinned ? 'Desafixar' : 'Fixar',
            icon: pinned ? <PinOff size={16} /> : <Pin size={16} />,
            shortcut: ['P'],
            run: () => void (pinned ? pins.unpin(item.type, item.id) : pins.pin(item.type, item.id)),
          },
          {
            id: 'move-folder',
            label: 'Mover para pasta…',
            icon: <FolderInput size={16} />,
            shortcut: ['M'],
            run: () => ui.setMoveOpen('folder'),
          },
          {
            id: 'move',
            label: 'Mover para projeto…',
            icon: <ArrowRightLeft size={16} />,
            run: () => ui.setMoveOpen('project'),
          },
        ]
      : []),
    ...(page.trash
      ? [{ id: 'trash', label: 'Mover para a lixeira', icon: <Trash2 size={16} />, run: page.trash }]
      : []),
  ];
}
