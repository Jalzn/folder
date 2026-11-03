import type { Project } from '../../domain/project-models.js';

/** The position after every active project in the selector. */
export const endOfSelector = (active: readonly Project[]) =>
  Math.max(-1, ...active.map((project) => project.position)) + 1;
