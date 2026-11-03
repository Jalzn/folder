import type { Database } from '@tinyfold/core/infra';
import { type CanvasPreviewImage, readCanvasPreviewImage } from '../application/canvas-previews.js';
import type { WorkspaceContext } from '../application/ports/context.js';
import { workspaceContext } from './context.js';

export type { CanvasPreviewImage };

/** The workspace's files the server serves outside /rpc: for now, the drawings' stored previews. */
export function createWorkspaceFiles(db: Database) {
  const ctx = workspaceContext(db);
  return filesFromContext(ctx);
}
export function filesFromContext(ctx: WorkspaceContext) {
  return {
    /** A live drawing's preview, or undefined; an ID that is no UUID throws a VALIDATION AppError. */
    canvasPreview: (id: string) => readCanvasPreviewImage(ctx, id),
  };
}

export type WorkspaceFiles = ReturnType<typeof createWorkspaceFiles>;
