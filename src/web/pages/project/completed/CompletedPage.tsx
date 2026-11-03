import '../project-page.css';
import './completed.css';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { errorMessage } from '../../../lib/api';
import { type CompletedTask, useCompletedTasks, useProject } from '../../../lib/queries';
import type { Project } from '../../../lib/types';
import { paths } from '../../../navigation/paths';
import { PageFrame, useApp, useOpenTaskId, useTaskDrawer } from '../../../shell';
import {
  Button,
  ErrorNotice,
  focusPageTitle,
  PageHeader,
  returnFocus,
  Spinner,
  useElementRefs,
  useToast,
  whenPresent,
} from '../../../ui';
import { CompletedGroups } from './CompletedGroups';
import { completedItems, completedSummary, groupCompleted } from './completed-groups';
import { useReopen } from './use-reopen';

/**
 * `/projetos/$projectId/concluidas`: every completed task of the project, grouped by the month it was completed
 * in the owner's time zone, 50 at a time with "Mostrar mais". The board shows only the last 14 days.
 */
export function CompletedPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/concluidas' });
  const project = useProject(projectId);
  if (!project) return null;
  return <CompletedContent key={project.id} project={project} />;
}

/** The page once its project is known, which Reabrir needs. */
function CompletedContent({ project }: { project: Project }) {
  const completed = useCompletedTasks(project.id);
  const { timeZone } = useApp();
  const drawer = useTaskDrawer();
  const toast = useToast();
  const titles = useElementRefs<HTMLElement>();
  const list = useRef<HTMLDivElement>(null);
  const reopen = useReopen(project.id, titles, list);

  const pages = completed.data?.pages;
  const items = useMemo(() => completedItems(pages ?? []), [pages]);
  const groups = useMemo(() => groupCompleted(items, timeZone), [items, timeZone]);
  const total = pages?.at(-1)?.total;
  const openId = useOpenTaskId();

  /** The row that takes the place of one that leaves: the next one, or the one before the last. */
  function reopenTask(task: CompletedTask) {
    const at = items.findIndex((each) => each.id === task.id);
    reopen(task.id, (items[at + 1] ?? items[at - 1])?.id ?? null);
  }

  // When the last page arrives the button leaves, and the focus goes to the first task it brought.
  async function showMore() {
    const shown = items.length;
    const result = await completed.fetchNextPage();
    if (result.isFetchNextPageError) {
      toast(errorMessage(result.error), 'error');
      return;
    }
    const first = completedItems(result.data?.pages ?? [])[shown];
    if (first) whenPresent(() => titles.get(first.id), returnFocus, { missing: focusPageTitle });
    else returnFocus(null);
  }

  // A failed "Mostrar mais" keeps the tasks already shown; any other failure replaces them, as on the trash.
  const failed = completed.error && !completed.isFetchNextPageError;
  return (
    <PageFrame
      lead={
        <Link to={paths.board(project.id)} className="completed-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Quadro
        </Link>
      }
    >
      <div className="project-page">
        <PageHeader title="Concluídas" description={total === undefined ? undefined : completedSummary(total)} />
        <hr className="project-hair" />
        {completed.isPending ? (
          <Spinner />
        ) : failed ? (
          <ErrorNotice error={completed.error} retry={() => void completed.refetch()} />
        ) : (
          <div ref={list}>
            <CompletedGroups
              groups={groups}
              titles={titles}
              openId={openId}
              onOpen={drawer.openTask}
              onReopen={project.archivedAt ? undefined : reopenTask}
            />
            {completed.hasNextPage && (
              <div className="completed-more">
                <Button isPending={completed.isFetchingNextPage} onPress={() => void showMore()}>
                  Mostrar mais
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageFrame>
  );
}
