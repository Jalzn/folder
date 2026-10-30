import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export function useProjects(includeArchived = false) {
  return useQuery({
    queryKey: ['workspace', 'projects', includeArchived],
    queryFn: () => api.workspace.listProjects({ includeArchived }),
  });
}
export function useDocuments(options: { projectId?: string | null; query?: string; deleted?: boolean } = {}) {
  return useQuery({
    queryKey: ['workspace', 'documents', options],
    queryFn: () => api.workspace.listDocuments(options),
  });
}
export function useDocument(id: string) {
  return useQuery({ queryKey: ['workspace', 'document', id], queryFn: () => api.workspace.getDocument({ id }) });
}
export function useCanvases(options: { projectId?: string | null; query?: string; deleted?: boolean } = {}) {
  return useQuery({
    queryKey: ['workspace', 'canvases', options],
    queryFn: () => api.workspace.listCanvases(options),
  });
}
export function useCanvas(id: string) {
  return useQuery({ queryKey: ['workspace', 'canvas', id], queryFn: () => api.workspace.getCanvas({ id }) });
}
export function useTasks(options: { projectId?: string | null; documentId?: string } = {}) {
  return useQuery({ queryKey: ['workspace', 'tasks', options], queryFn: () => api.workspace.listTasks(options) });
}
