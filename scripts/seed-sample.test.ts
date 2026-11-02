import { describe, expect, it } from 'vitest';
import type { CanvasElement } from '../src/workspace/domain/canvas.js';
import { checklistProgress } from '../src/workspace/domain/checklist.js';
import { readDocumentContent } from '../src/workspace/domain/document.js';
import { embedIds, isEmbedType } from '../src/workspace/domain/embeds.js';
import type { DocumentBlock } from '../src/workspace/domain/models.js';
import {
  loadScene,
  SAMPLE_DESCRIPTIONS,
  SAMPLE_DOCUMENTS,
  sampleScenes,
  sceneIndex,
  visionDocument,
} from './sample-content.js';

// The sample's content, as data: what the editors save. The web's unit tests round-trip the same
// documents and descriptions through the real BlockNote; seed-sample.db.test.ts checks what the seed
// stores, and e2e/seed-sample.spec.ts that opening each item in Chrome saves nothing.

const ids = {
  navigation: '9f3d8e3a-3b5a-4cad-9e4f-2c3d4e5f6071',
  token: '7d1b6c1e-1f3e-4a8b-9c2d-0a1b2c3d4e5f',
  onboarding: '8e2c7d2f-2a4f-4b9c-8d3e-1b2c3d4e5f60',
};
const documents: [string, DocumentBlock[]][] = [
  ...Object.entries(SAMPLE_DOCUMENTS),
  ['Visão do produto', visionDocument(ids)],
];

/** Every block in reading order. */
const blocksOf = (blocks: readonly DocumentBlock[]): DocumentBlock[] =>
  blocks.flatMap((block) => [block, ...blocksOf(block.children ?? [])]);

/** What BlockNote saves of a text block: its id, its default props and an empty list of children. */
function expectSavedForm(block: DocumentBlock) {
  expect(block.id).toMatch(/^[0-9a-f-]{36}$/u);
  expect(block.children).toEqual([]);
  if (isEmbedType(block.type)) return;
  expect(block.props).toMatchObject({ backgroundColor: 'default', textColor: 'default', textAlignment: 'left' });
  // The document schema has toggle headings off, so a heading has no isToggleable.
  if (block.type === 'heading') expect(block.props).not.toHaveProperty('isToggleable');
}

describe('the sample descriptions', () => {
  it('are valid descriptions, in the form the editor saves, without embeds', () => {
    for (const [title, description] of Object.entries(SAMPLE_DESCRIPTIONS)) {
      expect(readDocumentContent(description), title).toEqual(description);
      for (const block of blocksOf(description)) expectSavedForm(block);
    }
  });

  it("have the brief's checklists", () => {
    const progress = Object.entries(SAMPLE_DESCRIPTIONS)
      .map(([title, description]) => [title, checklistProgress(description)] as const)
      .filter(([, { total }]) => total > 0);
    expect(progress).toEqual([
      ['Gerar token pessoal no Perfil', { done: 2, total: 5 }],
      ['Colunas configuráveis no quadro', { done: 3, total: 3 }],
      ['Escolher luminária', { done: 1, total: 3 }],
    ]);
  });
});

describe('the sample documents', () => {
  it('are valid documents, embeds included, every block in the form the editor saves', () => {
    for (const [title, content] of documents) {
      expect(readDocumentContent(content, {}, { embeds: true }), title).toEqual(content);
      for (const block of blocksOf(content)) expectSavedForm(block);
    }
  });

  it('embed in the vision the drawing, the task and the task in the trash of the brief', () => {
    const vision = visionDocument(ids);
    expect(embedIds(vision)).toEqual({ taskIds: [ids.token, ids.onboarding], canvasIds: [ids.navigation] });
    expect(vision.filter((block) => isEmbedType(block.type))).toEqual([
      { id: expect.any(String), type: 'drawingEmbed', props: { canvasId: ids.navigation }, children: [] },
      { id: expect.any(String), type: 'taskEmbed', props: { taskId: ids.token }, children: [] },
      { id: expect.any(String), type: 'taskEmbed', props: { taskId: ids.onboarding }, children: [] },
    ]);
  });
});

describe('the sample scenes', () => {
  const scenes = { ...sampleScenes(), 'Desenho de carga': loadScene() };
  const byId = (elements: readonly CanvasElement[]) => new Map(elements.map((element) => [element.id, element]));

  it('are in the form Excalidraw 0.18.1 restores: index, version 1, bound elements as lists', () => {
    for (const [title, scene] of Object.entries(scenes))
      for (const [position, element] of scene.elements.entries()) {
        expect(element, title).toMatchObject({ index: sceneIndex(position), version: 1, isDeleted: false });
        expect(Array.isArray(element.boundElements), `${title} ${element.id}`).toBe(true);
        if (element.type === 'arrow') expect(element, title).toHaveProperty('lastCommittedPoint', null);
      }
    expect([sceneIndex(0), sceneIndex(9), sceneIndex(10), sceneIndex(61)]).toEqual(['a0', 'a9', 'aA', 'az']);
    expect(() => sceneIndex(62)).toThrow(RangeError);
  });

  it('bind labels and arrows on both sides', () => {
    for (const [title, scene] of Object.entries(scenes)) {
      const elements = byId(scene.elements);
      for (const element of scene.elements) {
        const listed = (element.boundElements as { id: string; type: string }[]).map((bound) => bound.id);
        for (const id of listed) {
          const bound = elements.get(id);
          const back =
            bound?.type === 'text'
              ? bound.containerId === element.id
              : [bound?.startBinding, bound?.endBinding].some(
                  (binding) => (binding as { elementId?: string } | null)?.elementId === element.id,
                );
          expect(back, `${title}: ${element.id} lists ${id}`).toBe(true);
        }
        // And the other way: a label's box and an arrow's ends list it.
        const owners = [
          element.containerId,
          (element.startBinding as { elementId?: string } | null | undefined)?.elementId,
          (element.endBinding as { elementId?: string } | null | undefined)?.elementId,
        ].filter((id): id is string => typeof id === 'string');
        for (const owner of owners)
          expect(
            (elements.get(owner)?.boundElements as { id: string }[] | undefined)?.some(
              (bound) => bound.id === element.id,
            ),
            `${title}: ${owner} lists ${element.id}`,
          ).toBe(true);
      }
    }
  });
});
