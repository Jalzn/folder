import './command-palette.css';
import { useNavigate } from '@tanstack/react-router';
import { searchText, TASK_STATUSES, taskStatusLabels } from '@tinyfold/workspace/domain';
import {
  ArrowLeft,
  ArrowRightLeft,
  Circle,
  FileText,
  FolderPlus,
  Keyboard,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Moon,
  PanelLeft,
  Pin,
  PinOff,
  Plus,
  Save,
  Search,
  Shapes,
  SquareKanban,
  Sun,
  Table2,
  Trash2,
} from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { Menu as AriaMenu, Autocomplete, Dialog, Input, Modal, ModalOverlay, TextField } from 'react-aria-components';
import { queryWords } from '../../lib/highlight';
import { type SearchResult, useSearch } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { ColumnRing, Kbd, MenuSection, ProjectMark, useToast } from '../../ui';
import { useApp } from '../AppProvider';
import { activeProjects } from '../project/project-order';
import { usePins } from '../project/use-pins';
import { useProjectActions } from '../project/use-project-actions';
import { type SwitcherPlace, useShellUi } from '../shell-ui';
import { type ThemeChoice, themeChoiceLabels, useTheme } from '../theme';
import { availableCommands, type CommandId, filterCommands } from './commands';
import { PaletteRow } from './PaletteRow';
import { usePaletteContext } from './use-palette-context';

const commandIcons: Record<CommandId, ReactElement> = {
  'new-document': <FileText size={16} />,
  'new-drawing': <Shapes size={16} />,
  'new-task': <Circle size={16} />,
  'switch-project': <ArrowRightLeft size={16} />,
  overview: <LayoutDashboard size={16} />,
  board: <SquareKanban size={16} />,
  index: <Table2 size={16} />,
  trash: <Trash2 size={16} />,
  'theme-system': <Monitor size={16} />,
  'theme-light': <Sun size={16} />,
  'theme-dark': <Moon size={16} />,
  'toggle-sidebar': <PanelLeft size={16} />,
  profile: <KeyRound size={16} />,
  'new-project': <FolderPlus size={16} />,
  shortcuts: <Keyboard size={16} />,
  save: <Save size={16} />,
  back: <ArrowLeft size={16} />,
};
const itemIcon = (result: SearchResult) => {
  if ('status' in result)
    return <ColumnRing index={TASK_STATUSES.indexOf(result.status)} count={TASK_STATUSES.length} size={16} />;
  return result.type === 'document' ? <FileText size={16} /> : <Shapes size={16} />;
};
const themes: Partial<Record<CommandId, ThemeChoice>> = {
  'theme-system': 'system',
  'theme-light': 'light',
  'theme-dark': 'dark',
};

interface PaletteProps {
  switcherPlace: SwitcherPlace;
  toggleSidebar: () => void;
}

/**
 * ⌘K: search and commands (docs/etapas/08-fundacao.md, "Buscar e ⌘K"). Neste item acts on the open page;
 * Itens searches every project, the eight edited last without text; Projetos and Comandos filter here.
 */
export function CommandPalette(props: PaletteProps) {
  const ui = useShellUi();
  const open = ui.palette !== null;
  return (
    <ModalOverlay
      className="palette-overlay"
      isOpen={open}
      onOpenChange={(value) => !value && ui.closePalette()}
      isDismissable
    >
      <Modal className="palette">
        <Dialog className="palette__dialog" aria-label="Buscar e comandar">
          {open && <PaletteBody {...props} initial={ui.palette ?? ''} />}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function PaletteBody({ initial, switcherPlace, toggleSidebar }: PaletteProps & { initial: string }) {
  const ui = useShellUi();
  const app = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const theme = useTheme();
  const pins = usePins();
  const projectActions = useProjectActions();
  const { context, project, projects, item, pinned } = usePaletteContext();
  const [query, setQuery] = useState(initial);
  const typed = query.trim();
  const results = useSearch({ query, limit: typed ? 12 : 8 });
  const handlers = new Map<string, () => void>();
  const go = (href: string) => void navigate({ href });
  const later = (run: () => void) => () => {
    ui.closePalette();
    requestAnimationFrame(run);
  };
  const words = queryWords(query);
  const matches = (text: string) => words.every((word) => searchText(text).includes(word));

  // "Neste item": the item's files, then Fixar and Mover (not in an archived project), then the trash.
  const page = ui.page.current;
  const active = item && project && !project.archivedAt;
  const here = item
    ? [
        ...(page.files ?? []).map((action) => ({ ...action, id: `here:${action.id}`, shortcut: undefined })),
        ...(active
          ? [
              {
                id: 'here:pin',
                label: pinned ? 'Desafixar' : 'Fixar',
                icon: pinned ? <PinOff size={16} /> : <Pin size={16} />,
                shortcut: ['P'],
                run: () => void (pinned ? pins.unpin(item.type, item.id) : pins.pin(item.type, item.id)),
              },
              {
                id: 'here:move',
                label: 'Mover para projeto…',
                icon: <ArrowRightLeft size={16} />,
                shortcut: ['M'],
                run: () => ui.setMoveOpen(true),
              },
            ]
          : []),
        ...(page.trash
          ? [
              {
                id: 'here:trash',
                label: 'Mover para a lixeira',
                icon: <Trash2 size={16} />,
                shortcut: undefined,
                run: page.trash,
              },
            ]
          : []),
      ].filter((action) => matches(action.label))
    : [];
  for (const action of here) handlers.set(action.id, later(action.run));

  const items = results.data?.items ?? [];
  for (const result of items)
    handlers.set(
      `item:${result.type}:${result.id}`,
      later(() =>
        go(
          result.type === 'task'
            ? paths.task(result.projectId, result.id)
            : paths.item(result.projectId, result.type, result.id),
        ),
      ),
    );

  const noActive = !activeProjects(projects).length;
  const projectRows = (typed ? projects.filter((entry) => matches(entry.name)) : noActive ? projects : []).map(
    (entry) => ({
      entry,
      label: noActive && entry.archivedAt ? `Desarquivar ${entry.name}` : entry.name,
    }),
  );
  for (const { entry } of projectRows)
    handlers.set(
      `project:${entry.id}`,
      later(() =>
        noActive && entry.archivedAt
          ? void projectActions.unarchive(entry, { open: true })
          : go(paths.overview(entry.id)),
      ),
    );

  const commands = filterCommands(availableCommands(context), query);
  const runCommand = (id: CommandId) => {
    const choice = themes[id];
    if (choice) {
      theme.setChoice(choice);
      toast(`Tema: ${themeChoiceLabels[choice]}.`);
      return;
    }
    const current = project;
    const actions: Partial<Record<CommandId, () => void>> = {
      'new-document': () => current && void app.newDocument(current.id),
      'new-drawing': () => current && void app.newCanvas(current.id),
      'new-task': () => current && app.newTask(current.id),
      'switch-project': () => ui.setSwitcherAt(switcherPlace),
      overview: () => current && go(paths.overview(current.id)),
      board: () => current && go(paths.board(current.id)),
      index: () => current && go(paths.index(current.id)),
      trash: () => current && go(paths.trash(current.id)),
      'toggle-sidebar': toggleSidebar,
      profile: () => go(paths.profile),
      'new-project': () => app.openProjectDialog(),
      shortcuts: () => ui.setShortcutsOpen(true),
      save: () => ui.page.current.saveNow?.(),
      back: () => window.history.back(),
    };
    actions[id]?.();
  };
  for (const command of commands)
    handlers.set(
      `command:${command.id}`,
      later(() => runCommand(command.id)),
    );

  return (
    <Autocomplete inputValue={query} onInputChange={setQuery}>
      <TextField aria-label="Buscar ou comandar" className="palette__field" autoFocus>
        <Search size={16} aria-hidden="true" />
        <Input className="palette__input" placeholder="Buscar itens, projetos e comandos…" />
      </TextField>
      <AriaMenu
        className="palette__list"
        aria-label="Resultados"
        onAction={(key) => handlers.get(String(key))?.()}
        renderEmptyState={() => <p className="palette__empty">Nada encontrado.</p>}
      >
        {here.length > 0 && (
          <MenuSection title="Neste item">
            {here.map((action) => (
              <PaletteRow
                key={action.id}
                id={action.id}
                icon={action.icon}
                label={action.label}
                query={query}
                shortcut={action.shortcut}
              />
            ))}
          </MenuSection>
        )}
        {items.length > 0 && (
          <MenuSection title={typed ? 'Itens' : 'Editados recentemente'}>
            {items.map((result) => (
              <PaletteRow
                key={`${result.type}:${result.id}`}
                id={`item:${result.type}:${result.id}`}
                icon={itemIcon(result)}
                label={result.title || 'Sem título'}
                query={query}
                archived={result.projectArchived}
                // Recent items show no excerpt, as in the prototype; a search shows where the words are.
                excerpt={typed && 'excerpt' in result ? result.excerpt : undefined}
                right={
                  <>
                    {result.type === 'task' && 'status' in result && <span>{taskStatusLabels[result.status]} ·</span>}
                    <PaletteProject
                      project={projects.find((entry) => entry.id === result.projectId)}
                      name={result.projectName}
                    />
                  </>
                }
              />
            ))}
          </MenuSection>
        )}
        {projectRows.length > 0 && (
          <MenuSection title="Projetos">
            {projectRows.map(({ entry, label }) => (
              <PaletteRow
                key={entry.id}
                id={`project:${entry.id}`}
                icon={<ProjectMark name={entry.name} color={entry.color} />}
                label={label}
                query={query}
                archived={Boolean(entry.archivedAt)}
              />
            ))}
          </MenuSection>
        )}
        {commands.length > 0 && (
          <MenuSection title="Comandos">
            {commands.map((command) => (
              <PaletteRow
                key={command.id}
                id={`command:${command.id}`}
                icon={command.id === 'new-project' ? <Plus size={16} /> : commandIcons[command.id]}
                label={command.label}
                query={query}
                right={command.detail}
                shortcut={command.shortcut}
              />
            ))}
          </MenuSection>
        )}
      </AriaMenu>
      <footer className="palette__footer" aria-hidden="true">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span>
          <Kbd>↵</Kbd> abrir
        </span>
        <span>
          <Kbd>esc</Kbd> fechar
        </span>
      </footer>
    </Autocomplete>
  );
}

/** The project of a result, by its mark and name. */
function PaletteProject({ project, name }: { project: Project | undefined; name: string }) {
  return (
    <span className="palette-row__project">
      {project && <ProjectMark name={project.name} color={project.color} size={16} />}
      {name}
    </span>
  );
}
