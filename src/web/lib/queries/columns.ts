import { queryOptions, useQuery } from '@tanstack/react-query';
import { api, queryClient } from '../api';
import { keys } from './keys';

/** The board's columns, the same for every project, with the done column marked. */
export const columnsQuery = queryOptions({
  queryKey: keys.columns,
  queryFn: () => api.workspace.listColumns({}),
});

export function useColumns() {
  return useQuery(columnsQuery);
}

export type ColumnSummary = Awaited<ReturnType<typeof api.workspace.listColumns>>['columns'][number];

/** The columns as last read, for a write that runs from a queue. */
export const cachedColumns = () => queryClient.getQueryData(columnsQuery.queryKey)?.columns;
