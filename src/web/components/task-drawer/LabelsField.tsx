import { Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { LabelSummary } from '../../lib/queries';
import { IconButton } from '../../ui';
import { LabelChip } from '../labels';
import { LabelPicker } from './LabelPicker';

/**
 * The task's labels as chips, each with its "×" on hover or focus, then "+", which opens the picker. Removing
 * a label gives the focus back to "+". An archived project's task shows the chips only.
 */
export function LabelsField({
  labelIds,
  labels,
  editable,
  onChange,
  onCreate,
}: {
  labelIds: readonly string[];
  labels: readonly LabelSummary[];
  editable: boolean;
  onChange: (labelIds: string[]) => void;
  onCreate: (name: string) => void;
}) {
  const add = useRef<HTMLButtonElement>(null);
  const [picking, setPicking] = useState(false);
  const chips = labelIds.flatMap((id) => labels.find((label) => label.id === id) ?? []);
  return (
    <span className="task-labels">
      {chips.map((label) => (
        <LabelChip key={label.id} name={label.name} color={label.color}>
          {editable && (
            <button
              type="button"
              className="label-chip__remove"
              aria-label={`Remover etiqueta ${label.name}`}
              onClick={() => {
                onChange(labelIds.filter((id) => id !== label.id));
                add.current?.focus();
              }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </LabelChip>
      ))}
      {!chips.length && !editable && <span className="task-prop task-prop--static">—</span>}
      {editable && (
        <IconButton ref={add} label="Adicionar etiqueta" size="sm" onPress={() => setPicking(true)}>
          <Plus size={14} />
        </IconButton>
      )}
      {picking && (
        <LabelPicker
          labels={labels}
          selected={labelIds}
          triggerRef={add}
          onClose={() => setPicking(false)}
          onChange={onChange}
          onCreate={onCreate}
        />
      )}
    </span>
  );
}
