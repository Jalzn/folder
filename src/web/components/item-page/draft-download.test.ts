import { describe, expect, it } from 'vitest';
import { DRAFT_DOWNLOADED, draftFileName } from './draft-download';

describe('a downloaded draft', () => {
  it('is named the same way for the three items, and says so the same way', () => {
    expect(draftFileName('document', 'd1')).toBe('tinyfold-rascunho-documento-d1.json');
    expect(draftFileName('drawing', 'c1')).toBe('tinyfold-rascunho-desenho-c1.json');
    expect(draftFileName('task', 't1')).toBe('tinyfold-rascunho-tarefa-t1.json');
    expect(DRAFT_DOWNLOADED).toBe('Uma cópia do rascunho foi baixada.');
  });
});
