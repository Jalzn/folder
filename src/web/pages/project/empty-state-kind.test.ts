import { describe, expect, it } from 'vitest';
import type { Project } from '../../lib/types';
import { emptyStateKind } from './empty-state-kind';

const project = (id: string, archived: boolean): Project => ({
  id,
  name: id,
  color: 'gray',
  position: 0,
  version: 1,
  archivedAt: archived ? '2026-10-12T12:00:00.000Z' : null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-12T12:00:00.000Z',
});

describe('emptyStateKind', () => {
  it('asks for a first project on a new installation', () => {
    expect(emptyStateKind([])).toBe('first-project');
  });

  it('says no project is active when all are archived', () => {
    expect(emptyStateKind([project('a', true), project('b', true)])).toBe('all-archived');
  });

  it('has no empty state while a project is active', () => {
    expect(emptyStateKind([project('a', true), project('b', false)])).toBeNull();
  });
});
