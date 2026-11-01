import { type DocumentBlock, documentToMarkdown, type EmbedResolver, embedIds } from '@tinyfold/workspace/domain';
import type { EmbeddedItems } from '../../lib/queries/embeds';

/**
 * The embeds of an exported `.md` (docs/etapas/11-documento-desenho.md, decision 6): a live task as
 * "[Tarefa: título (coluna)](<origin>/tarefas/<id>)", a live drawing as "[Desenho: título](<origin>/desenhos/<id>)",
 * on the app's permanent addresses, which open the item wherever it went; one in the trash or gone as
 * "[Item indisponível]".
 */
export function fileEmbedResolver(items: EmbeddedItems, origin: string): EmbedResolver {
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
    href: (kind, id) => `${origin}/${kind === 'task' ? 'tarefas' : 'desenhos'}/${encodeURIComponent(id)}`,
  };
}

/**
 * A document as an exported `.md`: its title as the heading, then the domain's serializer, the one the MCP
 * uses, with the embeds resolved in one read as the file names them.
 */
export async function documentMarkdown(
  title: string,
  blocks: readonly DocumentBlock[],
  origin: string,
  resolve: (ids: { taskIds: string[]; canvasIds: string[] }) => Promise<EmbeddedItems>,
) {
  const ids = embedIds(blocks);
  const items = ids.taskIds.length + ids.canvasIds.length ? await resolve(ids) : { tasks: [], drawings: [] };
  return `# ${title}\n\n${documentToMarkdown(blocks, { embeds: fileEmbedResolver(items, origin) })}`;
}
