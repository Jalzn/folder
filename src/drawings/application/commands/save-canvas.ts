import { assertVersion } from '#core/application';
import { type CanvasAck, canvasPlainText } from '../../domain/canvas/index.js';
import type { SaveCanvasInput } from '../contracts/schemas.js';
import type { DrawingsContext } from '../ports.js';
import { requireCanvas } from '../queries/canvas-lookups.js';
import { titleOrUntitled } from '../title.js';
export function saveCanvas(ctx: DrawingsContext, input: SaveCanvasInput): Promise<CanvasAck> {
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
