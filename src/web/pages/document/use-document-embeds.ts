import { useEffect, useMemo, useState } from 'react';
import { type DocumentBlock, embedIds, figureNumbers } from '#rich-text/domain';
import { embedBlock } from '../../editor/blocks/embed-blocks';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { validEmbed } from '../../lib/files/sanitize-embeds';
import { useEmbeds } from '../../lib/queries';
import type { EmbeddedDrawing, EmbeddedTask } from '../../lib/queries/embeds';

interface EditorEmbeds {
  /** The IDs the server can resolve. */
  ids: { taskIds: string[]; canvasIds: string[] };
  /** The IDs it would refuse, which read as missing here and never reach it (Sec R1). */
  refused: { taskIds: string[]; canvasIds: string[] };
  figures: ReadonlyMap<string, number>;
  /** What changes when the embeds do, so a keystroke in the text does not render them again. */
  signature: string;
}

const validTask = (taskId: string) => validEmbed(embedBlock('task', taskId));
const validCanvas = (canvasId: string) => validEmbed(embedBlock('drawing', canvasId));

function readEmbeds(editor: BlockEditorInstance): EditorEmbeds {
  const blocks = editor.document as unknown as DocumentBlock[];
  const all = embedIds(blocks);
  const ids = { taskIds: all.taskIds.filter(validTask), canvasIds: all.canvasIds.filter(validCanvas) };
  const refused = {
    taskIds: all.taskIds.filter((id) => !validTask(id)),
    canvasIds: all.canvasIds.filter((id) => !validCanvas(id)),
  };
  const figures = figureNumbers(blocks);
  return { ids, refused, figures, signature: JSON.stringify([all, [...figures]]) };
}

/**
 * The embeds of the document's editor, saved or not, and their states (docs/etapas/11-documento-desenho.md,
 * decision 11): the IDs in the blocks go to `resolveEmbeds` in one read, but for those the server would refuse,
 * which read as missing (Sec R1); the figures count the drawings in reading order, so moving a block
 * renumbers them.
 */
export function useDocumentEmbeds(documentId: string, editor: BlockEditorInstance) {
  const [embeds, setEmbeds] = useState(() => readEmbeds(editor));
  useEffect(() => {
    const update = () => {
      const next = readEmbeds(editor);
      setEmbeds((current) => (current.signature === next.signature ? current : next));
    };
    update();
    return editor.onChange(update);
  }, [editor]);
  const resolved = useEmbeds(documentId, embeds.ids);
  const { refused } = embeds;
  const tasks = useMemo(
    () =>
      new Map<string, EmbeddedTask>([
        ...(resolved.data?.tasks ?? []).map((task) => [task.id, task] as const),
        ...refused.taskIds.map((id) => [id, { state: 'missing', id }] as const),
      ]),
    [resolved.data, refused],
  );
  const drawings = useMemo(
    () =>
      new Map<string, EmbeddedDrawing>([
        ...(resolved.data?.drawings ?? []).map((drawing) => [drawing.id, drawing] as const),
        ...refused.canvasIds.map((id) => [id, { state: 'missing', id }] as const),
      ]),
    [resolved.data, refused],
  );
  const figures = embeds.figures;
  return useMemo(() => ({ tasks, drawings, figures }), [tasks, drawings, figures]);
}
