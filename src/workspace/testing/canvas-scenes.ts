import type { CanvasElement, CanvasScene } from '../domain/canvas.js';

export function shape(id: string, type = 'rectangle', patch: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id,
    type,
    x: 10,
    y: 20,
    width: 160,
    height: 80,
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: 'a0',
    roundness: { type: 3 },
    seed: 42,
    version: 1,
    versionNonce: 100,
    isDeleted: false,
    boundElements: null,
    updated: 1793275200000,
    link: null,
    locked: false,
    ...patch,
  } as CanvasElement;
}

/** Representative persisted Excalidraw properties, including newer elbow-arrow bindings. */
export function drawingFixture(): CanvasScene {
  return {
    appState: { viewBackgroundColor: '#202329' },
    elements: [
      shape('frame', 'frame', { width: 800, height: 600, name: 'Ideia', index: 'a0' }),
      shape('box', 'rectangle', {
        frameId: 'frame',
        groupIds: ['group'],
        index: 'a1',
        boundElements: [
          { id: 'label', type: 'text' },
          { id: 'arrow', type: 'arrow' },
        ],
      }),
      shape('label', 'text', {
        frameId: 'frame',
        groupIds: ['group'],
        index: 'a2',
        text: 'Fluxo de\nação',
        originalText: 'Fluxo de ação',
        fontSize: 20,
        fontFamily: 5,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: 'box',
        autoResize: true,
        lineHeight: 1.25,
      }),
      shape('arrow', 'arrow', {
        frameId: 'frame',
        index: 'a3',
        width: 200,
        height: 0,
        points: [
          [0, 0],
          [200, 0],
        ],
        startBinding: { elementId: 'box', focus: 0, gap: 1, fixedPoint: [1, 0.5] },
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        elbowed: true,
        fixedSegments: null,
        startIsSpecial: null,
        endIsSpecial: null,
      }),
      shape('stroke', 'freedraw', {
        frameId: 'frame',
        index: 'a4',
        width: 15,
        height: 10,
        points: [
          [0, 0],
          [5, 7],
          [15, 10],
        ],
        pressures: [0.1, 0.5, 0.8],
        simulatePressure: false,
        lastCommittedPoint: [15, 10],
      }),
    ],
  };
}
