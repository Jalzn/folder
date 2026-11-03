import { AppError } from '@tinyfold/core/application';
import { textFingerprint } from '../../domain/fingerprint.js';
import { pageMarkdown } from '../../domain/markdown/pages.js';
import { documentCursor, type readDocumentCursor } from '../../domain/paging.js';
export function pagedMarkdown(
  markdown: string,
  cursor: ReturnType<typeof readDocumentCursor> | undefined,
  pageChars: number,
  changedMessage: string,
) {
  const textPrint = textFingerprint(markdown);
  if (cursor && cursor.textPrint !== textPrint) throw new AppError('VERSION_CONFLICT', changedMessage);
  const page = pageMarkdown(markdown, cursor?.offset ?? 0, pageChars);
  return { page, nextCursor: page.nextOffset === null ? null : documentCursor(textPrint, page.nextOffset) };
}
