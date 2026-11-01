import { type RefObject, useEffect } from 'react';
import { type OriginMarker, setOriginMarkers } from '../../editor/origin-markers';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { useColumns, useTasks } from '../../lib/queries';
import { useTaskDrawer } from '../../shell';

/**
 * The tasks born in the document as markers after their excerpts (docs/etapas/11-documento-desenho.md,
 * decision 8): from the list the "Tarefas" popover reads, which leaves out the trash; an origin of several
 * blocks has none. A marker opens its task in the drawer.
 */
export function useOriginMarkers(
  editor: BlockEditorInstance,
  documentId: string,
  openOrigin: RefObject<(taskId: string) => void>,
) {
  const drawer = useTaskDrawer();
  const tasks = useTasks({ documentId }).data?.tasks;
  const columns = useColumns().data?.columns;
  useEffect(() => {
    if (!tasks || !columns) return;
    openOrigin.current = (taskId) => {
      const task = tasks.find((each) => each.id === taskId);
      if (task) drawer.openTask(task);
    };
    const markers = tasks.flatMap((task): OriginMarker[] => {
      const source = task.source;
      if (!source?.blockId || source.documentId !== documentId) return [];
      const index = columns.findIndex((column) => column.id === task.columnId);
      const column = columns[index];
      const done = Boolean(column?.isDone);
      return [
        {
          taskId: task.id,
          title: task.title,
          status: done ? 'Concluída' : (column?.name ?? ''),
          ring: { index: Math.max(0, index), count: Math.max(columns.length, 1), done },
          blockId: source.blockId,
          excerpt: source.excerpt,
        },
      ];
    });
    setOriginMarkers(editor.prosemirrorView, markers);
  }, [editor, tasks, columns, documentId, drawer, openOrigin]);
}
