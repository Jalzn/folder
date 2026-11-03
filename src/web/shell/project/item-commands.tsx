import { ArrowRightLeft, FolderInput, Pin, PinOff, Trash2 } from 'lucide-react';
import { KEYS } from '../keyboard/keys';

/** Shared descriptions for the open item's menu, palette and shortcuts. */
export function itemCommands(pinned: boolean) {
  return {
    pin: {
      id: 'pin',
      label: pinned ? 'Desafixar' : 'Fixar',
      icon: pinned ? <PinOff size={16} /> : <Pin size={16} />,
      shortcut: KEYS.pin,
    },
    folder: { id: 'move-folder', label: 'Mover para pasta…', icon: <FolderInput size={16} />, shortcut: KEYS.move },
    project: { id: 'move', label: 'Mover para projeto…', icon: <ArrowRightLeft size={16} /> },
    trash: { id: 'trash', label: 'Mover para a lixeira', icon: <Trash2 size={16} /> },
  };
}
