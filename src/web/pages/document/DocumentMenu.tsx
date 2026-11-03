import { ArrowDownToLine, ArrowUpFromLine, Plus } from 'lucide-react';
import { ItemMenu, type ItemMenuAction } from '../../shell';
import { KEYS } from '../../shell/keyboard';

/** Why an archived project's document makes no task, in the ⋯ and in the toast of ⌘⌥T. */
export const ARCHIVED_NOTE = 'Projeto arquivado: desarquive para criar itens.';

/** The ⌘⌥T of "Criar tarefa": ⌘⌥T on Apple platforms, Ctrl+Alt+T elsewhere. */
export const CREATE_TASK_KEYS = KEYS.createTask;

/**
 * The document's ⋯ (docs/etapas/11-documento-desenho.md, "Página do documento"): "Criar tarefa" (⌘⌥T), which
 * says whether it takes the selected excerpt, Exportar and Importar Markdown; then the item menu's Fixar,
 * Mover para pasta…, Mover para projeto… and Mover para a lixeira.
 */
export function DocumentMenu({
  document,
  projectId,
  selected,
  preparing,
  archived,
  onCreateTask,
  onExport,
  onImport,
  onTrash,
}: {
  document: { id: string; folderId: string | null; pinnedAt: string | null };
  projectId: string;
  /** Whether the editor has a selected excerpt, which "Criar tarefa" takes. */
  selected: boolean;
  preparing: boolean;
  /** An archived project's document makes no task, with or without an excerpt. */
  archived: boolean;
  onCreateTask: () => void;
  onExport: () => void;
  onImport: () => void;
  onTrash: () => void;
}) {
  const actions: ItemMenuAction[] = [
    {
      id: 'create-task',
      label: 'Criar tarefa',
      icon: <Plus size={16} />,
      shortcut: CREATE_TASK_KEYS,
      description: archived
        ? ARCHIVED_NOTE.slice(0, -1)
        : selected
          ? 'A partir do trecho selecionado'
          : 'Selecione um trecho para criar a partir dele',
      action: onCreateTask,
      disabled: preparing || archived,
    },
    { id: 'export', label: 'Exportar Markdown', icon: <ArrowDownToLine size={16} />, action: onExport },
    {
      id: 'import',
      label: 'Importar Markdown',
      icon: <ArrowUpFromLine size={16} />,
      description: 'Cria outro documento',
      action: onImport,
    },
  ];
  return (
    <ItemMenu
      type="document"
      id={document.id}
      projectId={projectId}
      folderId={document.folderId}
      pinned={Boolean(document.pinnedAt)}
      onTrash={onTrash}
      actions={actions}
    />
  );
}
