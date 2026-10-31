import './button.css';
import type { ReactNode } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cx } from '../lib/cx';
import { SpinnerIcon } from './Spinner';

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** 28 px, or 24 px in dense places. */
  size?: 'md' | 'sm';
  /** A 16 px icon before the label; a spinner takes its place while pending. */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, ...props }: ButtonProps) {
  return (
    <AriaButton {...props} className={cx('btn', className)} data-variant={variant} data-size={size}>
      {({ isPending }) => (
        <>
          {isPending ? <SpinnerIcon /> : icon}
          {children}
        </>
      )}
    </AriaButton>
  );
}
