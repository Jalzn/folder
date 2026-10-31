import './popover.css';
import type { ReactNode } from 'react';
import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
  Dialog,
  type DialogProps,
} from 'react-aria-components';
import { cx } from '../lib/cx';

export { DialogTrigger as PopoverTrigger } from 'react-aria-components';

export interface PopoverProps extends Omit<AriaPopoverProps, 'className' | 'children'> {
  /** Names the popover's dialog for assistive technology. */
  'aria-label'?: string;
  className?: string;
  children: DialogProps['children'];
}

/** A floating panel anchored to its trigger: the project switcher, the rail lists. Esc closes only it. */
export function Popover({ 'aria-label': label, className, children, ...props }: PopoverProps) {
  return (
    <AriaPopover offset={6} {...props} className={cx('popover', className)}>
      <Dialog className="popover__dialog" {...(label === undefined ? {} : { 'aria-label': label })}>
        {children}
      </Dialog>
    </AriaPopover>
  );
}

/** The popover surface without a dialog, for content that brings its own role, such as a menu. */
export function PopoverSurface({
  className,
  children,
  ...props
}: Omit<AriaPopoverProps, 'className'> & { className?: string; children: ReactNode }) {
  return (
    <AriaPopover offset={6} {...props} className={cx('popover', className)}>
      {children}
    </AriaPopover>
  );
}
