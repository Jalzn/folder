import { operation } from '#core/application';
import { readCanvasPreviewImage, saveCanvasPreview } from '../application/canvas-previews.js';
import { createCanvas } from '../application/commands/create-canvas.js';
import { deleteCanvas, purgeCanvas, restoreCanvas } from '../application/commands/lifecycle.js';
import { saveCanvas } from '../application/commands/save-canvas.js';
import {
  CreateCanvasInput,
  DeleteCanvasInput,
  GetCanvasInput,
  ListCanvasesInput,
  PurgeCanvasInput,
  ReadDrawingInput,
  RestoreCanvasInput,
  SaveCanvasInput,
  SaveCanvasPreviewInput,
} from '../application/contracts/schemas.js';
import type { DrawingsContext, PngImageData } from '../application/ports.js';
import { getCanvas } from '../application/queries/get-canvas.js';
import { listCanvases } from '../application/queries/list-canvases.js';
import { readDrawing } from '../application/queries/read-drawing.js';

export function operationsFrom(context: DrawingsContext, imageData: PngImageData) {
  return {
    listCanvases: operation(ListCanvasesInput, (input) => listCanvases(context, input)),
    getCanvas: operation(GetCanvasInput, (input) => getCanvas(context, input)),
    createCanvas: operation(CreateCanvasInput, (input) => createCanvas(context, input)),
    saveCanvas: operation(SaveCanvasInput, (input) => saveCanvas(context, input)),
    deleteCanvas: operation(DeleteCanvasInput, (input) => deleteCanvas(context, input)),
    restoreCanvas: operation(RestoreCanvasInput, (input) => restoreCanvas(context, input)),
    saveCanvasPreview: operation(SaveCanvasPreviewInput, (input) => saveCanvasPreview(context, imageData, input)),
    purgeCanvas: operation(PurgeCanvasInput, (input) => purgeCanvas(context, input)),
  };
}

export function queriesFrom(context: DrawingsContext) {
  return {
    previewImage: (id: string) => readCanvasPreviewImage(context, id),
    readForAgent: operation(ReadDrawingInput, (input) => readDrawing(context, input)),
  };
}

export type DrawingsOperations = ReturnType<typeof operationsFrom>;
