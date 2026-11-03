import { ArrowDownToLine, ArrowUpFromLine, ListTodo, Plus, Shapes } from 'lucide-react';
import type { RefObject } from 'react';
import type { useItemEditor } from '../../components/item-page';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { ARCHIVED_NOTE } from '../../lib/text/project-text';
import { usePageCommands, useTaskDrawer } from '../../shell';
import { useToast } from '../../ui';
import type { EmbedCommands } from './DocumentEmbeds';
import type { documentController } from './document-session';
import type { useDocumentFiles } from './use-document-files';
import { NO_EXCERPT, selectedText, type useTaskFromSelection } from './use-task-from-selection';

export function useDocumentCommands({
  editor,
  controller,
  archived,
  projectId,
  taskFromSelection,
  embedCommands,
  files,
  page,
}: {
  editor: BlockEditorInstance;
  controller: ReturnType<typeof documentController>;
  archived: boolean;
  projectId: string;
  taskFromSelection: ReturnType<typeof useTaskFromSelection>;
  embedCommands: RefObject<EmbedCommands | null>;
  files: ReturnType<typeof useDocumentFiles>;
  page: Pick<ReturnType<typeof useItemEditor>, 'openImport' | 'openTrash'>;
}) {
  const toast = useToast();
  const drawer = useTaskDrawer();
  /**
   * "Criar tarefa" in the ⋯: from the selected excerpt, or else a new task in the document's project; none in
   * an archived project, with or without an excerpt (review M4).
   */
  function createTask() {
    if (archived) return toast(ARCHIVED_NOTE, 'error');
    if (selectedText(editor)) return void taskFromSelection.create();
    drawer.newTask(projectId);
  }
  // ⌘S saves now and, after a failure, tries again; ⌘⌥T creates a task from the excerpt selected in the
  // editor; ⌘K lists the item's actions under "Neste item".
  usePageCommands({
    saveNow: () => void controller.flush(),
    createTask: () => {
      if (archived) toast(ARCHIVED_NOTE, 'error');
      else if (editor.isFocused() && selectedText(editor)) void taskFromSelection.create();
      else toast(NO_EXCERPT);
    },
    files: [
      // ⌘K's "Neste item" (docs/etapas/11-documento-desenho.md, W4): the excerpt's task and the embeds, which
      // a document of an archived project does not offer.
      ...(archived
        ? []
        : [
            {
              id: 'create-task',
              label: 'Criar tarefa da seleção',
              icon: <Plus size={16} />,
              run: () => {
                if (selectedText(editor)) void taskFromSelection.create();
                else toast(NO_EXCERPT);
              },
            },
            {
              id: 'embed-task',
              label: 'Incorporar tarefa…',
              icon: <ListTodo size={16} />,
              run: () => embedCommands.current?.openPicker('task'),
            },
            {
              id: 'embed-drawing',
              label: 'Incorporar desenho…',
              icon: <Shapes size={16} />,
              run: () => embedCommands.current?.openPicker('drawing'),
            },
          ]),
      {
        id: 'export',
        label: 'Exportar Markdown',
        icon: <ArrowDownToLine size={16} />,
        run: () => void files.exportMarkdown(),
      },
      {
        id: 'import',
        label: 'Importar Markdown',
        icon: <ArrowUpFromLine size={16} />,
        run: page.openImport,
      },
    ],
    trash: page.openTrash,
  });
  return { createTask };
}
