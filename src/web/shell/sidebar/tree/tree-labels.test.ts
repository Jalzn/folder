import { toIsoInstant } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import { folderLabel, itemLabel, moreLabel } from './tree-labels';
import type { FolderNode, ItemNode } from './tree-rows';

const folder = (parts: Partial<FolderNode> = {}): FolderNode => ({
  kind: 'folder',
  key: 'folder:f',
  folder: { id: 'f', name: 'MCP', position: 0, version: 1, total: 12, items: [] },
  expanded: false,
  holdsCurrent: false,
  pending: 0,
  children: [],
  ...parts,
});

describe('tree labels', () => {
  it('names a folder with its count, its unsaved items and, closed, the open item inside', () => {
    expect(folderLabel(folder())).toBe('MCP, pasta, 12 itens');
    expect(folderLabel(folder({ pending: 1 }))).toBe('MCP, pasta, 12 itens, 1 item não salvo');
    expect(folderLabel(folder({ holdsCurrent: true }))).toBe('MCP, pasta, 12 itens, contém o item aberto');
    expect(folderLabel(folder({ holdsCurrent: true, expanded: true }))).toBe('MCP, pasta, 12 itens');
  });

  it('names an item with its type, pin and unsaved state, and the rest of a level', () => {
    const node: ItemNode = {
      kind: 'item',
      key: 'item:document:a',
      item: {
        type: 'document',
        id: 'a',
        title: 'Notas',
        updatedAt: toIsoInstant(new Date('2026-10-31T10:00:00.000Z')),
        createdAt: toIsoInstant(new Date('2026-10-31T10:00:00.000Z')),
        pinnedAt: toIsoInstant(new Date('2026-10-31T10:00:00Z')),
        folderId: null,
      },
      lastPin: true,
      current: false,
      pending: true,
    };
    expect(itemLabel(node)).toBe('Notas, documento, fixado, não salvo');
    expect(moreLabel({ kind: 'more', key: 'more:root', folderId: null, count: 1200 }, null)).toBe(
      'Ver todos os 1.200 itens da raiz do projeto no Índice',
    );
  });
});
