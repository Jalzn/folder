import { describe, expect, it } from 'vitest';
import type { CanvasScene } from './canvas.js';
import { drawingFixture, shape } from './canvas-fixtures.js';
import { outlineCanvasScene } from './canvas-outline.js';

/** The fixture plus a labeled box outside the frame, a loose line and a deleted element. */
function scene(): CanvasScene {
  const base = drawingFixture();
  const elements = base.elements.map((element) =>
    element.id === 'arrow' ? { ...element, endBinding: { elementId: 'server', focus: 0, gap: 1 } } : element,
  );
  elements.push(
    shape('server', 'diamond', {
      x: 1000,
      y: 20,
      width: 120,
      height: 90,
      groupIds: ['group'],
      boundElements: [{ id: 'server-label', type: 'text' }],
    }),
    shape('server-label', 'text', { x: 1010, y: 50, text: 'Servidor', containerId: 'server', fontSize: 20 }),
    shape('note', 'text', {
      x: 1000,
      y: 400,
      width: 200,
      height: 25,
      text: 'Nota\nlonga',
      link: 'https://exemplo.com',
    }),
    shape('wire', 'line', {
      x: 1000,
      y: 300,
      points: [
        [0, 0],
        [150, 20],
      ],
    }),
    shape('gone', 'rectangle', { x: -500, y: -500, isDeleted: true }),
  );
  return { ...base, elements };
}

describe('canvas outline', () => {
  it('lists frames with their children, loose elements and connections in reading order', () => {
    const outline = outlineCanvasScene(scene());
    expect(outline.total).toBe(9);
    expect(outline.counts).toEqual({
      frame: 1,
      rectangle: 1,
      diamond: 1,
      label: 2,
      arrow: 1,
      line: 1,
      freedraw: 1,
      text: 1,
    });
    expect(outline.area).toEqual({ width: 1190, height: 600 });
    expect(outline.frames).toEqual([
      {
        alias: 'q1',
        name: 'Ideia',
        box: { x: 0, y: 0, width: 800, height: 600 },
        children: [
          { alias: 'e1', kind: 'rectangle', label: 'Fluxo de ação', box: { x: 0, y: 0, width: 160, height: 80 } },
        ],
      },
    ]);
    expect(outline.loose).toEqual([
      { alias: 'e2', kind: 'diamond', label: 'Servidor', box: { x: 990, y: 0, width: 120, height: 90 } },
      { alias: 't1', kind: 'text', label: 'Nota\nlonga', box: { x: 990, y: 380, width: 200, height: 25 } },
    ]);
    expect(outline.connections).toEqual([
      {
        alias: 's1',
        kind: 'arrow',
        label: null,
        start: { alias: 'e1' },
        end: { alias: 'e2' },
        startArrowhead: false,
        endArrowhead: true,
      },
      {
        alias: 's2',
        kind: 'line',
        label: null,
        start: { point: [990, 280] },
        end: { point: [1140, 300] },
        startArrowhead: false,
        endArrowhead: false,
      },
    ]);
  });

  it('summarizes groups, freehand strokes and links', () => {
    const outline = outlineCanvasScene(scene());
    expect(outline.groups).toEqual([{ alias: 'g1', members: ['e1', 'e2'] }]);
    expect(outline.freehand).toEqual({ count: 1, box: { x: 0, y: 0, width: 15, height: 10 } });
    expect(outline.links).toEqual([{ alias: 't1', url: 'https://exemplo.com' }]);
  });

  it('is stable for the same scene regardless of element order', () => {
    const reversed = scene();
    reversed.elements.reverse();
    expect(outlineCanvasScene(reversed)).toEqual(outlineCanvasScene(scene()));
  });

  it('cuts long texts and lists, keeping the counts complete', () => {
    const many = scene();
    many.elements.push(shape('long', 'text', { x: 0, y: 900, text: 'x'.repeat(600) }));
    const outline = outlineCanvasScene(many, { maxElements: 3, maxTextLength: 10 });
    expect(outline.total).toBe(10);
    expect(outline.frames[0]?.children.map((child) => child.label)).toEqual(['Fluxo de a…']);
    expect(outline.loose.map((node) => node.alias)).toEqual(['e2']);
    expect(outline.connections).toEqual([]);
    expect(outline.omitted).toBe(4);
  });

  it('describes an empty or fully deleted scene', () => {
    const outline = outlineCanvasScene({
      ...drawingFixture(),
      elements: [shape('gone', 'rectangle', { isDeleted: true })],
    });
    expect(outline).toMatchObject({ total: 0, area: null, frames: [], loose: [], connections: [], omitted: 0 });
  });
});
