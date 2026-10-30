import type { JsonValue } from './models.js';

export const MAX_CANVAS_BYTES = 1024 * 1024;
export const MAX_CANVAS_ELEMENTS = 5000;
export const RECOVERY_CANVAS_LIMITS = { maxBytes: 5 * MAX_CANVAS_BYTES, maxElements: 20_000 } as const;
export interface CanvasSceneLimits {
  maxBytes?: number;
  maxElements?: number;
}
export interface CanvasElement {
  [key: string]: JsonValue;
  id: string;
  type: string;
}
export interface CanvasScene {
  elements: CanvasElement[];
  appState: { viewBackgroundColor: string };
}
export interface CanvasSummary {
  id: string;
  title: string;
  projectId: string | null;
  plainText: string;
  formatVersion: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface Canvas extends CanvasSummary {
  scene: CanvasScene;
}
export interface CanvasAck {
  id: string;
  version: number;
  updatedAt: string;
}

const elementTypes = new Set(['rectangle', 'diamond', 'ellipse', 'line', 'arrow', 'freedraw', 'text', 'frame']);
const textContainers = new Set(['rectangle', 'diamond', 'ellipse', 'arrow']);
const bindableTypes = new Set(['rectangle', 'diamond', 'ellipse', 'frame', 'text']);
const fontFamilies = new Set([1, 2, 3, 5, 6, 7, 8, 9, 100, 1000]);
const arrowheads = new Set([
  'arrow',
  'bar',
  'dot',
  'circle',
  'circle_outline',
  'triangle',
  'triangle_outline',
  'diamond',
  'diamond_outline',
  'crowfoot_one',
  'crowfoot_many',
  'crowfoot_one_or_many',
]);
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e9;
const color = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 100 &&
  /^(?:[a-z]+|#[a-f\d]{3,8}|(?:rgb|hsl)a?\([\d\s.,%/+-]+\))$/iu.test(value);
function invalid(message = 'O desenho contém elementos inválidos.'): never {
  throw new Error(message);
}
function assertJson(value: unknown, depth = 0): asserts value is JsonValue {
  if (depth > 32) invalid('O desenho contém estruturas muito profundas.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    for (const item of value) assertJson(item, depth + 1);
    return;
  }
  if (object(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) invalid('O desenho contém uma propriedade inválida.');
      assertJson(item, depth + 1);
    }
    return;
  }
  invalid();
}
function boundedLimit(value: number | undefined, fallback: number, maximum: number) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) invalid('Limite de leitura inválido.');
  return value;
}
function validLink(value: unknown) {
  if (value === null || value === undefined) return;
  if (typeof value !== 'string' || value.length > 4000) invalid('O endereço do elemento é inválido.');
  const link = value.trim();
  if (
    Array.from(link).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
    (/^[a-z][a-z\d+.-]*:/iu.test(link) && !/^(https?:|mailto:|tel:)/iu.test(link))
  )
    invalid('Use um endereço http, https, mailto ou tel no link.');
}
function assertPoint(point: unknown): asserts point is number[] {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(finite)) invalid('Os pontos do traço são inválidos.');
}
function assertPoints(points: unknown): asserts points is number[][] {
  if (!Array.isArray(points) || points.length > 100_000) invalid('Os pontos do traço são inválidos.');
  for (const point of points) {
    assertPoint(point);
  }
}
function assertElement(element: unknown): asserts element is CanvasElement {
  if (!object(element) || !identifier(element.id) || typeof element.type !== 'string') invalid();
  if (!elementTypes.has(element.type)) invalid('Imagens e conteúdo incorporado ainda não são suportados nos desenhos.');
  for (const key of ['x', 'y', 'width', 'height']) {
    if (!finite(element[key])) invalid('As dimensões do elemento são inválidas.');
  }
  if ((element.width as number) < 0 || (element.height as number) < 0)
    invalid('As dimensões do elemento são inválidas.');
  for (const key of ['angle', 'strokeWidth', 'roughness']) {
    if (element[key] !== undefined && !finite(element[key])) invalid();
  }
  if (element.updated !== undefined && (!Number.isSafeInteger(element.updated) || (element.updated as number) < 0))
    invalid();
  if (element.opacity !== undefined && (!finite(element.opacity) || element.opacity < 0 || element.opacity > 100))
    invalid();
  for (const key of ['strokeColor', 'backgroundColor']) {
    if (element[key] !== undefined && !color(element[key])) invalid('A cor do elemento é inválida.');
  }
  for (const key of ['seed', 'version', 'versionNonce']) {
    if (element[key] !== undefined && !Number.isSafeInteger(element[key])) invalid();
  }
  if (element.version !== undefined && (element.version as number) < 1) invalid();
  for (const key of ['isDeleted', 'locked', 'simulatePressure', 'elbowed', 'autoResize']) {
    if (element[key] !== undefined && typeof element[key] !== 'boolean') invalid();
  }
  if (
    element.groupIds !== undefined &&
    (!Array.isArray(element.groupIds) ||
      !element.groupIds.every(identifier) ||
      new Set(element.groupIds).size !== element.groupIds.length)
  )
    invalid('Os grupos do elemento são inválidos.');
  if (
    element.index !== undefined &&
    element.index !== null &&
    (typeof element.index !== 'string' || element.index.length > 256)
  )
    invalid();
  if (element.customData !== undefined && element.customData !== null && !object(element.customData)) invalid();
  if (
    element.boundElementIds !== undefined &&
    (!Array.isArray(element.boundElementIds) || !element.boundElementIds.every(identifier))
  )
    invalid('Os vínculos do elemento são inválidos.');
  if (element.strokeWidth !== undefined && (element.strokeWidth as number) < 0) invalid();
  if (element.roughness !== undefined && ((element.roughness as number) < 0 || (element.roughness as number) > 10))
    invalid();
  for (const [key, allowed] of [
    ['fillStyle', ['hachure', 'cross-hatch', 'solid', 'zigzag']],
    ['strokeStyle', ['solid', 'dashed', 'dotted']],
    ['textAlign', ['left', 'center', 'right']],
    ['verticalAlign', ['top', 'middle', 'bottom']],
  ] as const) {
    if (element[key] !== undefined && !(allowed as readonly unknown[]).includes(element[key])) invalid();
  }
  if (element.roundness !== undefined && element.roundness !== null) {
    if (!object(element.roundness) || ![1, 2, 3].includes(element.roundness.type as number)) invalid();
    if (element.roundness.value !== undefined && (!finite(element.roundness.value) || element.roundness.value < 0))
      invalid();
  }
  validLink(element.link);
  if (['line', 'arrow', 'freedraw'].includes(element.type)) {
    assertPoints(element.points);
    if (element.lastCommittedPoint !== undefined && element.lastCommittedPoint !== null)
      assertPoint(element.lastCommittedPoint);
  }
  if (element.type === 'line' || element.type === 'arrow') {
    for (const key of ['startArrowhead', 'endArrowhead']) {
      if (
        element[key] !== undefined &&
        element[key] !== null &&
        (typeof element[key] !== 'string' || !arrowheads.has(element[key] as string))
      )
        invalid('A ponta da seta é inválida.');
    }
    for (const key of ['startIsSpecial', 'endIsSpecial']) {
      if (element[key] !== undefined && element[key] !== null && typeof element[key] !== 'boolean') invalid();
    }
    if (element.fixedSegments !== undefined && element.fixedSegments !== null) {
      if (!Array.isArray(element.fixedSegments)) invalid('Os segmentos da seta são inválidos.');
      const indices = new Set<number>();
      for (const segment of element.fixedSegments) {
        if (
          !object(segment) ||
          !Number.isSafeInteger(segment.index) ||
          (segment.index as number) < 1 ||
          (segment.index as number) >= (element.points as number[][]).length ||
          indices.has(segment.index as number)
        )
          invalid('Os segmentos da seta são inválidos.');
        assertPoint(segment.start);
        assertPoint(segment.end);
        indices.add(segment.index as number);
      }
    }
  }
  if (element.type === 'freedraw') {
    const points = element.points as number[][];
    if (points.length === 0) invalid('O traço precisa conter pontos.');
    if (
      element.pressures !== undefined &&
      (!Array.isArray(element.pressures) || !element.pressures.every((p) => finite(p) && p >= 0 && p <= 1))
    )
      invalid('A pressão do traço é inválida.');
    if (!element.simulatePressure && (!Array.isArray(element.pressures) || element.pressures.length !== points.length))
      invalid('A pressão deve acompanhar os pontos do traço.');
  }
  if (
    element.type === 'frame' &&
    element.name !== undefined &&
    element.name !== null &&
    typeof element.name !== 'string'
  )
    invalid('O nome do frame é inválido.');
  if (element.type === 'text') {
    if (typeof element.text !== 'string') invalid('O elemento de texto é inválido.');
    for (const key of ['originalText', 'rawText']) {
      if (element[key] !== undefined && typeof element[key] !== 'string') invalid();
    }
    if (element.fontSize !== undefined && (!finite(element.fontSize) || element.fontSize <= 0)) invalid();
    if (element.fontFamily !== undefined && !fontFamilies.has(element.fontFamily as number))
      invalid('A fonte do texto ainda não é suportada.');
    if (element.lineHeight !== undefined && (!finite(element.lineHeight) || element.lineHeight <= 0))
      invalid('A altura de linha é inválida.');
    // Older files may retain `font`; native restore splits it and overrides fontSize.
    if (element.font !== undefined) {
      if (typeof element.font !== 'string') invalid('A fonte do texto é inválida.');
      const size = Number.parseFloat(element.font.split(' ')[0] ?? '');
      if (!finite(size) || size <= 0) invalid('A fonte do texto é inválida.');
    }
  }
}

export function emptyCanvasScene(): CanvasScene {
  return { elements: [], appState: { viewBackgroundColor: '#e8ecf2' } };
}

/** The server always uses default limits; only local recovery may use the larger bounded limits. */
export function readCanvasScene(value: unknown, limits: CanvasSceneLimits = {}): CanvasScene {
  const maxBytes = boundedLimit(limits.maxBytes, MAX_CANVAS_BYTES, RECOVERY_CANVAS_LIMITS.maxBytes);
  const maxElements = boundedLimit(limits.maxElements, MAX_CANVAS_ELEMENTS, RECOVERY_CANVAS_LIMITS.maxElements);
  assertJson(value);
  if (
    !object(value) ||
    !Array.isArray(value.elements) ||
    !object(value.appState) ||
    !color(value.appState.viewBackgroundColor)
  )
    invalid('A cena do desenho é inválida.');
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > maxBytes)
    invalid(
      `O desenho ultrapassa o limite de ${maxBytes / (1024 * 1024)} MiB. Exporte uma cópia e reduza seu conteúdo.`,
    );
  if (value.elements.length > maxElements)
    invalid(`O desenho ultrapassa o limite de ${maxElements.toLocaleString('pt-BR')} elementos.`);
  // Only document state crosses the boundary. Runtime editor state and file payloads are never persisted.
  if (
    Object.keys(value).some((key) => key !== 'elements' && key !== 'appState') ||
    Object.keys(value.appState).some((key) => key !== 'viewBackgroundColor')
  )
    invalid('A cena contém estado não persistível.');
  const elements = value.elements;
  const byId = new Map<string, CanvasElement>();
  for (const element of elements) {
    assertElement(element);
    if (byId.has(element.id)) invalid('O desenho contém identificadores de elementos repetidos.');
    byId.set(element.id, element);
  }
  for (const element of byId.values()) {
    const reference = (id: unknown, expectedType?: string) => {
      if (id === null || id === undefined) return;
      if (!identifier(id) || id === element.id || !byId.has(id))
        invalid('O desenho contém um vínculo de elemento inválido.');
      if (expectedType && byId.get(id)?.type !== expectedType)
        invalid('O desenho contém um vínculo de elemento inválido.');
    };
    reference(element.frameId, 'frame');
    reference(element.containerId);
    if (element.containerId !== undefined && element.containerId !== null) {
      if (element.type !== 'text' || !textContainers.has(byId.get(element.containerId as string)?.type ?? ''))
        invalid('O recipiente do texto é inválido.');
    }
    if (Array.isArray(element.boundElementIds)) {
      for (const id of element.boundElementIds) reference(id, 'arrow');
    }
    for (const key of ['startBinding', 'endBinding']) {
      const binding = element[key];
      if (binding === null || binding === undefined) continue;
      if (!object(binding) || !identifier(binding.elementId)) invalid('O vínculo da seta é inválido.');
      reference(binding.elementId);
      const target = byId.get(binding.elementId);
      if (
        (element.type !== 'line' && element.type !== 'arrow') ||
        !target ||
        !bindableTypes.has(target.type) ||
        (target.type === 'text' && target.containerId)
      )
        invalid('O vínculo da seta é inválido.');
      for (const name of ['focus', 'gap'])
        if (binding[name] !== undefined && !finite(binding[name])) invalid('O vínculo da seta é inválido.');
      if (binding.fixedPoint !== undefined && binding.fixedPoint !== null) assertPoints([binding.fixedPoint]);
    }
    if (element.boundElements !== null && element.boundElements !== undefined) {
      if (!Array.isArray(element.boundElements)) invalid('Os vínculos do elemento são inválidos.');
      const boundIds = new Set<string>();
      for (const binding of element.boundElements) {
        if (!object(binding) || (binding.type !== 'text' && binding.type !== 'arrow') || !identifier(binding.id))
          invalid('Os vínculos do elemento são inválidos.');
        reference(binding.id, binding.type);
        if (boundIds.has(binding.id)) invalid('O desenho contém vínculos repetidos.');
        boundIds.add(binding.id);
        if (binding.type === 'text' && !textContainers.has(element.type)) invalid('O recipiente do texto é inválido.');
        if (
          binding.type === 'arrow' &&
          (!bindableTypes.has(element.type) || (element.type === 'text' && element.containerId))
        )
          invalid('O vínculo da seta é inválido.');
      }
    }
  }
  // Memoize completed paths so a deeply nested recovered scene still takes linear time.
  const checkedFrames = new Set<string>();
  for (const element of byId.values()) {
    const path = new Set<string>();
    let current: CanvasElement | undefined = element;
    while (current && !checkedFrames.has(current.id)) {
      if (path.has(current.id)) invalid('O desenho contém um ciclo de quadros.');
      path.add(current.id);
      current = typeof current.frameId === 'string' ? byId.get(current.frameId) : undefined;
    }
    for (const id of path) checkedFrames.add(id);
  }
  return value as unknown as CanvasScene;
}

export function canvasPlainText(scene: CanvasScene): string {
  return scene.elements
    .filter((element) => element.type === 'text' && !element.isDeleted)
    .map((element) => (typeof element.originalText === 'string' ? element.originalText : String(element.text ?? '')))
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
