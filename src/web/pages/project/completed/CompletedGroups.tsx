import { Button as AriaButton } from 'react-aria-components';
import { shortCivilDate } from '../../../lib/dates/task-dates';
import type { CompletedTask } from '../../../lib/queries';
import { formatCount } from '../../../lib/text/count';
import { displayTitle } from '../../../lib/types';
import { Button, ColumnRing } from '../../../ui';
import type { CompletedEntry, CompletedGroup } from './completed-groups';
import type { TitleRefs } from './use-reopen';

type Entry = CompletedEntry<CompletedTask>;

interface RowActions {
  titles: TitleRefs;
  /** The task open in the drawer, whose row is marked. */
  openId: string | null;
  onOpen: (task: CompletedTask) => void;
  /** Absent in an archived project, which has no Reabrir. */
  onReopen: ((task: CompletedTask) => void) | undefined;
}

function CompletedRow({ entry: { item, day }, titles, openId, onOpen, onReopen }: { entry: Entry } & RowActions) {
  const title = displayTitle(item.title);
  return (
    <li className="completed-row" data-open={item.id === openId || undefined}>
      <ColumnRing index={0} count={1} isDone />
      <AriaButton className="completed-row__title" ref={titles.ref(item.id)} onPress={() => onOpen(item)}>
        {title}
      </AriaButton>
      <span className="completed-row__date">{shortCivilDate(day)}</span>
      {onReopen && (
        <Button size="sm" variant="ghost" onPress={() => onReopen(item)} aria-label={`Reabrir ${title}`}>
          Reabrir
        </Button>
      )}
    </li>
  );
}

/**
 * The completed tasks by month, under "Outubro 2026 · 12" with the count of the month's loaded tasks, each a
 * list of 36 px rows: the done ring, the title that opens the drawer, the completion date and Reabrir.
 */
export function CompletedGroups({ groups, ...actions }: { groups: CompletedGroup<CompletedTask>[] } & RowActions) {
  if (!groups.length)
    return (
      <section className="project-section">
        <p className="project-empty">Nada concluído ainda.</p>
      </section>
    );
  return groups.map((group) => {
    const id = `completed-${group.month}`;
    return (
      <section key={group.month} className="project-section" aria-labelledby={id}>
        <h2 className="project-section__label" id={id}>
          {group.label}
          <span className="completed-group__count"> · {formatCount(group.entries.length)}</span>
        </h2>
        <ul className="completed-list">
          {group.entries.map((entry) => (
            <CompletedRow key={entry.item.id} entry={entry} {...actions} />
          ))}
        </ul>
      </section>
    );
  });
}
