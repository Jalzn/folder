import { useState } from 'react';
import { Label, Radio, RadioGroup } from 'react-aria-components';
import { countOf } from '../../lib/count';
import type { ColumnSummary } from '../../lib/queries';
import { AlertDialog } from '../../ui';

/** The column a deletion moves the tasks to by default: the one on the left, or on the right of the first. */
export function defaultDestination(columns: readonly ColumnSummary[], id: string) {
  const at = columns.findIndex((column) => column.id === id);
  const left = columns[at - 1];
  return left ? { column: left, side: 'à esquerda' } : { column: columns[at + 1], side: 'à direita' };
}

/**
 * "Excluir a coluna “Revisão”?" (docs/etapas/10-quadro-tarefa.md, "Excluir coluna"): the column's tasks, of
 * every project, go to another column, chosen among the rest, the neighbour on the left by default. The focus
 * starts on the chosen radio.
 */
export function DeleteColumnDialog({
  column,
  columns,
  pending,
  onConfirm,
  onClose,
}: {
  column: ColumnSummary;
  /** All the columns, in board order. */
  columns: readonly ColumnSummary[];
  pending: boolean;
  onConfirm: (destination: ColumnSummary) => void;
  onClose: () => void;
}) {
  const fallback = defaultDestination(columns, column.id);
  const [chosen, setChosen] = useState(fallback.column?.id ?? '');
  const others = columns.filter((each) => each.id !== column.id);
  const count = column.taskCount;
  return (
    <AlertDialog
      open
      title={`Excluir a coluna “${column.name}”?`}
      confirmLabel="Mover e excluir"
      isPending={pending}
      initialFocus="body"
      onClose={onClose}
      onConfirm={() => {
        const destination = others.find((each) => each.id === chosen);
        if (destination) onConfirm(destination);
      }}
    >
      <p>
        Há {countOf(count, 'tarefa', 'tarefas')} nela, somando todos os projetos, porque as colunas valem para todos.
        Para onde {count === 1 ? 'ela vai' : 'elas vão'}?
      </p>
      <RadioGroup className="column-destinations" value={chosen} onChange={setChosen}>
        <Label className="sr-only">Destino das tarefas</Label>
        {others.map((each) => (
          <Radio key={each.id} value={each.id} className="column-destination" autoFocus={each.id === chosen}>
            <span className="column-destination__dot" aria-hidden="true" />
            {each.name}
            {each.id === fallback.column?.id && (
              <span className="column-destination__note">padrão: {fallback.side}</span>
            )}
          </Radio>
        ))}
      </RadioGroup>
    </AlertDialog>
  );
}
