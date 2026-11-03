import { type Context, useContext } from 'react';

export function useShellContext<T>(context: Context<T | null>) {
  const value = useContext(context);
  if (!value) throw new Error('A interface do shell está indisponível.');
  return value;
}
