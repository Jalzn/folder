import { displayName, nameKey } from '@tinyfold/workspace/domain';
import { Plus } from 'lucide-react';
import { type CSSProperties, type RefObject, useState } from 'react';
import { Menu as AriaMenu, SearchField as AriaSearchField, Autocomplete, Input } from 'react-aria-components';
import { matchesAllWords } from '../../lib/highlight';
import type { LabelSummary } from '../../lib/queries';
import { MenuItem, MenuSection, PopoverSurface } from '../../ui';
import { labelColorVar } from '../labels/label-colors';

const CREATE = 'create';

/**
 * The labels' picker (docs/etapas/10-quadro-tarefa.md, "Etiquetas"): "Buscar ou criar etiqueta", the labels
 * that match every typed word as checkboxes, and, when none has the typed name by its key, "Criar mcp · nova",
 * which creates it with the next color and puts it on the task. The field keeps its keys.
 */
export function LabelPicker({
  labels,
  selected,
  triggerRef,
  onClose,
  onChange,
  onCreate,
}: {
  labels: readonly LabelSummary[];
  selected: readonly string[];
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onChange: (labelIds: string[]) => void;
  onCreate: (name: string) => void;
}) {
  const [text, setText] = useState('');
  // Checks show at once: two quick picks must not undo each other before the task reads again.
  const [chosen, setChosen] = useState<readonly string[]>(selected);
  const name = displayName(text);
  const exists = labels.some((label) => nameKey(label.name) === nameKey(name));
  return (
    <PopoverSurface
      triggerRef={triggerRef}
      isOpen
      onOpenChange={(open) => !open && onClose()}
      placement="bottom start"
      className="label-picker"
      aria-label="Etiquetas"
    >
      <Autocomplete
        inputValue={text}
        onInputChange={setText}
        filter={(textValue, input, node) => node.key === CREATE || matchesAllWords(textValue, input)}
      >
        <AriaSearchField aria-label="Buscar ou criar etiqueta" className="label-picker__filter" autoFocus>
          <Input className="label-picker__input" placeholder="Buscar ou criar etiqueta" />
        </AriaSearchField>
        <AriaMenu
          className="menu label-picker__list"
          aria-label="Etiquetas"
          renderEmptyState={() => <p className="label-picker__empty">Nenhuma etiqueta ainda.</p>}
          onAction={(key) => {
            if (key !== CREATE || !name) return;
            setText('');
            onCreate(name);
          }}
        >
          <MenuSection
            selectionMode="multiple"
            selectedKeys={chosen}
            onSelectionChange={(keys) => {
              const next = keys === 'all' ? labels.map((each) => each.id) : [...keys].map(String);
              setChosen(next);
              onChange(next);
            }}
          >
            {labels.map((label) => (
              <MenuItem
                key={label.id}
                id={label.id}
                textValue={label.name}
                icon={
                  <i
                    className="label-picker__color"
                    style={{ '--label-color': labelColorVar(label.color) } as CSSProperties}
                    aria-hidden="true"
                  />
                }
              >
                {label.name}
              </MenuItem>
            ))}
          </MenuSection>
          {name && !exists ? (
            <MenuSection>
              <MenuItem id={CREATE} textValue={name} icon={<Plus size={16} />} detail="nova">
                {`Criar ${name}`}
              </MenuItem>
            </MenuSection>
          ) : null}
        </AriaMenu>
      </Autocomplete>
    </PopoverSurface>
  );
}
