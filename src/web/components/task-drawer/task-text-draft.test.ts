import { describe, expect, it } from 'vitest';
import { parseTaskTextDraft } from './task-text-draft';

const paragraph = (text: string) => ({
  id: 'p1',
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text, styles: {} }],
  children: [],
});
const draft = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: 1,
    baseVersion: 2,
    snapshot: { title: 'Gerar token', description: [paragraph('Passos')] },
    pending: null,
    ...patch,
  });

describe('parseTaskTextDraft', () => {
  it('reads a valid draft with its pending save', () => {
    const pending = { id: 't1', requestId: 'r1', expectedVersion: 2, title: 'Gerar', description: [] };
    const read = parseTaskTextDraft(draft({ pending }));
    expect(read?.snapshot.title).toBe('Gerar token');
    expect(read?.snapshot.description).toHaveLength(1);
    expect(read?.pending?.requestId).toBe('r1');
  });

  it('refuses what is not a task draft', () => {
    expect(parseTaskTextDraft(null)).toBeNull();
    expect(parseTaskTextDraft('{')).toBeNull();
    expect(parseTaskTextDraft(draft({ format: 2 }))).toBeNull();
    expect(parseTaskTextDraft(draft({ baseVersion: 0 }))).toBeNull();
    expect(parseTaskTextDraft(draft({ snapshot: { title: 'x', content: [] } }))).toBeNull();
  });

  it('refuses a title over the limit, and drops a malformed pending save alone', () => {
    expect(parseTaskTextDraft(draft({ snapshot: { title: 'x'.repeat(301), description: [] } }))).toBeNull();
    const read = parseTaskTextDraft(draft({ pending: { id: 't1', requestId: 'r1', expectedVersion: 0 } }));
    expect(read?.pending).toBeNull();
    expect(read?.snapshot.title).toBe('Gerar token');
  });

  it('refuses a description beyond the recovery limits', () => {
    const blocks = Array.from({ length: 20_001 }, (_, index) => ({ ...paragraph('x'), id: `b${index}` }));
    expect(parseTaskTextDraft(draft({ snapshot: { title: 'x', description: blocks } }))).toBeNull();
  });
});
