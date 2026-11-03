import './inline-field.css';
import { type ComponentProps, useId } from 'react';
import { cx } from '../lib/cx';

/** Shared field and error markup; hosts retain their focus, validation and leave policies. */
export function InlineNameField({
  className,
  error,
  input,
}: {
  className: string;
  error: string | null;
  input: Omit<ComponentProps<'input'>, 'className' | 'aria-invalid' | 'aria-describedby'> & {
    [name: `data-${string}`]: string | boolean | number | undefined;
  };
}) {
  const errorId = useId();
  return (
    <span className={cx('inline-name-field', className)}>
      <input
        {...input}
        className={cx('inline-name-field__input', `${className}__input`)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} className={cx('inline-name-field__error', `${className}__error`)} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
