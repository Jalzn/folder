import { z } from 'zod';
import { readCanvasScene } from '../../domain/canvas.js';
import { edit, id, request, version } from './common.js';

const scene = z.unknown().transform((value, ctx) => {
  try {
    return readCanvasScene(value);
  } catch (error) {
    ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Desenho inválido.' });
    return z.NEVER;
  }
});

export const ListCanvasesInput = z.object({
  projectId: id.optional(),
  query: z.string().max(300).optional(),
  deleted: z.boolean().optional(),
});
export const GetCanvasInput = z.object({ id });
export const CreateCanvasInput = z.object({
  ...request,
  title: z.string().trim().max(300).optional(),
  projectId: id,
  scene: scene.optional(),
});
export const SaveCanvasInput = z.object({
  ...edit,
  title: z.string().trim().max(300),
  projectId: id.optional(),
  scene,
});
export const DeleteCanvasInput = z.object(edit);
export const RestoreCanvasInput = z.object(edit);
/**
 * The PNG rendered for a saved version. `sceneFingerprint`, the sceneFingerprint of the scene it
 * shows, lets a preview rendered before a move or a rename still count for the scene it shows.
 */
export const SaveCanvasPreviewInput = z.object({
  id,
  version,
  sceneFingerprint: z
    .string()
    .regex(/^[0-9a-f]{1,16}$/u)
    .optional(),
  png: z.instanceof(Uint8Array),
});

export type ListCanvasesInput = z.infer<typeof ListCanvasesInput>;
export type GetCanvasInput = z.infer<typeof GetCanvasInput>;
export type CreateCanvasInput = z.infer<typeof CreateCanvasInput>;
export type SaveCanvasInput = z.infer<typeof SaveCanvasInput>;
export type DeleteCanvasInput = z.infer<typeof DeleteCanvasInput>;
export type RestoreCanvasInput = z.infer<typeof RestoreCanvasInput>;
export type SaveCanvasPreviewInput = z.infer<typeof SaveCanvasPreviewInput>;
