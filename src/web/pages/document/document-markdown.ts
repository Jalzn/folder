import {
  type DocumentBlock,
  documentToMarkdown,
  type EmbedKind,
  embedIds,
  embedResolver,
} from '@tinyfold/workspace/domain';
import type { EmbeddedItems } from '../../lib/queries/embeds';

/**
 * An embed's link outside the app (docs/etapas/11-documento-desenho.md, decision 6): the item's permanent
 * address, `<origin>/tarefas/<id>` or `<origin>/desenhos/<id>`, which opens it wherever it went.
 */
export const appEmbedHref = (origin: string) => (kind: EmbedKind, id: string) =>
  `${origin}/${kind === 'task' ? 'tarefas' : 'desenhos'}/${encodeURIComponent(id)}`;

/**
 * A document as an exported `.md`: its title as the heading, then the domain's serializer and resolver, the
 * ones the MCP uses, with the embeds resolved in one read: a live task as "[Tarefa: título (coluna)](link)",
 * a live drawing as "[Desenho: título](link)", one in the trash or gone as "[Item indisponível]".
 */
export async function documentMarkdown(
  title: string,
  blocks: readonly DocumentBlock[],
  origin: string,
  resolve: (ids: { taskIds: string[]; canvasIds: string[] }) => Promise<EmbeddedItems>,
) {
  const ids = embedIds(blocks);
  const items = ids.taskIds.length + ids.canvasIds.length ? await resolve(ids) : { tasks: [], drawings: [] };
  return `# ${title}\n\n${documentToMarkdown(blocks, { embeds: embedResolver(items, appEmbedHref(origin)) })}`;
}
