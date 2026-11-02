import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { keys } from './keys';

export interface DocumentListOptions {
  projectId?: string;
  query?: string;
  deleted?: boolean;
}

export const documentQuery = (id: string) =>
  queryOptions({ queryKey: keys.document(id), queryFn: () => api.workspace.getDocument({ id }) });

export function useDocuments(options: DocumentListOptions = {}) {
  return useQuery({
    queryKey: keys.documents(options),
    queryFn: () => api.workspace.listDocuments(options),
  });
}

export function useDocument(id: string) {
  return useQuery(documentQuery(id));
}
