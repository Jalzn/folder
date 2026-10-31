import { ChevronDown } from 'lucide-react';
import type { PopoverProps } from 'react-aria-components';
import { Button } from './Button';
import { Menu, MenuItem, MenuTrigger } from './Menu';

export interface FilterOption<Key extends string> {
  id: Key;
  label: string;
}

/**
 * A list filter that names its choice, "Tipo: Todos ⌄", as a ghost button. The choices open in a menu of
 * radio items, so the current one is announced as checked.
 */
export function FilterMenu<Key extends string>({
  label,
  options,
  value,
  onChange,
  placement = 'bottom start',
}: {
  label: string;
  options: readonly FilterOption<Key>[];
  value: Key;
  onChange: (value: Key) => void;
  placement?: PopoverProps['placement'];
}) {
  const current = options.find((option) => option.id === value) ?? options[0];
  return (
    <MenuTrigger>
      <Button variant="ghost" className="filter-menu">
        {label}: {current?.label}
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <Menu
        aria-label={label}
        placement={placement}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const [key] = keys === 'all' ? [] : [...keys];
          if (key !== undefined && key !== value) onChange(key as Key);
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.id} id={option.id}>
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  );
}
