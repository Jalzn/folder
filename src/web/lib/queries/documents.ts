import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface DocumentListOptions {
  projectId?: string;
  query?: string;
  deleted?: boolean;
}

export const documentQuery = (id: string) => ({
  queryKey: ['workspace', 'document', id] as const,
  queryFn: () => api.workspace.getDocument({ id }),
});

export function useDocuments(options: DocumentListOptions = {}) {
  return useQuery({
    queryKey: ['workspace', 'documents', options],
    queryFn: () => api.workspace.listDocuments(options),
  });
}

export function useDocument(id: string) {
  return useQuery(documentQuery(id));
}
