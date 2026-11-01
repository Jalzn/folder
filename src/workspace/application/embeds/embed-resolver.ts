import type { EmbedKind } from '../../domain/embeds.js';
import type { EmbedResolver } from '../../domain/markdown-embeds.js';
import type { EmbeddedItems } from './ports.js';

/**
 * The serializer's view of resolved embeds: a live task's title and column, a live drawing's
 * title, and nothing for an item in the trash, deleted or never there, which reads as unavailable.
 */
export function embedResolver(items: EmbeddedItems, href: (kind: EmbedKind, id: string) => string): EmbedResolver {
  const tasks = new Map(items.tasks.map((task) => [task.id, task]));
  const drawings = new Map(items.drawings.map((drawing) => [drawing.id, drawing]));
  return {
    resolve(kind, id) {
      if (kind === 'task') {
        const task = tasks.get(id);
        return task?.state === 'live' ? { title: task.title, column: task.column.name } : null;
      }
      const drawing = drawings.get(id);
      return drawing?.state === 'live' ? { title: drawing.title } : null;
    },
    href,
  };
}

/** Where an agent follows an embed: read_task and read_drawing take the ID after the slash. */
export const agentEmbedHref = (kind: EmbedKind, id: string) => `tinyfold:${kind}/${id}`;
