import './field.css';
import { Search, X } from 'lucide-react';
import {
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
  Button,
  Input,
} from 'react-aria-components';
import { cx } from '../lib/cx';

export interface SearchFieldProps extends Omit<AriaSearchFieldProps, 'className' | 'children'> {
  placeholder?: string;
  /** 32 px in forms, 28 px in dense places such as the sidebar. */
  size?: 'md' | 'sm';
  className?: string;
}

/** A search box: Esc clears its text first, as React Aria does. */
export function SearchField({ placeholder, size = 'md', className, ...props }: SearchFieldProps) {
  return (
    <AriaSearchField {...props} className={cx('search-box', className)} data-size={size}>
      <Search className="search-box__icon" size={14} aria-hidden="true" />
      <Input className="input" data-size={size} {...(placeholder === undefined ? {} : { placeholder })} />
      <Button className="search-box__clear" aria-label="Limpar busca">
        <X size={14} />
      </Button>
    </AriaSearchField>
  );
}
