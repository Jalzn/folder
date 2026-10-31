import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface CanvasListOptions {
  projectId?: string;
  query?: string;
  deleted?: boolean;
}

export const canvasQuery = (id: string) => ({
  queryKey: ['workspace', 'canvas', id] as const,
  queryFn: () => api.workspace.getCanvas({ id }),
});

export function useCanvases(options: CanvasListOptions = {}) {
  return useQuery({
    queryKey: ['workspace', 'canvases', options],
    queryFn: () => api.workspace.listCanvases(options),
  });
}

export function useCanvas(id: string) {
  return useQuery(canvasQuery(id));
}
