import { AppError } from '@tinyfold/core/application';
import { textFingerprint } from '../../domain/fingerprint.js';
import { documentToMarkdown } from '../../domain/markdown.js';
import { pageMarkdown } from '../../domain/markdown-pages.js';
import { documentCursor, readDocumentCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { ReadingContext } from './ports.js';
import type { ReadTaskInput } from './schemas.js';

/**
 * A task with its description as Markdown, in pages pinned to one text, as read_document pages a
 * document. `today` is the owner's civil date, which says whether the task is late.
 */
export async function readTask(ctx: ReadingContext, input: ReadTaskInput) {
  const cursor = input.cursor === undefined ? undefined : readDocumentCursor(input.cursor);
  const found = await ctx.read((reader) => reader.task(input.id));
  if (!found) throw new AppError('NOT_FOUND', 'Tarefa não encontrada ou na lixeira.');
  const { today } = await ctx.calendar();
  const { description, ...task } = found;
  const markdown = documentToMarkdown(description);
  const textPrint = textFingerprint(markdown);
  if (cursor && cursor.textPrint !== textPrint)
    throw new AppError('VERSION_CONFLICT', 'A descrição mudou desde a primeira página. Leia de novo sem cursor.');
  const page = pageMarkdown(markdown, cursor?.offset ?? 0, READING_LIMITS.task.pageChars);
  return {
    task,
    today,
    page,
    nextCursor: page.nextOffset === null ? null : documentCursor(textPrint, page.nextOffset),
  };
}
