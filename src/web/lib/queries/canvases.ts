import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { keys } from './keys';

export interface CanvasListOptions {
  projectId?: string;
  query?: string;
  deleted?: boolean;
}

export const canvasQuery = (id: string) =>
  queryOptions({ queryKey: keys.canvas(id), queryFn: () => api.workspace.getCanvas({ id }) });

export function useCanvases(options: CanvasListOptions = {}) {
  return useQuery({
    queryKey: keys.canvases(options),
    queryFn: () => api.workspace.listCanvases(options),
  });
}

export function useCanvas(id: string) {
  return useQuery(canvasQuery(id));
}
