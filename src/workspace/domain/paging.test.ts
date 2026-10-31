import { describe, expect, it } from 'vitest';
import {
  boardCursor,
  documentCursor,
  pageText,
  readBoardCursor,
  readDocumentCursor,
  readSearchCursor,
  searchCursor,
} from './paging.js';

describe('text pages', () => {
  it('returns short text as a single page', () => {
    expect(pageText('abc', 0, 10)).toEqual({ text: 'abc', number: 1, count: 1, nextOffset: null });
    expect(pageText('', 0, 10)).toEqual({ text: '', number: 1, count: 1, nextOffset: null });
  });
  it('cuts after the last line break in the final 20% of a page', () => {
    const text = `${'a'.repeat(85)}\n${'b'.repeat(50)}`;
    const first = pageText(text, 0, 100);
    expect(first).toMatchObject({ number: 1, count: 2, nextOffset: 86 });
    expect(first.text).toBe(`${'a'.repeat(85)}\n`);
    expect(pageText(text, 86, 100)).toEqual({ text: 'b'.repeat(50), number: 2, count: 2, nextOffset: null });
  });
  it('cuts exactly without a late line break, never inside a surrogate pair', () => {
    const text = `${'a'.repeat(10)}\n${'b'.repeat(88)}😀${'c'.repeat(20)}`;
    const first = pageText(text, 0, 100);
    expect(first.nextOffset).toBe(99);
    expect(first.text.endsWith('b')).toBe(true);
    expect(pageText(text, 99, 100).text.startsWith('😀')).toBe(true);
  });
  it('refuses an offset that does not start a page', () => {
    expect(() => pageText('a'.repeat(300), 7, 100)).toThrow('Cursor inválido');
  });
});

describe('cursors', () => {
  const id = '3f9e2c1a-0b4d-4e5f-8a6b-7c8d9e0f1a2b';
  it('round trips document, search and board cursors', () => {
    expect(readDocumentCursor(documentCursor(12, 60_000))).toEqual({ version: 12, offset: 60_000 });
    const searchKey = { titleRank: 2, updatedAt: '2026-10-31T06:41:25.403Z', typeRank: 1, id };
    expect(searchCursor(searchKey)).toBe(`s~2~2026-10-31T06:41:25.403Z~1~${id}`);
    expect(readSearchCursor(searchCursor(searchKey))).toEqual(searchKey);
    const boardKey = { columnRank: 1, position: 7, id };
    expect(boardCursor(42, boardKey)).toBe(`t~42~1~7~${id}`);
    expect(readBoardCursor(boardCursor(42, boardKey))).toEqual({ revision: 42, key: boardKey });
  });
  it('refuses malformed cursors and cursors of another list', () => {
    for (const cursor of ['', '12', 'a:1', '1:-2']) expect(() => readDocumentCursor(cursor)).toThrow('Cursor inválido');
    for (const cursor of ['o:40', `t~1~7~${id}`, `s~1~2026-10-31~0~${id}`, `s~1~2026-10-31T06:41:25.403Z~3~${id}`])
      expect(() => readSearchCursor(cursor)).toThrow('Cursor inválido');
    for (const cursor of [`s~0~2026-10-31T06:41:25.403Z~0~${id}`, `t~1~3~7~${id}`, `t~1~7~${id}`])
      expect(() => readBoardCursor(cursor)).toThrow('Cursor inválido');
  });
});
