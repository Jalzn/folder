import { describe, expect, it } from 'vitest';
import { setupBlockNoteEditor } from '../src/web/testing/blocknote-editor.js';
import { checklistProgress } from '../src/workspace/domain/checklist.js';
import { SAMPLE_DESCRIPTIONS } from './seed-sample.js';

const blockNote = setupBlockNoteEditor();

describe('the sample descriptions', () => {
  // Opening a sample task in the drawer must not save it: the editor gives back what the seed wrote.
  for (const [title, description] of Object.entries(SAMPLE_DESCRIPTIONS))
    it(`come out of the real BlockNote as the seed writes them: ${title}`, () => {
      expect(blockNote.reload(description)).toEqual(description);
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
