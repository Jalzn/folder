import { useId, useRef } from 'react';
import { TaskMeta } from '../../components/task/TaskMeta';
import { useColumns } from '../../lib/queries';
import { ColumnRing, ProjectMark } from '../../ui';
import { taskEmbedView } from './embed-view';
import { useEmbedsContext } from './embeds-context';
import { UnavailableEmbed } from './UnavailableEmbed';

/** Labels an embedded card shows before "+n" (docs/etapas/11-documento-desenho.md, "Tarefa incorporada"). */
const SHOWN_LABELS = 3;

/**
 * A task embedded in a document: a card that shows the task as it is now and opens it in the drawer
 * (visual.md, "Documento: itens incorporados"). The first line has the column's ring and the title, with
 * "aberta abaixo" or the other project on the right; the second, the board card's meta and the column, or
 * "Concluída". A task in the trash or gone shows the unavailable box.
 */
export function TaskEmbed({ taskId, blockId }: { taskId: string; blockId: string }) {
  const embeds = useEmbedsContext();
  const columns = useColumns().data?.columns ?? [];
  const metaId = useId();
  const pointer = useRef('');
  if (!embeds)
    return (
      <UnavailableEmbed
        view={{
          kind: 'unavailable',
          text: 'Tarefa incorporada',
          subject: 'a tarefa incorporada',
          restore: null,
          remove: false,
        }}
        kind="task"
        blockId={blockId}
      />
    );
  const view = taskEmbedView(embeds.tasks.get(taskId), embeds);
  if (view.kind === 'loading')
    return (
      <div className="embed-loading" contentEditable={false}>
        <span className="sr-only">Carregando a tarefa incorporada…</span>
      </div>
    );
  if (view.kind === 'unavailable') return <UnavailableEmbed view={view} kind="task" blockId={blockId} />;
  const { task } = view;
  const index = columns.findIndex((column) => column.id === task.column.id);
  return (
    <button
      type="button"
      className="embed-card"
      contentEditable={false}
      data-open={view.open || undefined}
      data-done={view.done || undefined}
      aria-label={view.label}
      aria-describedby={metaId}
      onPointerDown={(event) => {
        pointer.current = event.pointerType;
      }}
      onClick={() => {
        embeds.actions.openTask(task, pointer.current === 'touch');
        pointer.current = '';
      }}
    >
      <span className="embed-card__line">
        <ColumnRing index={Math.max(0, index)} count={Math.max(columns.length, 1)} isDone={view.done} />
        <span className="embed-card__title">{task.title}</span>
        {view.open ? (
          <span className="embed-card__aside">aberta abaixo</span>
        ) : (
          view.otherProject && (
            <span className="embed-card__aside">
              <ProjectMark name={view.otherProject.name} color={view.otherProject.color} size={16} />
              {view.otherProject.name}
              {view.otherProject.archived && ' (arquivado)'}
            </span>
          )
        )}
      </span>
      <span className="embed-card__line embed-card__line--meta">
        <TaskMeta
          id={metaId}
          dueOn={task.dueOn}
          checklist={task.checklist}
          labels={task.labels}
          late={view.late}
          shown={SHOWN_LABELS}
        />
        <span className="embed-card__status">{view.status}</span>
      </span>
    </button>
  );
}
