import { z } from 'zod';
import { NAV_SORTS } from '../../domain/navigation.js';
import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import { id } from './common.js';

const sort = z.enum(NAV_SORTS).default('recent');
const { defaultItems, maxItems } = NAVIGATION_LIMITS.sidebar;

export const ProjectNavigationInput = z.object({
  projectId: id,
  documentsSort: sort,
  drawingsSort: sort,
  /** Unpinned items per section. */
  limit: z.number().int().min(1).max(maxItems).default(defaultItems),
});
export const ProjectOverviewInput = z.object({ projectId: id });

export type ProjectNavigationInput = z.infer<typeof ProjectNavigationInput>;
export type ProjectOverviewInput = z.infer<typeof ProjectOverviewInput>;
