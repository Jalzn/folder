/**
 * The sample's drawings, as Excalidraw 0.18.1 restores and saves them, so opening one in the editor
 * changes nothing and saves nothing (stage 11, decision 16). Opening the stage 10 scenes in Chrome
 * showed what the editor's restore changed: it gave each element a fractional `index` ("a0", "a1",
 * …), turned `boundElements: null` into `[]`, gave arrows `lastCommittedPoint: null`, and, for the
 * index, raised every `version` and `versionNonce`. Text measurements and the bindings, of arrows
 * to boxes and of labels to their boxes on both sides, were already as it keeps them. The scenes are
 * built here, since the test helpers of the testing/ folders stay out of runtime code;
 * e2e/seed-sample.spec.ts opens each one and fails when a new Excalidraw changes this again.
 */
import type { CanvasElement, CanvasScene, JsonValue } from '../src/workspace/domain/index.js';

/** Excalidraw's fractional index digits, in its order: the n-th key of a fresh scene is `a` + digit. */
const INDEX_DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** The fractional index Excalidraw gives the n-th element of a scene it restores, up to 62 elements. */
export function sceneIndex(position: number): string {
  const digit = INDEX_DIGITS[position];
  if (digit === undefined) throw new RangeError(`A sample scene has at most ${INDEX_DIGITS.length} elements.`);
  return `a${digit}`;
}

/** Excalidraw elements with the properties its editor writes, so the editor opens them unchanged. */
function sceneBuilder() {
  let seed = 1;
  const element = (fields: Record<string, JsonValue> & { id: string; type: string }): CanvasElement => ({
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed,
    version: 1,
    versionNonce: seed++,
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    ...fields,
  });
  const width = 200;
  const height = 80;
  return {
    /** A rectangle with a label inside, bound to the arrows that reach it. */
    box(id: string, x: number, y: number, label: string, arrows: string[] = []): CanvasElement[] {
      const labelId = `${id}-label`;
      return [
        element({
          id,
          type: 'rectangle',
          x,
          y,
          width,
          height,
          backgroundColor: '#e8ecf2',
          boundElements: [{ id: labelId, type: 'text' }, ...arrows.map((arrow) => ({ id: arrow, type: 'arrow' }))],
        }),
        element({
          id: labelId,
          type: 'text',
          x: x + 10,
          y: y + 27,
          width: width - 20,
          height: 25,
          roundness: null,
          text: label,
          originalText: label,
          fontSize: 20,
          fontFamily: 5,
          textAlign: 'center',
          verticalAlign: 'middle',
          containerId: id,
          autoResize: true,
          lineHeight: 1.25,
        }),
      ];
    },
    /** An arrow from the right side of one box to the left side of another. */
    arrow(id: string, from: { id: string; x: number; y: number }, to: { id: string; x: number; y: number }) {
      const start = [from.x + width + 4, from.y + height / 2];
      const end = [to.x - 4, to.y + height / 2];
      return element({
        id,
        type: 'arrow',
        x: start[0] ?? 0,
        y: start[1] ?? 0,
        width: Math.abs((end[0] ?? 0) - (start[0] ?? 0)),
        height: Math.abs((end[1] ?? 0) - (start[1] ?? 0)),
        roundness: { type: 2 },
        points: [
          [0, 0],
          [(end[0] ?? 0) - (start[0] ?? 0), (end[1] ?? 0) - (start[1] ?? 0)],
        ],
        startBinding: { elementId: from.id, focus: 0, gap: 4 },
        endBinding: { elementId: to.id, focus: 0, gap: 4 },
        startArrowhead: null,
        endArrowhead: 'arrow',
        elbowed: false,
        lastCommittedPoint: null,
      });
    },
    /** A free text, outside any shape. */
    note(id: string, x: number, y: number, value: string) {
      return element({
        id,
        type: 'text',
        x,
        y,
        width: 12 * value.length,
        height: 25,
        roundness: null,
        text: value,
        originalText: value,
        fontSize: 20,
        fontFamily: 5,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        autoResize: true,
        lineHeight: 1.25,
      });
    },
  };
}

/** Boxes in a row, each linked to the next by an arrow, with an optional caption above. */
export function flow(labels: string[], caption?: string): CanvasScene {
  const draw = sceneBuilder();
  const boxes = labels.map((label, index) => ({ id: `b${index}`, x: 40 + index * 300, y: 120, label }));
  const elements = boxes.flatMap((box, index) =>
    draw.box(
      box.id,
      box.x,
      box.y,
      box.label,
      [index > 0 ? `a${index - 1}` : undefined, index < boxes.length - 1 ? `a${index}` : undefined].filter(
        (arrow): arrow is string => arrow !== undefined,
      ),
    ),
  );
  for (const [index, box] of boxes.slice(0, -1).entries()) {
    const next = boxes[index + 1];
    if (next) elements.push(draw.arrow(`a${index}`, box, next));
  }
  if (caption) elements.push(draw.note('caption', 40, 40, caption));
  return {
    appState: { viewBackgroundColor: '#ffffff' },
    elements: elements.map((element, position) => ({ ...element, index: sceneIndex(position) })),
  };
}
