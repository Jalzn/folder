import { Link } from '@tanstack/react-router';
import { TaskRow } from '../../../components/item-list/TaskRow';
import type { ProjectOverview } from '../../../lib/queries';
import { paths } from '../../../router/paths';
import { useApp } from '../../../shell';
import { leftOutLine } from './overview-text';

/**
 * Agora: the tasks in progress, in board order, up to six, each opening its dialog over the page. The
 * footer sums up what stayed out and links to the board. Late and due-soon tasks join in stage 10.
 */
export function NowSection({ projectId, overview }: { projectId: string; overview: ProjectOverview }) {
  const app = useApp();
  return (
    <section className="project-section" aria-labelledby="overview-now">
      <h2 className="project-section__label" id="overview-now">
        Agora
      </h2>
      {overview.now.length ? (
        <ul className="item-list">
          {overview.now.map((task) => (
            <TaskRow key={task.id} task={task} onOpen={() => app.openTask(task)} />
          ))}
        </ul>
      ) : (
        <p className="project-empty">Nada pede atenção agora.</p>
      )}
      <div className="overview-foot">
        <span>{leftOutLine(overview.rest)}</span>
        <Link to={paths.board(projectId)} className="overview-link">
          Abrir quadro <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
