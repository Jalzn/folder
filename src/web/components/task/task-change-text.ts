/** The toasts of completing and reopening a task, and of an undo that finds it changed. */

/** "Concluída: Gerar token pessoal no Perfil." */
export const completedText = (title: string) => `Concluída: ${title}.`;

/** "Reaberta em A fazer." */
export const reopenedText = (column: string) => `Reaberta em ${column}.`;

export const TASK_CHANGED = 'A tarefa mudou depois; nada foi desfeito.';
