import { documentToMarkdown } from '../../domain/markdown/index.js';
import { readDocumentCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { workspaceErrors } from '../errors.js';
import { optionalCursor } from './optional-cursor.js';
import { pagedMarkdown } from './paged-markdown.js';
import type { ReadingContext } from './ports.js';
import type { ReadTaskInput } from './schemas.js';

/**
 * A task with its description as Markdown, in pages pinned to one text, as read_document pages a
 * document. `today` is the owner's civil date, which says whether the task is late.
 */
export async function readTask(ctx: ReadingContext, input: ReadTaskInput) {
  const cursor = optionalCursor(input.cursor, readDocumentCursor);
  const found = await ctx.read((reader) => reader.task(input.id));
  if (!found) throw workspaceErrors.taskUnreadable();
  const { today } = await ctx.calendar();
  const { description, ...task } = found;
  const markdown = documentToMarkdown(description);
  const { page, nextCursor } = pagedMarkdown(
    markdown,
    cursor,
    READING_LIMITS.task.pageChars,
    'A descrição mudou desde a primeira página. Leia de novo sem cursor.',
  );
  return {
    task,
    today,
    page,
    nextCursor,
  };
}
