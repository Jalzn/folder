import './button.css';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { ButtonProps } from './Button';

/** A link inside the app that looks like a Button, such as "Abrir lixeira" or "Ir para o início". */
export function ButtonLink({
  to,
  variant = 'secondary',
  size = 'md',
  children,
}: {
  to: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  children: ReactNode;
}) {
  return (
    <Link to={to} className="btn" data-variant={variant} data-size={size}>
      {children}
    </Link>
  );
}
