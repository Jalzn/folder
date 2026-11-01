import { Plus } from 'lucide-react';
import { Button } from '../../ui';

/** "+ Coluna", the ghost column 20 px after the last one: it creates "Nova coluna" and names it in place. */
export function AddColumn({ busy, onAdd }: { busy: boolean; onAdd: () => void }) {
  return (
    <div className="board-add-column">
      <Button variant="ghost" icon={<Plus size={14} />} aria-label="Nova coluna" isDisabled={busy} onPress={onAdd}>
        Coluna
      </Button>
    </div>
  );
}
