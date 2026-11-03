import { type CanvasAck, canvasPlainText } from '../../domain/canvas/index.js';
import { titleOrUntitled } from '../../domain/text.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { SaveCanvasInput } from '../schemas/canvases.js';
import { assertVersion } from '../version.js';
import { requireCanvas } from './canvas-lookups.js';
export function saveCanvas(ctx: WorkspaceContext, input: SaveCanvasInput): Promise<CanvasAck> {
  const plainText = canvasPlainText(input.scene);
  return ctx.write('workspace.saveCanvas', input, async (repo) => {
    const canvas = await requireCanvas(repo, input.id);
    assertVersion(canvas.version, input.expectedVersion);
    const updatedAt = ctx.now();
    const version = canvas.version + 1;
    await repo.saveCanvas(
      {
        ...canvas,
        title: titleOrUntitled(input.title),
        scene: input.scene,
        plainText,
        version,
        updatedAt,
      },
      canvas.version,
    );
    return { id: canvas.id, version, updatedAt };
  });
}
