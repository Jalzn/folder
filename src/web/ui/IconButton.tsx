import './button.css';
import type { ReactNode, Ref } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cx } from '../lib/cx';
import { shortcutLabel } from './Kbd';
import { Tooltip, TooltipTrigger } from './Tooltip';

export interface IconButtonProps extends Omit<AriaButtonProps, 'className' | 'children' | 'aria-label'> {
  /** The accessible name, also shown in the tooltip. */
  label: string;
  /** Keys of the shortcut shown in the tooltip, such as `['mod', '\\']`. */
  shortcut?: readonly string[];
  /** 28 px, or 24 px in dense places. */
  size?: 'md' | 'sm';
  className?: string;
  /** The icon. */
  children: ReactNode;
  ref?: Ref<HTMLButtonElement> | undefined;
}

/** A square button with only an icon, named by its label and explained by a tooltip. */
export function IconButton({ label, shortcut, size = 'md', className, children, ...props }: IconButtonProps) {
  return (
    <TooltipTrigger delay={600} closeDelay={0}>
      <AriaButton
        {...props}
        aria-label={label}
        className={cx('btn', 'btn-icon', className)}
        data-variant="icon"
        data-size={size}
      >
        {children}
      </AriaButton>
      <Tooltip>
        {label}
        {shortcut && <span className="tooltip__keys">{shortcutLabel(shortcut)}</span>}
      </Tooltip>
    </TooltipTrigger>
  );
}
