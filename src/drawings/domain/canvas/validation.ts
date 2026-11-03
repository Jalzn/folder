import { assertContentJson, boundedLimit, validColor as color, object } from '@tinyfold/core/domain';
import { assertElement, assertPoints, bindableTypes, finite, identifier, invalid, textContainers } from './elements.js';
import {
  type CanvasElement,
  type CanvasScene,
  type CanvasSceneLimits,
  MAX_CANVAS_BYTES,
  MAX_CANVAS_ELEMENTS,
  RECOVERY_CANVAS_LIMITS,
} from './models.js';

/** The server always uses default limits; only local recovery may use the larger bounded limits. */
export function readCanvasScene(value: unknown, limits: CanvasSceneLimits = {}): CanvasScene {
  const maxBytes = boundedLimit(limits.maxBytes, MAX_CANVAS_BYTES, RECOVERY_CANVAS_LIMITS.maxBytes);
  const maxElements = boundedLimit(limits.maxElements, MAX_CANVAS_ELEMENTS, RECOVERY_CANVAS_LIMITS.maxElements);
  assertContentJson(value, {
    maxDepth: 32,
    plainObjects: true,
    depthMessage: 'O desenho contém estruturas muito profundas.',
    propertyMessage: 'O desenho contém uma propriedade inválida.',
    valueMessage: 'O desenho contém elementos inválidos.',
  });
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
