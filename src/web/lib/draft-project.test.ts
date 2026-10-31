import { describe, expect, it } from 'vitest';
import type { Legacy, SavedDraft } from './autosave';
import { withDraftProject } from './draft-project';

type Item = { title: string; projectId: string };
const draft = (projectId: string | null, pending = false): SavedDraft<Legacy<Item>> => ({
  format: 1,
  baseVersion: 3,
  snapshot: { title: 'Notas', projectId },
  pending: pending ? { title: 'Notas', projectId, id: 'd1', requestId: 'r1', expectedVersion: 3 } : null,
});

describe('withDraftProject', () => {
  it('recovers a draft without a project into the item’s project, pending save included', () => {
    const recovered = withDraftProject<Item>(draft(null, true), 'p1');
    expect(recovered?.snapshot.projectId).toBe('p1');
    expect(recovered?.pending?.projectId).toBe('p1');
  });

  it('keeps a draft that already names a project, and leaves missing drafts alone', () => {
    expect(withDraftProject<Item>(draft('p2', true), 'p1')?.snapshot.projectId).toBe('p2');
    expect(withDraftProject<Item>(draft('p2', true), 'p1')?.pending?.projectId).toBe('p2');
    expect(withDraftProject<Item>(null, 'p1')).toBeNull();
  });
});
