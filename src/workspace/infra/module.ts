import { defineModule } from '@tinyfold/core/infra';
import { searchText } from '../domain/search-text.js';

/**
 * The workspace module. Migration 007 computes the tasks' search text with workspace_search_text,
 * the domain's searchText, so a migrated task reads as a saved one would. It stays registered for
 * good: any database may still have that migration to apply.
 */
export const workspaceModule = defineModule({
  id: 'workspace',
  migrations: new URL('./migrations/', import.meta.url),
  sqlFunctions: { workspace_search_text: searchText },
});
