import { Link } from '@tanstack/react-router';
import { TaskRow } from '../../../components/item-list/TaskRow';
import { civilDateIn } from '../../../lib/civil-date';
import type { ColumnSummary, LabelSummary, ProjectOverview } from '../../../lib/queries';
import { shortDate } from '../../../lib/task-dates';
import { paths } from '../../../router/paths';
import { useTaskDrawer } from '../../../shell';
import { useApp } from '../../../shell/AppProvider';

/**
 * "Concluídas · 14 dias": up to eight tasks, the latest completed first, each with its completion date in the
 * owner's time zone, and "Ver todas →", which opens Concluídas.
 */
export function DoneSection({
  projectId,
  overview,
  columns,
  labels,
}: {
  projectId: string;
  overview: ProjectOverview;
  columns: readonly ColumnSummary[];
  labels: ReadonlyMap<string, LabelSummary>;
}) {
  const drawer = useTaskDrawer();
  const { timeZone } = useApp();
  return (
    <section className="project-section" aria-labelledby="overview-done">
      <h2 className="project-section__label" id="overview-done">
        Concluídas · 14 dias
      </h2>
      {overview.done.length ? (
        <ul className="item-list">
          {overview.done.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              columns={columns}
              labels={labels}
              today={overview.today}
              date={task.completedAt ? shortDate(civilDateIn(timeZone, new Date(task.completedAt))) : ''}
              onOpen={() => drawer.openTask(task)}
            />
          ))}
        </ul>
      ) : (
        <p className="project-empty">Nada concluído nos últimos 14 dias.</p>
      )}
      {overview.doneTotal > 0 && (
        <div className="overview-foot">
          <span />
          <Link to={paths.completed(projectId)} className="overview-link">
            Ver todas <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </section>
  );
}
