import {
  type CanvasScene,
  compactCanvasScene,
  emptyCanvasScene,
  MAX_CANVAS_BYTES,
  readCanvasScene,
} from '@tinyfold/workspace/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutosaveController, type SaveInput } from './autosave';
import { type CanvasSnapshot, canvasFile, parseCanvasDraft, readCanvasImport } from './canvas-autosave';

const element = {
  id: 'rectangle',
  type: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 60,
  version: 1,
  versionNonce: 1,
  isDeleted: false,
};
const drawing: CanvasScene = { elements: [element], appState: { viewBackgroundColor: '#202329' } };
const initial: CanvasSnapshot = { title: 'Ideia', projectId: null, scene: emptyCanvasScene() };
const edited = { ...initial, scene: drawing };
function setup(
  send: (input: SaveInput<CanvasSnapshot>) => Promise<{ id: string; version: number; updatedAt: string }>,
  raw: string | null = null,
  version = 1,
) {
  let stored = raw;
  const write = vi.fn((value: string) => {
    stored = value;
  });
  let sequence = 0;
  const controller = new AutosaveController<CanvasSnapshot>({
    id: 'canvas',
    snapshot: initial,
    version,
    readDraft: parseCanvasDraft,
    storage: {
      read: () => stored,
      write,
      remove: () => {
        stored = null;
      },
    },
    draftDelayMs: 100,
    send,
    idFactory: () => `request-${++sequence}`,
    classifyError: (error) => (error as { code?: string }).code,
  });
  return { controller, stored: () => stored, write };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('canvas autosave', () => {
  it('retries the immutable scene after a lost response before sending newer strokes', async () => {
    const calls: SaveInput<CanvasSnapshot>[] = [];
    const { controller } = setup(async (input) => {
      calls.push(input);
      if (calls.length === 1) throw new Error('response lost');
      return { id: 'canvas', version: input.expectedVersion + 1, updatedAt: 'now' };
    });
    controller.change(edited);
    expect(await controller.flush()).toBe(false);
    controller.change({ ...edited, title: 'Novo traço' });
    await controller.flush();
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[2]?.title).toBe('Novo traço');
    expect(calls[2]?.expectedVersion).toBe(2);
    expect(controller.getState().snapshot.scene).toEqual(drawing);
    expect(controller.getState().status).toBe('saved');
  });
  it('marks content dirty immediately while grouping frequent draft writes', () => {
    vi.useFakeTimers();
    const { controller, write, stored } = setup(vi.fn());
    controller.change(edited);
    controller.change({ ...edited, title: 'Último traço' });
    expect(controller.getState().status).toBe('dirty');
    expect(write).not.toHaveBeenCalled();
    controller.receiveRemote({ ...initial, title: 'Outro dispositivo' }, 2);
    expect(controller.getState().status).toBe('conflict');
    expect(parseCanvasDraft(stored())?.snapshot.title).toBe('Último traço');
    expect(write).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('flushes the last stroke into the recovery record before leaving', () => {
    vi.useFakeTimers();
    const { controller, stored } = setup(vi.fn());
    controller.change(edited);
    controller.persistDraft();
    expect(parseCanvasDraft(stored())?.snapshot.scene).toEqual(drawing);
  });
  it('persists continuous strokes within a bounded window instead of waiting for idle', () => {
    vi.useFakeTimers();
    const { controller, write, stored } = setup(vi.fn());
    controller.change(edited);
    vi.advanceTimersByTime(50);
    controller.change({ ...edited, title: 'Traço contínuo' });
    vi.advanceTimersByTime(50);
    expect(write).toHaveBeenCalledTimes(1);
    expect(parseCanvasDraft(stored())?.snapshot.title).toBe('Traço contínuo');
  });
  it('saves again after clearing an oversized drawing without discarding native undo data', async () => {
    const nativeScene: CanvasScene = {
      ...drawing,
      elements: [{ ...element, type: 'text', text: 'x'.repeat(MAX_CANVAS_BYTES) }],
    };
    const { controller } = setup(async (input) => {
      try {
        readCanvasScene(input.scene);
      } catch (error) {
        throw Object.assign(error as Error, { code: 'VALIDATION' });
      }
      return { id: 'canvas', version: input.expectedVersion + 1, updatedAt: 'now' };
    });
    controller.change({ ...initial, scene: nativeScene });
    expect(await controller.flush()).toBe(false);
    const clearedNativeScene = {
      ...nativeScene,
      elements: nativeScene.elements.map((item) => ({ ...item, isDeleted: true })),
    };
    controller.change({ ...initial, scene: compactCanvasScene(clearedNativeScene) });
    expect(await controller.flush()).toBe(true);
    expect(controller.getState().status).toBe('saved');
    expect(controller.getState().snapshot.scene.elements).toEqual([]);
    expect(clearedNativeScene.elements).toHaveLength(1);
  });
  it('recovers a pending request with a newer remote version without losing its identity', async () => {
    const pending = { ...edited, id: 'canvas', expectedVersion: 1, requestId: 'stable' };
    const send = vi.fn(async () => ({ id: 'canvas', version: 2, updatedAt: 'now' }));
    const { controller } = setup(send, JSON.stringify({ format: 1, baseVersion: 1, snapshot: edited, pending }), 2);
    await controller.flush();
    expect(send).toHaveBeenCalledWith(pending);
    expect(controller.getState().status).toBe('saved');
  });
  it('preserves raw recovery data when a stored scene cannot be opened', () => {
    const raw = JSON.stringify({
      format: 1,
      baseVersion: 1,
      snapshot: { ...edited, scene: { elements: [{ type: 'image' }], appState: {} } },
    });
    const { controller } = setup(vi.fn(), raw);
    expect(controller.getState().snapshot).toEqual(initial);
    expect(controller.getState().recoveryData).toBe(raw);
  });
  it('retains a valid scene when its pending request is malformed', () => {
    const parsed = parseCanvasDraft(
      JSON.stringify({ format: 1, baseVersion: 1, snapshot: edited, pending: { id: 'canvas', expectedVersion: -1 } }),
    );
    expect(parsed?.snapshot.scene).toEqual(drawing);
    expect(parsed?.pending).toBeNull();
  });
});

describe('editable canvas interchange', () => {
  it('round-trips supported elements including deleted binding targets', () => {
    const scene = {
      ...drawing,
      elements: [
        { ...element, isDeleted: true },
        {
          ...element,
          id: 'arrow',
          type: 'arrow',
          points: [
            [0, 0],
            [100, 100],
          ],
          startBinding: { elementId: 'rectangle', focus: 0, gap: 1 },
        },
      ],
    };
    const file = canvasFile({ ...edited, scene });
    expect(readCanvasImport(file)).toEqual(scene);
  });
  it('rejects files with image payloads before changing the open snapshot', () => {
    const file = JSON.parse(canvasFile(edited));
    file.files = { image: { dataURL: 'data:image/png;base64,abc' } };
    expect(() => readCanvasImport(JSON.stringify(file))).toThrow('Imagens');
    expect(edited.scene).toEqual(drawing);
  });
  it('rejects embedded content even if disguised as a normal editable file', () => {
    const file = JSON.parse(canvasFile(edited));
    file.elements[0].type = 'embeddable';
    expect(() => readCanvasImport(JSON.stringify(file))).toThrow();
  });
});
