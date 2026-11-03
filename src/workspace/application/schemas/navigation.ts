import { id } from '@tinyfold/core/application';
import { z } from 'zod';
import { NAV_SORTS } from '../../domain/navigation.js';
import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';

const { defaultItems, maxItems } = NAVIGATION_LIMITS.sidebar;

/**
 * The stage 08 per-type orders (`documentsSort`, `drawingsSort`) are gone; an old client that still
 * sends them has them dropped, as any unknown key.
 */
export const ProjectNavigationInput = z.object({
  projectId: id,
  /** The order of the "Itens" tree, inside each folder and at the root. */
  sort: z.enum(NAV_SORTS).default('recent'),
  /** Children per folder and loose items at the root; pinned items come on top of them. */
  limit: z.number().int().min(1).max(maxItems).default(defaultItems),
});
export const ProjectOverviewInput = z.object({ projectId: id });

export type ProjectNavigationInput = z.infer<typeof ProjectNavigationInput>;
export type ProjectOverviewInput = z.infer<typeof ProjectOverviewInput>;
