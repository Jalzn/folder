import { Link } from '@tanstack/react-router';
import { TaskRow } from '../../../components/item-list';
import type { ColumnSummary, LabelSummary, ProjectOverview } from '../../../lib/queries';
import { paths } from '../../../navigation/paths';
import { useTaskDrawer } from '../../../shell';
import { leftOutLine } from './overview-text';

/**
 * Agora (docs/etapas/10-quadro-tarefa.md, "Visão geral"): up to six tasks, the late ones first, then the ones
 * under way and the ones due soon, each opening the drawer. The footer sums up what stayed out and links to
 * the board.
 */
export function NowSection({
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
  const rest = overview.rest.map((column) => ({
    name: columns.find((each) => each.id === column.columnId)?.name ?? '',
    count: column.count,
    only: column.only,
  }));
  return (
    <section className="project-section" aria-labelledby="overview-now">
      <h2 className="project-section__label" id="overview-now">
        Agora
      </h2>
      {overview.now.length ? (
        <ul className="item-list">
          {overview.now.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              columns={columns}
              labels={labels}
              today={overview.today}
              onOpen={() => drawer.openTask(task)}
            />
          ))}
        </ul>
      ) : (
        <p className="project-empty">Nada pede atenção agora.</p>
      )}
      <div className="overview-foot">
        <span>{leftOutLine(rest)}</span>
        <Link to={paths.board(projectId)} className="overview-link">
          Abrir quadro <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
