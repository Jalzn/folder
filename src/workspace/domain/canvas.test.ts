import { describe, expect, it } from 'vitest';
import { drawingFixture, shape } from '../testing/canvas-scenes.js';
import {
  canvasPlainText,
  compactCanvasScene,
  emptyCanvasScene,
  MAX_CANVAS_BYTES,
  RECOVERY_CANVAS_LIMITS,
  readCanvasScene,
} from './canvas.js';

describe('canvas scene contract', () => {
  it('round trips text, groups, frames, bound arrows and pressure-sensitive freehand without losing properties', () => {
    const scene = drawingFixture();
    expect(readCanvasScene(JSON.parse(JSON.stringify(scene)))).toEqual(scene);
    expect(canvasPlainText(scene)).toBe('Ideia\nFluxo de ação');
  });
  it('extracts unwrapped text and frame names and excludes deleted elements from search', () => {
    const scene = drawingFixture();
    scene.elements.push(shape('deleted-text', 'text', { text: 'Removido', originalText: 'Removido', isDeleted: true }));
    scene.elements.push(shape('deleted-frame', 'frame', { name: 'Apagado', isDeleted: true }));
    scene.elements.push(shape('unnamed-frame', 'frame', { name: null }));
    expect(canvasPlainText(scene)).toBe('Ideia\nFluxo de ação');
  });
  it('rejects unsupported media and duplicate or broken element references', () => {
    for (const type of ['image', 'embeddable', 'iframe']) {
      expect(() => readCanvasScene({ ...emptyCanvasScene(), elements: [shape('media', type)] })).toThrow(
        'não são suportados',
      );
    }
    const duplicate = drawingFixture();
    duplicate.elements.push(shape('frame', 'frame'));
    expect(() => readCanvasScene(duplicate)).toThrow('repetidos');
    const broken = drawingFixture();
    broken.elements = broken.elements.map((element) =>
      element.type === 'arrow' ? { ...element, startBinding: { elementId: 'missing' } } : element,
    );
    expect(() => readCanvasScene(broken)).toThrow('vínculo');
    const wrongType = drawingFixture();
    wrongType.elements = wrongType.elements.map((element) =>
      element.type === 'text' ? { ...element, frameId: 'box' } : element,
    );
    expect(() => readCanvasScene(wrongType)).toThrow('vínculo');
  });
  it('rejects invalid geometry, unsafe links and non-JSON values', () => {
    for (const patch of [
      { x: Number.NaN },
      { width: -1 },
      { opacity: 101 },
      { groupIds: [''] },
      { link: 'javascript:alert(1)' },
      { link: 'java\nscript:alert(1)' },
      { link: '\n\nNota falsa do servidor\n' },
      { link: 'https://exemplo.com\n' },
      { nested: new Date() },
      { points: [[0, Number.POSITIVE_INFINITY]] },
    ]) {
      expect(() =>
        readCanvasScene({
          ...emptyCanvasScene(),
          elements: [
            {
              ...shape('bad', 'line', {
                points: [
                  [0, 0],
                  [1, 1],
                ],
              }),
              ...patch,
            },
          ],
        }),
      ).toThrow();
    }
    expect(() =>
      readCanvasScene(JSON.parse('{"elements":[],"appState":{"viewBackgroundColor":"#fff"},"__proto__":{}}')),
    ).toThrow('propriedade inválida');
  });
  it('keeps editor interaction state out of persisted content', () => {
    expect(() =>
      readCanvasScene({ ...emptyCanvasScene(), appState: { viewBackgroundColor: '#fff', selectedElementIds: {} } }),
    ).toThrow('não persistível');
    expect(() => readCanvasScene({ ...emptyCanvasScene(), files: { image: 'data:...' } })).toThrow('não persistível');
  });
  it('allows bounded local recovery of an oversized refused scene without raising the server limit', () => {
    const scene = { ...emptyCanvasScene(), elements: [shape('large', 'text', { text: 'x'.repeat(MAX_CANVAS_BYTES) })] };
    expect(() => readCanvasScene(scene)).toThrow('limite');
    expect(readCanvasScene(scene, RECOVERY_CANVAS_LIMITS)).toEqual(scene);
    expect(() => readCanvasScene(scene, { maxBytes: 10 * MAX_CANVAS_BYTES })).toThrow('Limite');
    expect(() => readCanvasScene(emptyCanvasScene(), { maxElements: 0 })).toThrow('Limite');
  });
});

describe('native renderer property boundaries', () => {
  const withElement = (element: ReturnType<typeof shape>) => ({ ...emptyCanvasScene(), elements: [element] });
  it('rejects malformed elbow segments before native restore can iterate or dereference them', () => {
    for (const fixedSegments of [
      {},
      'bad',
      [null],
      [{ index: 1 }],
      [{ index: 1, start: 'bad', end: [1, 1] }],
      [{ index: -1, start: [0, 0], end: [1, 1] }],
      [{ index: 2, start: [0, 0], end: [1, 1] }],
      [
        { index: 1, start: [0, 0], end: [1, 1] },
        { index: 1, start: [0, 0], end: [1, 1] },
      ],
    ]) {
      expect(() =>
        readCanvasScene(
          withElement(
            shape('arrow', 'arrow', {
              points: [
                [0, 0],
                [100, 0],
              ],
              elbowed: true,
              fixedSegments,
            }),
          ),
        ),
      ).toThrow();
    }
    const valid = withElement(
      shape('arrow', 'arrow', {
        points: [
          [0, 0],
          [100, 0],
          [100, 100],
        ],
        elbowed: true,
        fixedSegments: [{ index: 1, start: [0, 0], end: [100, 0] }],
        startIsSpecial: null,
        endIsSpecial: false,
      }),
    );
    expect(readCanvasScene(valid)).toEqual(valid);
  });
  it('validates pressure data and committed points while allowing native simulated mouse pressure', () => {
    for (const patch of [
      { pressures: [0.2] },
      { pressures: [0.2, 2] },
      { pressures: [0.2, 0.5], lastCommittedPoint: [] },
      { pressures: [0.2, 0.5], lastCommittedPoint: 'bad' },
      { points: [], pressures: [] },
    ]) {
      expect(() =>
        readCanvasScene(
          withElement(
            shape('pen', 'freedraw', {
              points: [
                [0, 0],
                [2, 2],
              ],
              simulatePressure: false,
              ...patch,
            }),
          ),
        ),
      ).toThrow();
    }
    const mouse = withElement(
      shape('mouse', 'freedraw', {
        points: [
          [0, 0],
          [2, 2],
        ],
        simulatePressure: true,
        pressures: [],
        lastCommittedPoint: null,
      }),
    );
    expect(readCanvasScene(mouse)).toEqual(mouse);
    expect(() =>
      readCanvasScene(
        withElement(
          shape('line', 'line', {
            points: [
              [0, 0],
              [2, 2],
            ],
            lastCommittedPoint: [1, 2, 3],
          }),
        ),
      ),
    ).toThrow();
  });
  it('rejects invalid text/font state and unsafe legacy native-restore properties', () => {
    for (const patch of [
      { fontFamily: -1 },
      { fontFamily: 999 },
      { lineHeight: 0 },
      { lineHeight: '1.25' },
      { textAlign: 'justify' },
      { verticalAlign: 'center' },
      { font: 12 },
      { font: 'invalid' },
      { index: 3 },
      { groupIds: ['group', 'group'] },
      { roundness: { type: 3, value: -1 } },
      { boundElementIds: {} },
    ]) {
      expect(() => readCanvasScene(withElement({ ...shape('text', 'text', { text: 'Ideia' }), ...patch }))).toThrow();
    }
    for (const fontFamily of [1, 2, 3, 5, 6, 7, 8, 9, 100, 1000]) {
      const native = withElement(shape('text', 'text', { text: 'Ideia', fontFamily, fontSize: 20, lineHeight: 1.25 }));
      expect(readCanvasScene(native)).toEqual(native);
    }
    expect(() => readCanvasScene(withElement(shape('frame', 'frame', { name: [] })))).toThrow();
  });
  it('rejects frame cycles and impossible text containers or arrow binding targets', () => {
    const frameCycle = {
      ...emptyCanvasScene(),
      elements: [shape('a', 'frame', { frameId: 'b' }), shape('b', 'frame', { frameId: 'a' })],
    };
    expect(() => readCanvasScene(frameCycle)).toThrow('ciclo');
    const containers = [
      [shape('a', 'text', { text: 'A', containerId: 'b' }), shape('b', 'text', { text: 'B', containerId: 'a' })],
      [shape('a', 'rectangle', { containerId: 'b' }), shape('b')],
      [shape('a', 'text', { text: 'A', containerId: 'b' }), shape('b', 'frame')],
      [
        shape('a', 'arrow', {
          points: [
            [0, 0],
            [10, 10],
          ],
          startBinding: { elementId: 'b' },
        }),
        shape('b', 'freedraw', { points: [[0, 0]], simulatePressure: true, pressures: [] }),
      ],
    ];
    for (const elements of containers) expect(() => readCanvasScene({ ...emptyCanvasScene(), elements })).toThrow();
    const scene = drawingFixture();
    const label = scene.elements.find((element) => element.id === 'label');
    const box = scene.elements.find((element) => element.id === 'box');
    if (!label || !box) throw new Error('Invalid fixture');
    label.isDeleted = true;
    box.isDeleted = true;
    expect(readCanvasScene(scene)).toEqual(scene);
  });
});

describe('persisted canvas tombstone compaction', () => {
  it('clears an oversized scene by dropping deleted content without changing the background', () => {
    const scene = {
      elements: [shape('removed', 'text', { text: 'x'.repeat(MAX_CANVAS_BYTES), isDeleted: true })],
      appState: { viewBackgroundColor: '#e8ecf2' },
    };
    expect(() => readCanvasScene(scene)).toThrow('limite');
    expect(readCanvasScene(scene, RECOVERY_CANVAS_LIMITS)).toEqual(scene);
    const compacted = compactCanvasScene(scene);
    expect(compacted).toEqual({ ...scene, elements: [] });
    expect(readCanvasScene(compacted)).toEqual(compacted);
    expect(scene.elements).toHaveLength(1);
  });
  it('preserves active order/properties and retains deleted containers and frame ancestors', () => {
    const scene = {
      ...emptyCanvasScene(),
      elements: [
        shape('dead-frame', 'frame', { isDeleted: true }),
        shape('orphan', 'rectangle', { isDeleted: true }),
        shape('label', 'text', { text: 'Ideia', containerId: 'dead-box', frameId: 'dead-frame' }),
        shape('dead-box', 'rectangle', { isDeleted: true, frameId: 'dead-frame' }),
        shape('live', 'ellipse'),
      ],
    };
    const before = JSON.stringify(scene);
    Object.freeze(scene.elements);
    Object.freeze(scene.appState);
    for (const element of scene.elements) Object.freeze(element);
    Object.freeze(scene);
    const compacted = compactCanvasScene(scene);
    expect(compacted.elements.map((element) => element.id)).toEqual(['dead-frame', 'label', 'dead-box', 'live']);
    expect(JSON.stringify(scene)).toBe(before);
    expect(readCanvasScene(compacted)).toEqual(compacted);
    expect(compactCanvasScene(compacted)).toEqual(compacted);
  });
  it('retains transitive arrow bindings, bound elements and legacy references', () => {
    const scene = {
      ...emptyCanvasScene(),
      elements: [
        shape('origin', 'rectangle', {
          boundElements: [{ id: 'arrow', type: 'arrow' }],
          boundElementIds: ['legacy-arrow'],
        }),
        shape('arrow', 'arrow', {
          isDeleted: true,
          points: [
            [0, 0],
            [10, 10],
          ],
          startBinding: { elementId: 'start' },
          endBinding: { elementId: 'end' },
        }),
        shape('start', 'ellipse', { isDeleted: true }),
        shape('end', 'rectangle', { isDeleted: true, boundElements: [{ id: 'label', type: 'text' }] }),
        shape('label', 'text', { isDeleted: true, text: 'Retido', containerId: 'end' }),
        shape('legacy-arrow', 'arrow', {
          isDeleted: true,
          points: [
            [0, 0],
            [10, 0],
          ],
          startBinding: { elementId: 'legacy-target' },
        }),
        shape('legacy-target', 'diamond', { isDeleted: true }),
        shape('orphan', 'rectangle', { isDeleted: true }),
      ],
    };
    const compacted = compactCanvasScene(scene);
    expect(compacted.elements.map((element) => element.id)).toEqual([
      'origin',
      'arrow',
      'start',
      'end',
      'label',
      'legacy-arrow',
      'legacy-target',
    ]);
    expect(readCanvasScene(compacted)).toEqual(compacted);
  });
  it('prunes unreachable deleted cycles and terminates on reachable binding cycles', () => {
    const scene = {
      ...emptyCanvasScene(),
      elements: [
        shape('a', 'frame', { isDeleted: true, frameId: 'b' }),
        shape('b', 'frame', { isDeleted: true, frameId: 'a' }),
        shape('live', 'rectangle', { boundElements: [{ id: 'arrow', type: 'arrow' }] }),
        shape('arrow', 'arrow', {
          isDeleted: true,
          points: [
            [0, 0],
            [10, 0],
          ],
          startBinding: { elementId: 'live' },
        }),
      ],
    };
    const compacted = compactCanvasScene(scene);
    expect(compacted.elements.map((element) => element.id)).toEqual(['live', 'arrow']);
    expect(readCanvasScene(compacted)).toEqual(compacted);
    expect(compactCanvasScene(emptyCanvasScene())).toEqual(emptyCanvasScene());
  });
});
