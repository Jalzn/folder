import { documentToMarkdown, type EmbedKind, embedIds } from '#rich-text/domain';
import { embedResolver } from '../../domain/embed-resolver.js';
import { readDocumentCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { workspaceErrors } from '../errors.js';
import { optionalCursor } from './optional-cursor.js';
import { pagedMarkdown } from './paged-markdown.js';
import type { ReadingContext } from './ports.js';
import type { ReadDocumentInput } from './schemas.js';

/**
 * A document as Markdown, in pages pinned to one text: a cursor taken from an earlier text is
 * refused. Its embeds are resolved in the same read and written as `tinyfold:` links, so a change
 * to an embedded task's title or column between pages changes the text, and the cursor is refused
 * too (stage 11, decision 13). The first page also lists the tasks created from it. The read is
 * short: conversion and paging run after the transaction.
 */
/** Where an agent follows an embed: read_task and read_drawing take the ID after the slash. */
const agentEmbedHref = (kind: EmbedKind, id: string) => `tinyfold:${kind}/${id}`;

export async function readDocument(ctx: ReadingContext, input: ReadDocumentInput) {
  const cursor = optionalCursor(input.cursor, readDocumentCursor);
  const found = await ctx.read(async (reader) => {
    const document = await reader.documentForReading(input.id);
    if (!document) return undefined;
    const tasks = cursor
      ? { items: [], total: 0 }
      : await reader.tasksFromDocument(document.id, READING_LIMITS.document.originTasks);
    return { document, tasks, embeds: await reader.embeds(embedIds(document.content)) };
  });
  if (!found) throw workspaceErrors.documentUnreadable();
  const { content, ...document } = found.document;
  const markdown = documentToMarkdown(content, { embeds: embedResolver(found.embeds, agentEmbedHref) });
  const { page, nextCursor } = pagedMarkdown(
    markdown,
    cursor,
    READING_LIMITS.document.pageChars,
    'O documento mudou desde a primeira página. Leia de novo sem cursor.',
  );
  return {
    document,
    originTasks: found.tasks.items,
    originTaskCount: found.tasks.total,
    page,
    nextCursor,
  };
}
