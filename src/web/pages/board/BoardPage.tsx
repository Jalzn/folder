import './board.css';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { CircleCheck, Columns3, Ellipsis, LayoutDashboard, Plus, Settings2, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { civilDateIn } from '../../lib/civil-date';
import { useColumns, useLabels, useProject, useProjectBoard } from '../../lib/queries';
import { shortDate } from '../../lib/task-dates';
import type { Task } from '../../lib/types';
import { paths } from '../../router/paths';
import { PageFrame, useTaskDrawer } from '../../shell';
import { useApp, useOwnerToday } from '../../shell/AppProvider';
import { useAnnounce } from '../../shell/announcer';
import { isTextTarget } from '../../shell/keyboard/guards';
import { usePageCommands } from '../../shell/page-commands';
import { useBoardFilters, useShellActions } from '../../shell/shell-ui';
import {
  Button,
  ErrorNotice,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Spinner,
  useToast,
} from '../../ui';
import { BoardColumns, type BoardCommands } from './BoardColumns';
import { BoardHeader } from './BoardHeader';
import { arrangeBoard, lateCount } from './board-columns';
import { filteredEmptyText, filterText, olderDoneText } from './board-text';
import { LabelFilterMenu } from './LabelFilterMenu';
import { boardFocusOf } from './use-board-keyboard';

const NO_LABELS: readonly string[] = [];

/**
 * `/projetos/$projectId/quadro`: the project's board (`projectBoard`), with "+ Nova tarefa" and the board's ⋯ in
 * the page bar, the label filter (F) and the count. The done column shows the last 14 days in the owner's time
 * zone, and its footer opens Concluídas. `?tarefa=` opens that task in the drawer and leaves the address. N with
 * the focus on a card or a column's name creates the task in that column.
 */
export function BoardPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/quadro' });
  const { tarefa } = useSearch({ from: '/projetos/$projectId/quadro' });
  const navigate = useNavigate({ from: '/projetos/$projectId/quadro' });
  const drawer = useTaskDrawer();
  const toast = useToast();
  const announce = useAnnounce();
  const ui = useShellActions();
  const chosen = useBoardFilters().labelFilters[projectId] ?? NO_LABELS;
  const { timeZone } = useApp();
  const today = useOwnerToday();
  const project = useProject(projectId);
  const board = useProjectBoard(projectId);
  const columns = useColumns();
  const labelList = useLabels().data;
  const labels = useMemo(() => new Map((labelList ?? []).map((label) => [label.id, label])), [labelList]);
  const [filterOpen, setFilterOpen] = useState(false);
  const list = board.data?.tasks;
  const visible = (task: Task) => chosen.every((id) => task.labelIds.includes(id));
  const shown = useMemo(() => list?.filter((task) => chosen.every((id) => task.labelIds.includes(id))), [list, chosen]);
  const view = useMemo(
    () => (shown && columns.data ? arrangeBoard(columns.data.columns, shown) : null),
    [shown, columns.data],
  );
  const chosenNames = (labelList ?? []).filter((label) => chosen.includes(label.id)).map((label) => label.name);
  const commands = useRef<BoardCommands>({});
  const latestView = useRef(view);
  latestView.current = view;
  usePageCommands({
    newTaskColumn: () => {
      const focus = boardFocusOf(document.activeElement);
      const column = latestView.current?.find((each) =>
        focus?.kind === 'card' ? each.tasks.some((task) => task.id === focus.id) : each.column.id === focus?.id,
      )?.column;
      return focus && column && !column.isDone ? column.id : undefined;
    },
  });

  function filter(labelIds: readonly string[]) {
    ui.setLabelFilter(projectId, labelIds);
    const total = (list ?? []).filter((task) => labelIds.every((id) => task.labelIds.includes(id))).length;
    const names = (labelList ?? []).filter((label) => labelIds.includes(label.id)).map((label) => label.name);
    announce(filterText(names, total));
  }

  const { openTask } = drawer;
  const opened = useRef<string | null>(null);
  // Once the address drops ?tarefa=, the same task can be asked for again, as from ⌘K.
  useEffect(() => {
    if (!tarefa) opened.current = null;
  }, [tarefa]);
  useEffect(() => {
    // Once per address: the drawer's own state changes must not open it again.
    if (!tarefa || !list || opened.current === tarefa) return;
    opened.current = tarefa;
    void navigate({ search: {}, replace: true });
    const task = list.find((item) => item.id === tarefa);
    if (task) return openTask(task);
    // A task completed before the board's 14 days still opens.
    void api.workspace
      .getTask({ id: tarefa })
      .then((found) => {
        if (found.deletedAt || found.projectId !== projectId) throw new Error('gone');
        openTask(found);
      })
      .catch(() => toast('Esta tarefa não está mais neste quadro.', 'error'));
  }, [tarefa, list, openTask, toast, navigate, projectId]);

  if (!project) return null;
  const archived = Boolean(project.archivedAt);
  const failed = board.error ?? columns.error;
  const older = board.data?.olderDone ?? 0;
  const doneFooter =
    board.data && older > 0 ? (
      <Link to={paths.completed(projectId)} className="board-column__older">
        {olderDoneText(older, shortDate(civilDateIn(timeZone, new Date(board.data.doneSince))))}
      </Link>
    ) : undefined;
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    // F opens the filter from anywhere on the board outside fields and menus.
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey;
    if (!plain || event.key.toLowerCase() !== 'f' || isTextTarget(event.target) || event.defaultPrevented) return;
    if (!(event.target instanceof Node && event.currentTarget.contains(event.target))) return;
    event.preventDefault();
    setFilterOpen(true);
  }
  return (
    <PageFrame
      fill
      actions={
        <>
          {!archived && (
            <Button icon={<Plus size={16} />} onPress={() => drawer.newTask(projectId)}>
              Nova tarefa
            </Button>
          )}
          <MenuTrigger>
            <IconButton label="Mais ações do quadro">
              <Ellipsis size={16} />
            </IconButton>
            <Menu
              aria-label="Mais ações do quadro"
              disabledKeys={[...(archived ? ['column'] : []), ...(chosen.length ? [] : ['clear'])]}
              onAction={(key) => {
                if (key === 'completed') void navigate({ href: paths.completed(projectId) });
                else if (key === 'column') commands.current.addColumn?.();
                else if (key === 'labels') ui.setLabelsOpen(true);
                else if (key === 'clear') filter([]);
                else void navigate({ href: paths.overview(projectId) });
              }}
            >
              <MenuItem id="completed" icon={<CircleCheck size={16} />}>
                Ver concluídas
              </MenuItem>
              <MenuItem id="column" icon={<Columns3 size={16} />}>
                Nova coluna
              </MenuItem>
              <MenuItem id="labels" icon={<Settings2 size={16} />}>
                Gerenciar etiquetas…
              </MenuItem>
              <MenuItem id="clear" icon={<X size={16} />}>
                Limpar filtro de etiquetas
              </MenuItem>
              <MenuSeparator />
              <MenuItem id="overview" icon={<LayoutDashboard size={16} />} shortcut={['G', 'V']}>
                Visão geral
              </MenuItem>
            </Menu>
          </MenuTrigger>
        </>
      }
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: F reaches the filter from the board's own elements. */}
      <div className="board-page" onKeyDown={keyDown}>
        <BoardHeader
          total={shown?.length ?? null}
          late={view ? lateCount(view, today) : 0}
          filter={
            <LabelFilterMenu
              labels={labelList ?? []}
              chosen={chosen}
              open={filterOpen}
              onOpenChange={setFilterOpen}
              onChange={filter}
              onManage={() => ui.setLabelsOpen(true)}
            />
          }
        />
        {failed ? (
          <ErrorNotice
            error={failed}
            retry={() => {
              void board.refetch();
              void columns.refetch();
            }}
          />
        ) : view ? (
          <BoardColumns
            projectId={projectId}
            view={view}
            visible={visible}
            emptyText={(columnId) =>
              chosenNames.length && list?.some((task) => task.columnId === columnId)
                ? filteredEmptyText(chosenNames)
                : 'Nada aqui.'
            }
            doneFooter={doneFooter}
            labels={labels}
            today={today}
            archived={archived}
            commands={commands}
          />
        ) : (
          <Spinner />
        )}
      </div>
    </PageFrame>
  );
}
