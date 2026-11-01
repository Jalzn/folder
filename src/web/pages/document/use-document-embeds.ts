import { type DocumentBlock, embedIds, figureNumbers } from '@tinyfold/workspace/domain';
import { useEffect, useMemo, useState } from 'react';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { useEmbeds } from '../../lib/queries';

interface EditorEmbeds {
  ids: { taskIds: string[]; canvasIds: string[] };
  figures: ReadonlyMap<string, number>;
  /** What changes when the embeds do, so a keystroke in the text does not render them again. */
  signature: string;
}

function readEmbeds(editor: BlockEditorInstance): EditorEmbeds {
  const blocks = editor.document as unknown as DocumentBlock[];
  const ids = embedIds(blocks);
  const figures = figureNumbers(blocks);
  return { ids, figures, signature: JSON.stringify([ids, [...figures]]) };
}

/**
 * The embeds of the document's editor, saved or not, and their states (docs/etapas/11-documento-desenho.md,
 * decision 11): the IDs in the blocks go to `resolveEmbeds` in one read, and the figures count the drawings
 * in reading order, so moving a block renumbers them.
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
  const tasks = useMemo(() => new Map((resolved.data?.tasks ?? []).map((task) => [task.id, task])), [resolved.data]);
  const drawings = useMemo(
    () => new Map((resolved.data?.drawings ?? []).map((drawing) => [drawing.id, drawing])),
    [resolved.data],
  );
  const figures = embeds.figures;
  return useMemo(() => ({ tasks, drawings, figures }), [tasks, drawings, figures]);
}
