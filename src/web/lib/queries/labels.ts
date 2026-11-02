import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { keys } from './keys';

/** The active labels, in alphabetical order, with their colors and how many tasks use each. */
export const labelsQuery = queryOptions({
  queryKey: keys.labels,
  queryFn: () => api.workspace.listLabels({}),
  select: (data) => data.labels,
});

export function useLabels() {
  return useQuery(labelsQuery);
}

export type LabelSummary = Awaited<ReturnType<typeof api.workspace.listLabels>>['labels'][number];
