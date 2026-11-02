import type { EmbeddedItems } from './embed-items.js';
import type { EmbedKind } from './embeds.js';
import type { EmbedResolver } from './markdown-embeds.js';

/**
 * The serializer's view of resolved embeds (see documentToMarkdown): a live task's title and column,
 * a live drawing's title, and nothing for an item in the trash, deleted or never there, which reads
 * as unavailable. The MCP and the web's exported file share it; only `href` differs.
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
