import type { CanvasScene } from './canvas-models.js';
import { object } from './content-guards.js';

export {
  type Canvas,
  type CanvasAck,
  type CanvasElement,
  type CanvasScene,
  type CanvasSceneLimits,
  type CanvasSummary,
  isCanvasId,
  MAX_CANVAS_BYTES,
  MAX_CANVAS_ELEMENTS,
  RECOVERY_CANVAS_LIMITS,
} from './canvas-models.js';
export { readCanvasScene } from './canvas-validation.js';

export function emptyCanvasScene(): CanvasScene {
  return { elements: [], appState: { viewBackgroundColor: '#e8ecf2' } };
}

/** The searchable text of a scene: its active texts and frame names, in scene order. */
export function canvasPlainText(scene: CanvasScene): string {
  return scene.elements
    .filter((element) => !element.isDeleted)
    .flatMap((element) => {
      if (element.type === 'frame') return typeof element.name === 'string' && element.name ? [element.name] : [];
      if (element.type !== 'text') return [];
      return [typeof element.originalText === 'string' ? element.originalText : String(element.text ?? '')];
    })
    .join('\n');
}

/** Prune undo tombstones only from persistence, retaining every element reachable from live content. */
export function compactCanvasScene(scene: CanvasScene): CanvasScene {
  const byId = new Map(scene.elements.map((element) => [element.id, element]));
  const retained = new Set<string>();
  const queue = scene.elements.filter((element) => !element.isDeleted).map((element) => element.id);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    if (id === undefined || retained.has(id)) continue;
    const element = byId.get(id);
    if (!element) continue;
    retained.add(id);
    const include = (reference: unknown) => {
      if (typeof reference === 'string' && !retained.has(reference)) queue.push(reference);
    };
    include(element.frameId);
    include(element.containerId);
    for (const key of ['startBinding', 'endBinding']) {
      const binding = element[key];
      if (object(binding)) include(binding.elementId);
    }
    if (Array.isArray(element.boundElements)) {
      for (const binding of element.boundElements) if (object(binding)) include(binding.id);
    }
    if (Array.isArray(element.boundElementIds)) {
      for (const reference of element.boundElementIds) include(reference);
    }
  }
  return { ...scene, elements: scene.elements.filter((element) => retained.has(element.id)) };
}
