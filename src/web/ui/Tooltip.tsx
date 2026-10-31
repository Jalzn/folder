import './tooltip.css';
import type { ReactNode } from 'react';
import { Tooltip as AriaTooltip, type TooltipProps as AriaTooltipProps } from 'react-aria-components';

export { TooltipTrigger } from 'react-aria-components';

/** A short label, with its shortcut when there is one, for a control that only shows an icon. */
export function Tooltip({
  children,
  ...props
}: Omit<AriaTooltipProps, 'className' | 'children'> & { children: ReactNode }) {
  return (
    <AriaTooltip offset={6} {...props} className="tooltip">
      {children}
    </AriaTooltip>
  );
}
