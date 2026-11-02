import type { ItemType } from '../types';
import { canvasQuery } from './canvases';
import { documentQuery } from './documents';

/** An open item's query: the document's or the drawing's. */
export const itemQuery = (type: ItemType, id: string) => (type === 'document' ? documentQuery(id) : canvasQuery(id));
