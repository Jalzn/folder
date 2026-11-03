import { useRef } from 'react';
import { type LabelFieldExit, LabelNameField } from './LabelNameField';
import { LabelSquare } from './LabelSquare';
export function NewLabelRow({
  taken,
  create,
  onDone,
}: {
  taken: string[];
  create: (name: string) => Promise<string | undefined>;
  onDone: (id: string | null, exit: LabelFieldExit) => void;
}) {
  const created = useRef<string | null>(null);
  return (
    <li className="label-row" data-editing="">
      <LabelSquare color={null} />
      <LabelNameField
        initial=""
        label="Nome da nova etiqueta"
        taken={taken}
        onSubmit={async (name) => {
          created.current = (await create(name)) ?? null;
          return created.current !== null;
        }}
        onDone={(exit) => onDone(created.current, exit)}
      />
    </li>
  );
}
