import type { NavigationContext } from '../../application/navigation/ports.js';
import { projectNavigation } from '../../application/navigation/project-navigation.js';
import { projectOverview } from '../../application/navigation/project-overview.js';
import type { ReadingContext, SearchHit } from '../../application/reading/ports.js';
import { SearchInput } from '../../application/reading/schemas.js';
import { search } from '../../application/reading/search.js';
import { ProjectNavigationInput, ProjectOverviewInput } from '../../application/schemas/navigation.js';
import { operation } from './operation.js';

/** A search result as the interface gets it: the title rank only orders the results. */
const searchItem = ({ titleRank: _, ...item }: SearchHit) => item;

export const navigationOperations = (navigation: NavigationContext, reading: ReadingContext) => ({
  projectNavigation: operation(ProjectNavigationInput, (input) => projectNavigation(navigation, input)),
  projectOverview: operation(ProjectOverviewInput, (input) => projectOverview(navigation, input)),
  // The agents' search, with the same order and cursors, without the text budget of their answers.
  search: operation(SearchInput, async (input) => {
    const page = await search(reading, input);
    return { items: page.items.map(searchItem), nextCursor: page.nextCursor(page.items.length) };
  }),
});
