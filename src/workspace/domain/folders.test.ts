import { describe, expect, it } from 'vitest';
import { folderName, folderNameKey, folderOrder, restoredPosition } from './folders.js';

describe('folders', () => {
  it('collapses the spaces of a name, line breaks included, and trims it', () => {
    expect(folderName('  Arquitetura \n\t do   produto  ')).toBe('Arquitetura do produto');
    expect(folderName(' \n ')).toBe('');
  });

  it('keys names without case and accents', () => {
    expect(folderNameKey('Ações')).toBe(folderNameKey('acoes'));
    expect(folderNameKey('MCP')).toBe(folderNameKey(' mcp '));
    expect(folderNameKey('Ações')).toBe(folderNameKey('Ações'));
    expect(folderNameKey('MCP')).not.toBe(folderNameKey('MCPs'));
    // A name of marks alone keeps nothing to tell it apart.
    expect(folderNameKey('́')).toBe('');
  });

  it('orders a folder before another, at the end, and refuses unknown or identical ids', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(folderOrder(ids, 'd', 'a')).toEqual(['d', 'a', 'b', 'c']);
    expect(folderOrder(ids, 'a', 'c')).toEqual(['b', 'a', 'c', 'd']);
    expect(folderOrder(ids, 'b', null)).toEqual(['a', 'c', 'd', 'b']);
    expect(folderOrder(ids, 'x', 'a')).toBeUndefined();
    expect(folderOrder(ids, 'a', 'x')).toBeUndefined();
    expect(folderOrder(ids, 'a', 'a')).toBeUndefined();
  });

  it('restores a folder at its position, or at the end when fewer remain', () => {
    expect(restoredPosition(2, 5)).toBe(2);
    expect(restoredPosition(7, 3)).toBe(3);
    expect(restoredPosition(0, 0)).toBe(0);
  });
});
