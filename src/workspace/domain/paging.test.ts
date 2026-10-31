import { describe, expect, it } from 'vitest';
import { documentCursor, offsetCursor, pageText, readDocumentCursor, readOffsetCursor } from './paging.js';

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
  it('round trips document and offset cursors', () => {
    expect(readDocumentCursor(documentCursor(12, 60_000))).toEqual({ version: 12, offset: 60_000 });
    expect(readOffsetCursor(offsetCursor(40), 1000)).toBe(40);
    expect(readOffsetCursor(undefined, 1000)).toBe(0);
  });
  it('refuses malformed cursors and offsets past the limit', () => {
    for (const cursor of ['', '12', 'a:1', '1:-2']) expect(() => readDocumentCursor(cursor)).toThrow('Cursor inválido');
    expect(() => readOffsetCursor('40', 1000)).toThrow('Cursor inválido');
    expect(() => readOffsetCursor('o:1001', 1000)).toThrow('limite de páginas');
  });
});
