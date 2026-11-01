import './menu.css';
import { Check, ChevronRight, Ellipsis } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  type MenuItemProps as AriaMenuItemProps,
  type MenuProps as AriaMenuProps,
  MenuSection as AriaMenuSection,
  Header,
  type MenuSectionProps,
  MenuTrigger,
  type PopoverProps,
  Separator,
  Text,
} from 'react-aria-components';
import { IconButton } from './IconButton';
import { Shortcut } from './Kbd';
import { PopoverSurface } from './Popover';

export { MenuTrigger, SubmenuTrigger } from 'react-aria-components';

export interface MenuProps<T> extends Omit<AriaMenuProps<T>, 'className'> {
  placement?: PopoverProps['placement'];
}

/** A menu in a popover. Put it after its trigger inside a `MenuTrigger` or a `SubmenuTrigger`. */
export function Menu<T extends object>({ placement = 'bottom end', ...props }: MenuProps<T>) {
  return (
    <PopoverSurface
      placement={placement}
      className="menu-popover"
      {...(props['aria-label'] ? { 'aria-label': props['aria-label'] } : {})}
    >
      <MenuList {...props} />
    </PopoverSurface>
  );
}

/** The menu without its popover, for a popover placed by hand, such as one anchored to a row. */
export function MenuList<T extends object>(props: Omit<AriaMenuProps<T>, 'className'>) {
  return <AriaMenu {...props} className="menu" />;
}

export interface MenuItemProps extends Omit<AriaMenuItemProps, 'className' | 'children'> {
  /** A 16 px Lucide icon. */
  icon?: ReactNode;
  /** Keys of the item's shortcut, such as `['G', 'P']`. */
  shortcut?: readonly string[];
  /** A second line under the label, such as the current choice of a submenu. */
  description?: string;
  /** A value at the end of the row. */
  detail?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}

export function MenuItem({ icon, shortcut, description, detail, danger = false, children, ...props }: MenuItemProps) {
  const text = props.textValue ?? (typeof children === 'string' ? children : undefined);
  return (
    <AriaMenuItem
      {...props}
      {...(text === undefined ? {} : { textValue: text })}
      className="menu-item"
      data-danger={danger || undefined}
    >
      {({ hasSubmenu, isSelected, selectionMode }) => (
        <>
          {selectionMode !== 'none' && (
            <span className="menu-item__check" aria-hidden="true">
              {isSelected && <Check size={14} />}
            </span>
          )}
          {icon}
          {description ? (
            <span className="menu-item__label">
              {children}
              <Text slot="description" className="menu-item__description">
                {description}
              </Text>
            </span>
          ) : (
            <span className="menu-item__label">{children}</span>
          )}
          {detail && <span className="menu-item__detail">{detail}</span>}
          {shortcut && <Shortcut keys={shortcut} />}
          {hasSubmenu && <ChevronRight className="menu-item__chevron" size={14} aria-hidden="true" />}
        </>
      )}
    </AriaMenuItem>
  );
}

/** A titled group of a menu; it may hold its own selection, as an order chosen among options. */
export function MenuSection<T extends object>({
  title,
  children,
  ...props
}: { title?: string; children: ReactNode } & Pick<
  MenuSectionProps<T>,
  'selectionMode' | 'selectedKeys' | 'onSelectionChange' | 'disallowEmptySelection'
>) {
  return (
    <AriaMenuSection<T> {...props} className="menu-section">
      {title && <Header className="menu-section__header">{title}</Header>}
      {children}
    </AriaMenuSection>
  );
}

export function MenuSeparator() {
  return <Separator className="menu-separator" />;
}

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** The ⋯ menu of a page or row: an icon button that opens a plain list of actions. */
export function ActionMenu({
  label,
  icon = <Ellipsis size={16} />,
  items,
}: {
  label: string;
  icon?: ReactNode;
  items: ActionMenuItem[];
}) {
  return (
    <MenuTrigger>
      <IconButton label={label}>{icon}</IconButton>
      <Menu aria-label={label} disabledKeys={items.filter((item) => item.disabled).map((item) => item.label)}>
        {items.map((item) => (
          <MenuItem
            key={item.label}
            id={item.label}
            icon={item.icon}
            danger={item.danger ?? false}
            onAction={item.action}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  );
}
