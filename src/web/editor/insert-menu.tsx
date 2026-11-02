import type { DefaultReactSuggestionItem } from '@blocknote/react';
import type { EmbedKind } from '@tinyfold/workspace/domain';
import { ListTodo, Shapes } from 'lucide-react';

/**
 * The "Incorporar" group of the document's `/` menu (docs/etapas/11-documento-desenho.md, "Menu /"): "Tarefa"
 * and "Desenho", each of which opens the picker. "/incorporar" and "/embed" find both (review B8). The task's
 * description has no such group.
 */
export function embedSlashItems(openPicker: (kind: EmbedKind) => void): DefaultReactSuggestionItem[] {
  return [
    {
      title: 'Tarefa',
      subtext: 'incorporar',
      aliases: ['tarefa', 'task', 'card', 'incorporar', 'embed'],
      group: 'Incorporar',
      icon: <ListTodo size={18} />,
      onItemClick: () => openPicker('task'),
    },
    {
      title: 'Desenho',
      subtext: 'incorporar',
      aliases: ['desenho', 'figura', 'drawing', 'incorporar', 'embed'],
      group: 'Incorporar',
      icon: <Shapes size={18} />,
      onItemClick: () => openPicker('drawing'),
    },
  ];
}
