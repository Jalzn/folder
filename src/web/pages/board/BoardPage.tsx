import './board.css';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Columns3, Ellipsis, LayoutDashboard, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useToday } from '../../lib/civil-date';
import { useColumns, useLabels, useProject, useTasks } from '../../lib/queries';
import { paths } from '../../router/paths';
import { PageFrame, useTaskDrawer } from '../../shell';
import { usePageCommands } from '../../shell/page-commands';
import { Button, ErrorNotice, IconButton, Menu, MenuItem, MenuTrigger, Spinner, useToast } from '../../ui';
import { BoardColumns, type BoardCommands } from './BoardColumns';
import { BoardHeader } from './BoardHeader';
import { arrangeBoard, lateCount } from './board-columns';
import { boardFocusOf } from './use-board-keyboard';

/**
 * `/projetos/$projectId/quadro`: the project's board, with "+ Nova tarefa" and the board's ⋯ in the page bar.
 * `?tarefa=` opens that task in the drawer once the board has it, and leaves the address. N with the focus on
 * a card or a column's name creates the task in that column. Today is this device's until the server sends
 * the owner's time zone with the board (stage 10, B5).
 */
export function BoardPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/quadro' });
  const { tarefa } = useSearch({ from: '/projetos/$projectId/quadro' });
  const navigate = useNavigate({ from: '/projetos/$projectId/quadro' });
  const drawer = useTaskDrawer();
  const toast = useToast();
  const today = useToday();
  const project = useProject(projectId);
  const tasks = useTasks({ projectId });
  const columns = useColumns();
  const labelList = useLabels().data;
  const labels = useMemo(() => new Map((labelList ?? []).map((label) => [label.id, label])), [labelList]);
  const list = tasks.data?.tasks;
  const view = useMemo(
    () => (list && columns.data ? arrangeBoard(columns.data.columns, list) : null),
    [list, columns.data],
  );
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
    const task = list.find((item) => item.id === tarefa);
    if (task) openTask(task);
    else toast('Esta tarefa não está mais neste quadro.', 'error');
    void navigate({ search: {}, replace: true });
  }, [tarefa, list, openTask, toast, navigate]);
  if (!project) return null;
  const archived = Boolean(project.archivedAt);
  const failed = tasks.error ?? columns.error;
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
              disabledKeys={archived ? ['column'] : []}
              onAction={(key) => {
                if (key === 'column') commands.current.addColumn?.();
                else void navigate({ href: paths.overview(projectId) });
              }}
            >
              <MenuItem id="column" icon={<Columns3 size={16} />}>
                Nova coluna
              </MenuItem>
              <MenuItem id="overview" icon={<LayoutDashboard size={16} />} shortcut={['G', 'V']}>
                Visão geral
              </MenuItem>
            </Menu>
          </MenuTrigger>
        </>
      }
    >
      <div className="board-page">
        <BoardHeader total={list?.length ?? null} late={view ? lateCount(view, today) : 0} />
        {failed ? (
          <ErrorNotice
            error={failed}
            retry={() => {
              void tasks.refetch();
              void columns.refetch();
            }}
          />
        ) : view ? (
          <BoardColumns
            projectId={projectId}
            view={view}
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
