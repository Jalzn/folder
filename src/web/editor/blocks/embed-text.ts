import { type DocumentBlock, documentToMarkdown, type EmbedKind, UNAVAILABLE_EMBED } from '#rich-text/domain';
import { type EmbeddedDrawing, type EmbeddedTask, embedResolver } from '#workspace/domain';
import { embedBlock } from './embed-blocks';

/**
 * An embed's link outside the app (docs/etapas/11-documento-desenho.md, decision 6): the item's permanent
 * address, `<origin>/tarefas/<id>` or `<origin>/desenhos/<id>`, which opens it wherever it went. The exported
 * `.md` and a copied embed link the same way.
 */
export const appEmbedHref = (origin: string) => (kind: EmbedKind, id: string) =>
  `${origin}/${kind === 'task' ? 'tarefas' : 'desenhos'}/${encodeURIComponent(id)}`;

/** An embed as other apps read it: its words, its Markdown and, when the item is there, its link. */
export interface EmbedText {
  /** "Tarefa: título (coluna)", "Desenho: título" or "Item indisponível". */
  plain: string;
  /** The line the exported `.md` has: the link, or "[Item indisponível]". */
  markdown: string;
  link: { href: string; label: string } | null;
}

/** A title on one line, as the domain's serializer writes it in the link. */
const oneLine = (text: string) => text.replace(/\s+/gu, ' ').trim() || 'Sem título';

/**
 * What a copied embed reads as (review B2), with the domain's resolver and serializer, as the exported file
 * has it: `state` is the item as the document resolved it, absent while it loads.
 */
export function embedText(
  kind: EmbedKind,
  id: string,
  state: EmbeddedTask | EmbeddedDrawing | undefined,
  origin: string,
): EmbedText {
  const resolver = embedResolver(
    {
      tasks: kind === 'task' && state ? [state as EmbeddedTask] : [],
      drawings: kind === 'drawing' && state ? [state as EmbeddedDrawing] : [],
    },
    appEmbedHref(origin),
  );
  const block: DocumentBlock = embedBlock(kind, id);
  const markdown = documentToMarkdown([block], { embeds: resolver }).trim();
  const item = resolver.resolve(kind, id);
  if (!item) return { plain: UNAVAILABLE_EMBED.slice(1, -1), markdown, link: null };
  const title = oneLine(item.title);
  const label =
    kind === 'task' ? `Tarefa: ${title}${item.column ? ` (${oneLine(item.column)})` : ''}` : `Desenho: ${title}`;
  return { plain: label, markdown, link: { href: resolver.href(kind, id), label } };
}
