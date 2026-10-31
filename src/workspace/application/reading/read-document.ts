import { AppError } from '@tinyfold/core/application';
import { textFingerprint } from '../../domain/fingerprint.js';
import { documentToMarkdown } from '../../domain/markdown.js';
import { pageMarkdown } from '../../domain/markdown-pages.js';
import { documentCursor, readDocumentCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { ReadingContext } from './ports.js';
import type { ReadDocumentInput } from './schemas.js';

/**
 * A document as Markdown, in pages pinned to one text: a cursor taken from an earlier text is
 * refused. The first page also lists the tasks created from it. The read is short: conversion and
 * paging run after the transaction.
 */
export async function readDocument(ctx: ReadingContext, input: ReadDocumentInput) {
  const cursor = input.cursor === undefined ? undefined : readDocumentCursor(input.cursor);
  const found = await ctx.read(async (reader) => {
    const document = await reader.documentForReading(input.id);
    if (!document) return undefined;
    const tasks = cursor
      ? { items: [], total: 0 }
      : await reader.tasksFromDocument(document.id, READING_LIMITS.document.originTasks);
    return { document, tasks };
  });
  if (!found) throw new AppError('NOT_FOUND', 'Documento não encontrado ou na lixeira.');
  const { content, ...document } = found.document;
  const markdown = documentToMarkdown(content);
  const textPrint = textFingerprint(markdown);
  if (cursor && cursor.textPrint !== textPrint)
    throw new AppError('VERSION_CONFLICT', 'O documento mudou desde a primeira página. Leia de novo sem cursor.');
  const page = pageMarkdown(markdown, cursor?.offset ?? 0, READING_LIMITS.document.pageChars);
  return {
    document,
    originTasks: found.tasks.items,
    originTaskCount: found.tasks.total,
    page,
    nextCursor: page.nextOffset === null ? null : documentCursor(textPrint, page.nextOffset),
  };
}
