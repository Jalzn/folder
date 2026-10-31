import { describe, expect, it } from 'vitest';
import type { Project } from '../../lib/types';
import { activeProjects, moveTarget } from './project-order';

const project = (id: string, position: number, archived = false): Project => ({
  id,
  name: id,
  color: 'gray',
  position,
  version: 1,
  archivedAt: archived ? '2026-10-12T12:00:00.000Z' : null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
});
const projects = [project('c', 2), project('a', 0), project('old', 0, true), project('b', 1)];

describe('project order', () => {
  it('lists the active projects by position', () => {
    expect(activeProjects(projects).map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  });

  it('moves up before the previous project, and not past the top', () => {
    expect(moveTarget(projects, 'b', 'up')).toBe('a');
    expect(moveTarget(projects, 'a', 'up')).toBeUndefined();
  });

  it('moves down before the project after the next one, or to the end', () => {
    expect(moveTarget(projects, 'a', 'down')).toBe('c');
    expect(moveTarget(projects, 'b', 'down')).toBeNull();
    expect(moveTarget(projects, 'c', 'down')).toBeUndefined();
  });

  it('does not move an archived or unknown project', () => {
    expect(moveTarget(projects, 'old', 'up')).toBeUndefined();
    expect(moveTarget(projects, 'gone', 'down')).toBeUndefined();
  });
});
