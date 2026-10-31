import './radio-group.css';
import type { ReactNode } from 'react';
import {
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  Label,
  Radio,
  type RadioProps,
} from 'react-aria-components';

/** A choice among a few options shown side by side, such as a project's colour or the theme. */
export function RadioGroup({
  label,
  children,
  ...props
}: Omit<AriaRadioGroupProps, 'className' | 'children'> & { label: string; children: ReactNode }) {
  return (
    <AriaRadioGroup {...props} orientation="horizontal" className="radio-group">
      <Label className="radio-group__label">{label}</Label>
      <div className="radio-group__options">{children}</div>
    </AriaRadioGroup>
  );
}

/** One option of a RadioGroup, drawn as a chip; the arrows move between options. */
export function RadioChip({
  children,
  ...props
}: Omit<RadioProps, 'className' | 'children'> & { children: ReactNode }) {
  return (
    <Radio {...props} className="radio-chip">
      {children}
    </Radio>
  );
}
