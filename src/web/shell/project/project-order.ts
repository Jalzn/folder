import type { Project } from '../../lib/types';

export type MoveDirection = 'up' | 'down';

/** The active projects in switcher order. */
export function activeProjects(projects: Project[]) {
  return projects.filter((project) => !project.archivedAt).sort((a, b) => a.position - b.position);
}

/**
 * The `beforeProjectId` that moves a project one place up or down the switcher, `null` for the end, or
 * `undefined` when it is already at that edge (the menu item is then disabled).
 */
export function moveTarget(projects: Project[], id: string, direction: MoveDirection): string | null | undefined {
  const order = activeProjects(projects);
  const index = order.findIndex((project) => project.id === id);
  if (index < 0) return undefined;
  if (direction === 'up') return index === 0 ? undefined : (order[index - 1]?.id ?? undefined);
  if (index === order.length - 1) return undefined;
  return order[index + 2]?.id ?? null;
}
