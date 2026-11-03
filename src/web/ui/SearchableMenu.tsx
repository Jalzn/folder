import './menu-filter.css';
import type { ReactNode, RefAttributes } from 'react';
import {
  Autocomplete,
  type AutocompleteProps,
  Input,
  type InputProps,
  Menu,
  type MenuProps,
  SearchField,
  type SearchFieldProps,
} from 'react-aria-components';
import { cx } from '../lib/cx';

type Props = {
  autocomplete?: Omit<AutocompleteProps, 'children'>;
  search: Omit<SearchFieldProps, 'children' | 'className'> & { className?: string };
  input: Omit<InputProps, 'className'> & { className?: string };
  menu: Omit<MenuProps<object>, 'children'> & RefAttributes<HTMLDivElement>;
  children: ReactNode;
};

/** Shared filter and menu structure; hosts own matching, selection and keyboard policy. */
export function SearchableMenu({ autocomplete, search, input, menu, children }: Props) {
  return (
    <Autocomplete {...autocomplete}>
      <SearchField {...search} className={cx('menu-filter', search.className)}>
        <Input {...input} className={cx('menu-filter__input', input.className)} />
      </SearchField>
      <Menu {...menu}>{children}</Menu>
    </Autocomplete>
  );
}
