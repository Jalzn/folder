import { placeLabel } from '../../../lib/place-label';
import type { TrashItem } from '../../../lib/queries';
import { itemTypeLabels } from '../../../lib/types';
import { Button } from '../../../ui';
import type { TrashGroup } from './trash-groups';
import { trashTitle } from './use-trash-actions';

function TrashRow({
  item,
  projectName,
  busy,
  onRestore,
  onPurge,
}: {
  item: TrashItem;
  projectName: string;
  busy: boolean;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const title = trashTitle(item);
  return (
    <li className="trash-row">
      <span className="trash-row__name">
        <span className="trash-row__title">{title}</span>
        <span className="trash-row__type">{itemTypeLabels[item.type]}</span>
      </span>
      {/* Origem: the project, and the folder of a document or drawing, deleted since or not. */}
      <span className="trash-row__origin" title="Origem">
        {placeLabel(projectName, item.folder)}
      </span>
      <Button size="sm" isDisabled={busy} onPress={onRestore} aria-label={`Restaurar ${title}`}>
        Restaurar
      </Button>
      <Button size="sm" variant="ghost" isDisabled={busy} onPress={onPurge} aria-label={`Excluir de vez ${title}`}>
        Excluir de vez…
      </Button>
    </li>
  );
}

/** The trash by deletion day, each group a labelled list of rows with Origem, Restaurar and Excluir de vez. */
export function TrashGroups({
  groups,
  projectName,
  busy,
  onRestore,
  onPurge,
}: {
  groups: TrashGroup<TrashItem>[];
  projectName: string;
  busy: boolean;
  onRestore: (item: TrashItem) => void;
  onPurge: (item: TrashItem) => void;
}) {
  if (!groups.length)
    return (
      <section className="project-section">
        <p className="project-empty">Nada na lixeira.</p>
      </section>
    );
  return groups.map((group, index) => {
    const id = `trash-group-${index}`;
    return (
      <section key={group.label} className="project-section" aria-labelledby={id}>
        <h2 className="project-section__label" id={id}>
          {group.label}
        </h2>
        <ul className="trash-list">
          {group.items.map((item) => (
            <TrashRow
              key={`${item.type}:${item.id}`}
              item={item}
              projectName={projectName}
              busy={busy}
              onRestore={() => onRestore(item)}
              onPurge={() => onPurge(item)}
            />
          ))}
        </ul>
      </section>
    );
  });
}
