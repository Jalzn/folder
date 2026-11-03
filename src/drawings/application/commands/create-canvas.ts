import { type Canvas, type CanvasAck, canvasPlainText, emptyCanvasScene } from '../../domain/canvas/index.js';
import type { CreateCanvasInput } from '../contracts/schemas.js';
import { requireActiveProject, requireFolderInProject } from '../organization.js';
import type { DrawingsContext } from '../ports.js';
import { titleOrUntitled } from '../title.js';
export function createCanvas(ctx: DrawingsContext, input: CreateCanvasInput): Promise<CanvasAck> {
  return ctx.write('workspace.createCanvas', input, async (repo) => {
    const project = await requireActiveProject(repo, input.projectId);
    if (input.folderId) await requireFolderInProject(repo, input.folderId, project.id);
    const now = ctx.now();
    const scene = input.scene ?? emptyCanvasScene();
    const canvas: Canvas = {
      id: ctx.newId(),
      title: titleOrUntitled(input.title),
      projectId: project.id,
      scene,
      plainText: canvasPlainText(scene),
      formatVersion: 1,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      pinnedAt: null,
      folderId: input.folderId ?? null,
    };
    await repo.insertCanvas(canvas);
    return { id: canvas.id, version: canvas.version, updatedAt: now };
  });
}
