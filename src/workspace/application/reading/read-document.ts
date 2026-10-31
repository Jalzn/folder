import { AppError } from '@tinyfold/core/application';
import { documentToMarkdown } from '../../domain/markdown.js';
import { documentCursor, pageText, readDocumentCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { ReadingContext } from './ports.js';
import type { ReadDocumentInput } from './schemas.js';

/**
 * A document as Markdown, in pages pinned to one version. The first page also lists the tasks
 * created from it. The read is short: conversion and paging run after the transaction.
 */
export async function readDocument(ctx: ReadingContext, input: ReadDocumentInput) {
  const cursor = input.cursor === undefined ? undefined : readDocumentCursor(input.cursor);
  const found = await ctx.read(async (reader) => {
    const document = await reader.documentForReading(input.id);
    if (!document) return undefined;
    const tasks = cursor ? [] : await reader.tasksFromDocument(document.id, READING_LIMITS.document.originTasks + 1);
    return { document, tasks };
  });
  if (!found) throw new AppError('NOT_FOUND', 'Documento não encontrado ou na lixeira.');
  const { content, ...document } = found.document;
  if (cursor && cursor.version !== document.version)
    throw new AppError('VERSION_CONFLICT', 'O documento mudou desde a primeira página. Leia de novo sem cursor.');
  const page = pageText(documentToMarkdown(content), cursor?.offset ?? 0, READING_LIMITS.document.pageChars);
  return {
    document,
    originTasks: found.tasks.slice(0, READING_LIMITS.document.originTasks),
    moreOriginTasks: found.tasks.length > READING_LIMITS.document.originTasks,
    page,
    nextCursor: page.nextOffset === null ? null : documentCursor(document.version, page.nextOffset),
  };
}
