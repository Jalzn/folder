import type { CanvasElement } from './canvas-models.js';
import { validColor as color, object } from './content-guards.js';

const elementTypes = new Set(['rectangle', 'diamond', 'ellipse', 'line', 'arrow', 'freedraw', 'text', 'frame']);
export const textContainers = new Set(['rectangle', 'diamond', 'ellipse', 'arrow']);
export const bindableTypes = new Set(['rectangle', 'diamond', 'ellipse', 'frame', 'text']);
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
export const identifier = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;
export const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e9;
export function invalid(message = 'O desenho contém elementos inválidos.'): never {
  throw new Error(message);
}
function validLink(value: unknown) {
  if (value === null || value === undefined) return;
  if (typeof value !== 'string' || value.length > 4000) invalid('O endereço do elemento é inválido.');
  // Control characters and Unicode line separators are refused anywhere, edges included: the scene
  // keeps the value as written, and a reader could take one for a new line.
  const link = value.trim();
  if (
    /[\p{Cc}\u2028\u2029]/u.test(value) ||
    (/^[a-z][a-z\d+.-]*:/iu.test(link) && !/^(https?:|mailto:|tel:)/iu.test(link))
  )
    invalid('Use um endereço http, https, mailto ou tel no link.');
}
function assertPoint(point: unknown): asserts point is number[] {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(finite)) invalid('Os pontos do traço são inválidos.');
}
export function assertPoints(points: unknown): asserts points is number[][] {
  if (!Array.isArray(points) || points.length > 100_000) invalid('Os pontos do traço são inválidos.');
  for (const point of points) {
    assertPoint(point);
  }
}
export function assertElement(element: unknown): asserts element is CanvasElement {
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
