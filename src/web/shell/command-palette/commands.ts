import { searchText } from '@tinyfold/workspace/domain';
import { queryWords } from '../../lib/highlight';
import type { ThemeChoice } from '../theme';

export type CommandId =
  | 'new-document'
  | 'new-drawing'
  | 'new-folder'
  | 'new-task'
  | 'switch-project'
  | 'overview'
  | 'board'
  | 'index'
  | 'trash'
  | 'collapse-folders'
  | 'theme-system'
  | 'theme-light'
  | 'theme-dark'
  | 'toggle-sidebar'
  | 'profile'
  | 'new-project'
  | 'shortcuts'
  | 'save'
  | 'back';

export interface Command {
  id: CommandId;
  label: string;
  keywords: string;
  shortcut?: readonly string[];
  /** A note at the end of the row, such as "atual" for the current theme. */
  detail?: string;
}

export interface CommandContext {
  /** The current project, archived or not, or null on `/projetos` and in a project that does not exist. */
  project: { name: string; archived: boolean } | null;
  /** Whether any project is active: without one, only the commands that need no project remain. */
  hasActiveProject: boolean;
  theme: ThemeChoice;
  sidebarCollapsed: boolean;
  /** The page can save now: a document or a drawing. */
  canSave: boolean;
  /** The current project has folders, which "Recolher todas as pastas" closes in its sidebar. */
  hasFolders: boolean;
}

const themeCommands: { id: CommandId; choice: ThemeChoice; label: string }[] = [
  { id: 'theme-system', choice: 'system', label: 'Tema: Sistema' },
  { id: 'theme-light', choice: 'light', label: 'Tema: Claro' },
  { id: 'theme-dark', choice: 'dark', label: 'Tema: Escuro' },
];

/** What remains without an active project (docs/etapas/08-fundacao.md, "Sem projeto ativo"). */
const withoutProject = new Set<CommandId>([
  'new-project',
  'theme-system',
  'theme-light',
  'theme-dark',
  'toggle-sidebar',
  'profile',
  'shortcuts',
  'back',
]);

/** The palette's commands in this context, in display order. */
export function availableCommands(context: CommandContext): Command[] {
  const { project } = context;
  const creation: Command[] =
    project && !project.archived
      ? [
          { id: 'new-document', label: 'Novo documento', keywords: `criar escrever texto ${project.name}` },
          { id: 'new-drawing', label: 'Novo desenho', keywords: `criar desenhar diagrama ${project.name}` },
          { id: 'new-folder', label: 'Nova pasta', keywords: `criar pasta organizar ${project.name}` },
          { id: 'new-task', label: 'Nova tarefa', keywords: `criar passo quadro ${project.name}` },
        ]
      : [];
  const pages: Command[] = project
    ? [
        { id: 'overview', label: 'Visão geral', keywords: `inicio resumo ${project.name}`, shortcut: ['G', 'V'] },
        { id: 'board', label: 'Quadro', keywords: `kanban tarefas ${project.name}`, shortcut: ['G', 'Q'] },
        { id: 'index', label: 'Índice', keywords: `lista documentos desenhos ${project.name}` },
        { id: 'trash', label: 'Lixeira', keywords: `excluidos restaurar ${project.name}`, shortcut: ['G', 'L'] },
        ...(context.hasFolders
          ? [{ id: 'collapse-folders' as const, label: 'Recolher todas as pastas', keywords: 'pastas fechar itens' }]
          : []),
      ]
    : [];
  const themes: Command[] = themeCommands.map(({ id, choice, label }) => ({
    id,
    label,
    keywords: 'tema aparencia cor modo',
    ...(context.theme === choice ? { detail: 'atual' } : {}),
  }));
  const save: Command[] = context.canSave
    ? [{ id: 'save', label: 'Salvar agora', keywords: 'gravar', shortcut: ['mod', 'S'] }]
    : [];
  const commands: Command[] = [
    ...creation,
    { id: 'switch-project', label: 'Trocar de projeto…', keywords: 'seletor abrir projeto', shortcut: ['G', 'P'] },
    ...pages,
    ...themes,
    {
      id: 'toggle-sidebar',
      label: context.sidebarCollapsed ? 'Expandir a lateral' : 'Recolher a lateral',
      keywords: 'barra lateral faixa sidebar',
      shortcut: ['mod', '\\'],
    },
    { id: 'profile', label: 'Perfil e token', keywords: 'voce conta senha token mcp claude sessoes' },
    { id: 'new-project', label: 'Novo projeto', keywords: 'criar projeto' },
    { id: 'shortcuts', label: 'Atalhos', keywords: 'teclado teclas ajuda', shortcut: ['?'] },
    ...save,
    { id: 'back', label: 'Voltar', keywords: 'anterior historico', shortcut: ['mod', '['] },
  ];
  return context.hasActiveProject ? commands : commands.filter((command) => withoutProject.has(command.id));
}

/** The commands whose label or keywords hold every word of the query, ignoring case and accents. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const words = queryWords(query);
  if (!words.length) return commands;
  return commands.filter((command) => {
    const text = searchText(`${command.label} ${command.keywords}`);
    return words.every((word) => text.includes(word));
  });
}
