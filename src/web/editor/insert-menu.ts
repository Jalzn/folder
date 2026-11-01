import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { ListTodo, Shapes } from 'lucide-react';
import { createElement } from 'react';

/** What the "Incorporar" items embed: a task or a drawing. */
export type EmbedKind = 'task' | 'drawing';

/**
 * The "Incorporar" group of the document's `/` menu (docs/etapas/11-documento-desenho.md, "Menu /"): "Tarefa"
 * and "Desenho", each of which opens the picker. The task's description has no such group.
 */
export function embedSlashItems(openPicker: (kind: EmbedKind) => void): DefaultReactSuggestionItem[] {
  return [
    {
      title: 'Tarefa',
      subtext: 'incorporar',
      aliases: ['tarefa', 'task', 'card'],
      group: 'Incorporar',
      icon: createElement(ListTodo, { size: 18 }),
      onItemClick: () => openPicker('task'),
    },
    {
      title: 'Desenho',
      subtext: 'incorporar',
      aliases: ['desenho', 'figura', 'drawing'],
      group: 'Incorporar',
      icon: createElement(Shapes, { size: 18 }),
      onItemClick: () => openPicker('drawing'),
    },
  ];
}
