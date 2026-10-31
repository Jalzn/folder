import './select.css';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Select as AriaSelect, Button, Label, ListBox, ListBoxItem, SelectValue } from 'react-aria-components';
import { cx } from '../lib/cx';
import { PopoverSurface } from './Popover';

export interface SelectOption<Key extends string> {
  id: Key;
  label: string;
  /** A 16 px mark before the label, such as a project's. */
  icon?: ReactNode;
}

/**
 * A field that picks one of a few options: its label, a 32 px trigger that shows the choice, and the
 * options in a list under it, the current one checked.
 */
export function Select<Key extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly SelectOption<Key>[];
  value: Key;
  onChange: (value: Key) => void;
  className?: string;
}) {
  return (
    <AriaSelect
      value={value}
      onChange={(key) => {
        if (key !== null) onChange(key as Key);
      }}
      className={cx('text-field', className)}
    >
      <Label className="text-field__label">{label}</Label>
      <Button className="input select__trigger">
        <SelectValue className="select__value" />
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <PopoverSurface placement="bottom start" className="menu-popover select__popover">
        <ListBox className="menu" items={options}>
          {(option) => (
            <ListBoxItem id={option.id} textValue={option.label} className="menu-item">
              {({ isSelected }) => (
                <>
                  {option.icon}
                  <span className="menu-item__label">{option.label}</span>
                  <span className="menu-item__check" aria-hidden="true">
                    {isSelected && <Check size={14} />}
                  </span>
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </PopoverSurface>
    </AriaSelect>
  );
}
