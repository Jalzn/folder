import { useEffect, useState } from 'react';

/** The value once it has stayed the same for `delay` milliseconds. */
export function useDebouncedValue<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
