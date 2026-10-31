import './field.css';
import type { ReactNode } from 'react';
import {
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  FieldError,
  Input,
  type InputProps,
  Label,
  Text,
} from 'react-aria-components';
import { cx } from '../lib/cx';

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'children'> {
  label: ReactNode;
  description?: ReactNode;
  /** Shown under the field, which then reads as invalid. */
  errorMessage?: string | null;
  placeholder?: string;
  /** 32 px in forms, 28 px in dense places. */
  size?: 'md' | 'sm';
  /** Attributes of the input that React Aria does not take, such as password-manager opt-outs. */
  inputProps?: Omit<InputProps, 'className' | 'placeholder'> & Record<`data-${string}`, string | boolean>;
  className?: string;
}

export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  size = 'md',
  inputProps,
  className,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      isInvalid={props.isInvalid || Boolean(errorMessage)}
      className={cx('text-field', className)}
    >
      <Label className="text-field__label">{label}</Label>
      <Input
        {...inputProps}
        className="input"
        data-size={size}
        {...(placeholder === undefined ? {} : { placeholder })}
      />
      {description && (
        <Text slot="description" className="text-field__description">
          {description}
        </Text>
      )}
      <FieldError className="text-field__error">{errorMessage}</FieldError>
    </AriaTextField>
  );
}
