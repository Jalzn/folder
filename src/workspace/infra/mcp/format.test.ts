import { describe, expect, it } from 'vitest';
import type { CanvasOutline } from '../../domain/canvas-outline.js';
import { compactJson, documentHeader, fitItems, MAX_TOOL_TEXT, nextPageCursor } from './format.js';
import { formatCanvasOutline } from './format-outline.js';

const outline: CanvasOutline = {
  total: 7,
  counts: { frame: 1, rectangle: 2, arrow: 2, text: 1, label: 1 },
  area: { width: 1840, height: 1100 },
  frames: [
    {
      alias: 'q1',
      name: 'Servidor',
      box: { x: 920, y: 0, width: 900, height: 1100 },
      children: [
        { alias: 'e2', kind: 'rectangle', label: 'Validar versão', box: { x: 960, y: 80, width: 220, height: 90 } },
      ],
    },
  ],
  loose: [
    { alias: 'e1', kind: 'rectangle', label: 'Editor', box: { x: 0, y: 120, width: 200, height: 90 } },
    { alias: 't1', kind: 'text', label: 'Uma chamada em voo', box: { x: 20, y: 520, width: 300, height: 25 } },
  ],
  connections: [
    {
      alias: 's1',
      kind: 'arrow',
      label: 'salva',
      start: { alias: 'e1' },
      end: { alias: 'e2' },
      startArrowhead: false,
      endArrowhead: true,
    },
    {
      alias: 's2',
      kind: 'arrow',
      label: null,
      start: { point: [200, 160] },
      end: { point: [420, 160] },
      startArrowhead: true,
      endArrowhead: true,
    },
  ],
  groups: [{ alias: 'g1', members: ['e1', 't1'] }],
  freehand: { count: 1, box: { x: 40, y: 700, width: 300, height: 80 } },
  links: [{ alias: 'e1', url: 'https://exemplo.com' }],
  omitted: 0,
};

describe('canvas outline text', () => {
  it('writes counts, frames, loose elements, connections and summaries', () => {
    expect(formatCanvasOutline(outline)).toBe(
      [
        'Elementos ativos: 7 (2 retângulos, 2 setas, 1 texto, 1 rótulo, 1 quadro)',
        'Área: 1840×1100; coordenadas a partir do canto superior esquerdo',
        '',
        'Quadro q1 "Servidor" (920, 0, 900×1100)',
        '  e2 retângulo "Validar versão" (960, 80, 220×90)',
        'Fora de quadros',
        '  e1 retângulo "Editor" (0, 120, 200×90)',
        '  t1 texto "Uma chamada em voo" (20, 520)',
        'Conexões',
        '  s1 seta "salva": e1 → e2',
        '  s2 seta: (200, 160) ↔ (420, 160)',
        'Grupos: g1 = e1, t1',
        'Traços livres: 1, em (40, 700, 300×80)',
        'Links: e1 → https://exemplo.com',
      ].join('\n'),
    );
  });
  it('stops before the character limit and counts what was left out', () => {
    const text = formatCanvasOutline({ ...outline, omitted: 1238 }, 360);
    expect(text.length).toBeLessThanOrEqual(360);
    expect(text).toContain('  e2 retângulo');
    expect(text).not.toContain('Conexões');
    expect(text.endsWith('… mais 1.242 elementos omitidos')).toBe(true);
  });
  it('describes an empty drawing in one line', () => {
    expect(
      formatCanvasOutline({
        ...outline,
        total: 0,
        counts: {},
        area: null,
        frames: [],
        loose: [],
        connections: [],
        groups: [],
        freehand: null,
        links: [],
      }),
    ).toBe('Elementos ativos: 0');
  });
});

describe('tool text helpers', () => {
  it('opens a document with its metadata and the tasks created from it', () => {
    expect(
      documentHeader({
        document: {
          id: 'd1',
          title: 'Visão',
          version: 12,
          updatedAt: '2026-10-30T14:02:11.000Z',
          projectId: 'p1',
          projectName: 'Tinyfold',
          projectArchived: true,
        },
        originTasks: [{ id: 't1', title: 'Gerar "token"', status: 'doing' }],
        moreOriginTasks: true,
        empty: false,
      }),
    ).toBe(
      [
        '# Visão',
        '',
        '- Projeto: Tinyfold (arquivado)',
        '- Atualizado: 2026-10-30T14:02:11.000Z · versão 12',
        '- ID: d1',
        '- Tarefas originadas aqui:',
        '  - "Gerar \\"token\\"" (Em andamento, id t1)',
        '  - … e outras. Use list_tasks para ver todas.',
      ].join('\n'),
    );
  });
  it('drops trailing items that exceed the output budget and moves the cursor back', () => {
    const items = Array.from({ length: 50 }, (_, index) => ({ index, padding: 'x'.repeat(3000) }));
    const page = { offset: 20, nextOffset: 70 };
    const text = fitItems(items, (shown) =>
      compactJson({ items: shown, nextCursor: nextPageCursor(page, shown.length, items.length) }),
    );
    const parsed = JSON.parse(text) as { items: unknown[]; nextCursor: string };
    expect(text.length).toBeLessThanOrEqual(MAX_TOOL_TEXT);
    expect(parsed.nextCursor).toBe(`o:${20 + parsed.items.length}`);
    expect(nextPageCursor(page, 50, 50)).toBe('o:70');
    expect(nextPageCursor({ offset: 0, nextOffset: null }, 3, 3)).toBeNull();
  });
});
