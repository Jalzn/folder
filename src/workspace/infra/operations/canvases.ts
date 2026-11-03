import { saveCanvasPreview } from '../../application/canvas-previews.js';
import {
  createCanvas,
  deleteCanvas,
  getCanvas,
  listCanvases,
  restoreCanvas,
  saveCanvas,
} from '../../application/canvases.js';
import type { WorkspaceContext } from '../../application/ports/context.js';
import {
  CreateCanvasInput,
  DeleteCanvasInput,
  GetCanvasInput,
  ListCanvasesInput,
  RestoreCanvasInput,
  SaveCanvasInput,
  SaveCanvasPreviewInput,
} from '../../application/schemas/canvases.js';
import { zlibImageData } from '../png-image-data.js';
import { operation } from './operation.js';

export const canvasOperations = (ctx: WorkspaceContext) => ({
  listCanvases: operation(ListCanvasesInput, (input) => listCanvases(ctx, input)),
  getCanvas: operation(GetCanvasInput, (input) => getCanvas(ctx, input)),
  createCanvas: operation(CreateCanvasInput, (input) => createCanvas(ctx, input)),
  saveCanvas: operation(SaveCanvasInput, (input) => saveCanvas(ctx, input)),
  deleteCanvas: operation(DeleteCanvasInput, (input) => deleteCanvas(ctx, input)),
  restoreCanvas: operation(RestoreCanvasInput, (input) => restoreCanvas(ctx, input)),
  saveCanvasPreview: operation(SaveCanvasPreviewInput, (input) => saveCanvasPreview(ctx, zlibImageData, input)),
});
