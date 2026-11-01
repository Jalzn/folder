import { ChevronDown, Settings2, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { labelColorVar } from '../../components/labels/label-colors';
import type { LabelSummary } from '../../lib/queries';
import { Button, Menu, MenuItem, MenuSection, MenuSeparator, MenuTrigger } from '../../ui';

/**
 * The board's label filter (docs/etapas/10-quadro-tarefa.md, "Filtro"): "Etiquetas ⌄", or "Etiquetas: mcp,
 * backend" with some chosen, opened by F too. The labels are checkboxes, and a task shows when it has all the
 * chosen ones. The menu ends with "Limpar filtro" and "Gerenciar etiquetas…".
 */
export function LabelFilterMenu({
  labels,
  chosen,
  open,
  onOpenChange,
  onChange,
  onManage,
}: {
  labels: readonly LabelSummary[];
  chosen: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (labelIds: string[]) => void;
  onManage: () => void;
}) {
  const names = labels.filter((label) => chosen.includes(label.id)).map((label) => label.name);
  return (
    <MenuTrigger isOpen={open} onOpenChange={onOpenChange}>
      <Button variant="ghost" className="board-filter" aria-keyshortcuts="F">
        {names.length ? `Etiquetas: ${names.join(', ')}` : 'Etiquetas'}
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <Menu
        aria-label="Filtrar por etiqueta"
        placement="bottom start"
        autoFocus="first"
        disabledKeys={chosen.length ? [] : ['clear']}
        onAction={(key) => {
          if (key === 'clear') onChange([]);
          else if (key === 'manage') onManage();
        }}
      >
        <MenuSection
          title="Etiquetas"
          selectionMode="multiple"
          selectedKeys={chosen}
          onSelectionChange={(keys) =>
            onChange(keys === 'all' ? labels.map((label) => label.id) : [...keys].map(String))
          }
        >
          {labels.map((label) => (
            <MenuItem
              key={label.id}
              id={label.id}
              textValue={label.name}
              icon={
                <i
                  className="board-filter__color"
                  style={{ '--label-color': labelColorVar(label.color) } as CSSProperties}
                  aria-hidden="true"
                />
              }
            >
              {label.name}
            </MenuItem>
          ))}
        </MenuSection>
        <MenuSeparator />
        <MenuSection>
          <MenuItem id="clear" icon={<X size={16} />}>
            Limpar filtro
          </MenuItem>
          <MenuItem id="manage" icon={<Settings2 size={16} />}>
            Gerenciar etiquetas…
          </MenuItem>
        </MenuSection>
      </Menu>
    </MenuTrigger>
  );
}
