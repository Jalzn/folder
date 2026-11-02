import { type DocumentBlock, readDocumentContent } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { SAMPLE_DESCRIPTIONS, SAMPLE_DOCUMENTS, visionDocument } from '../../../scripts/sample-content';
import { setupBlockNoteEditor } from '../testing/blocknote-editor';
import { descriptionSchema, documentSchema } from './schema';

const blockNote = setupBlockNoteEditor();

const ids = {
  navigation: '9f3d8e3a-3b5a-4cad-9e4f-2c3d4e5f6071',
  token: '7d1b6c1e-1f3e-4a8b-9c2d-0a1b2c3d4e5f',
  onboarding: '8e2c7d2f-2a4f-4b9c-8d3e-1b2c3d4e5f60',
};
const documents: [string, DocumentBlock[]][] = [
  ...Object.entries(SAMPLE_DOCUMENTS),
  ['Visão do produto', visionDocument(ids)],
];

/**
 * The sample as the app's editors open it (review Q1): opening a sample document or task must not save it, so
 * the editor gives back what scripts/sample-content.ts holds, embeds included, with the app's schemas.
 */
describe('the sample content', () => {
  for (const [title, content] of documents)
    it(`comes out of the document's editor as the seed writes it: ${title}`, () => {
      expect(readDocumentContent(content, {}, { embeds: true })).toEqual(content);
      expect(blockNote.reopen(documentSchema, content)).toEqual(content);
    });

  for (const [title, description] of Object.entries(SAMPLE_DESCRIPTIONS))
    it(`comes out of the description's editor as the seed writes it: ${title}`, () => {
      expect(blockNote.reopen(descriptionSchema, description)).toEqual(description);
    });
});
