import { useLatest } from '../../lib/react/use-latest';
import { BoardMenu } from './BoardMenu';
import { useBoardAddress } from './use-board-address';
import { useBoardFilter } from './use-board-filter';
import './board.css';
import { Link, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { civilDateIn } from '../../lib/dates/civil-date';
import { shortCivilDate } from '../../lib/dates/task-dates';
import { useColumns, useLabelMap, useLabels, useProject, useProjectBoard } from '../../lib/queries';
import { paths } from '../../navigation/paths';
import { PageFrame, useApp, useOwnerToday, usePageCommands, useTaskDrawer } from '../../shell';
import { useShellActions } from '../../shell/state';
import { Button, ErrorNotice, Spinner } from '../../ui';
import { BoardColumns, type BoardCommands } from './BoardColumns';
import { BoardHeader } from './BoardHeader';
import { arrangeBoard, lateCount } from './board-columns';
import { filteredEmptyText, olderDoneText } from './board-text';
import { LabelFilterMenu } from './LabelFilterMenu';
import { boardFocusOf } from './use-board-keyboard';

/**
 * `/projetos/$projectId/quadro`: the project's board (`projectBoard`), with "+ Nova tarefa" and the board's ⋯ in
 * the page bar, the label filter (F) and the count. The done column shows the last 14 days in the owner's time
 * zone, and its footer opens Concluídas. `?tarefa=` opens that task in the drawer and leaves the address. N with
 * the focus on a card or a column's name creates the task in that column.
 */
export function BoardPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/quadro' });
  const drawer = useTaskDrawer();
  const ui = useShellActions();
  const { timeZone } = useApp();
  const today = useOwnerToday();
  const project = useProject(projectId);
  const board = useProjectBoard(projectId);
  const columns = useColumns();
  const labelList = useLabels().data;
  const labels = useLabelMap(labelList);
  const list = board.data?.tasks;
  const { chosen, filterOpen, setFilterOpen, visible, shown, chosenNames, filter, keyDown } = useBoardFilter(
    projectId,
    list,
    labelList,
  );
  const view = useMemo(
    () => (shown && columns.data ? arrangeBoard(columns.data.columns, shown) : null),
    [shown, columns.data],
  );
  const commands = useRef<BoardCommands>({});
  const latestView = useLatest(view);
  usePageCommands({
    newTaskColumn: () => {
      const focus = boardFocusOf(document.activeElement);
      const column = latestView.current?.find((each) =>
        focus?.kind === 'card' ? each.tasks.some((task) => task.id === focus.id) : each.column.id === focus?.id,
      )?.column;
      return focus && column && !column.isDone ? column.id : undefined;
    },
  });

  useBoardAddress(projectId, list);

  if (!project) return null;
  const archived = Boolean(project.archivedAt);
  const failed = board.error ?? columns.error;
  const older = board.data?.olderDone ?? 0;
  const doneFooter =
    board.data && older > 0 ? (
      <Link to={paths.completed(projectId)} className="board-column__older">
        {olderDoneText(older, shortCivilDate(civilDateIn(timeZone, new Date(board.data.doneSince))))}
      </Link>
    ) : undefined;

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
          <BoardMenu projectId={projectId} archived={archived} chosen={chosen} commands={commands} filter={filter} />
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
